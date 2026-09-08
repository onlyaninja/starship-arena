/**
 * ============================================================================
 * Starship Arena - Weapons & Munitions Engine (Weapons)
 * ============================================================================
 * Description:
 *   Comprehensive weaponry systems: standard plasma bullets, charged mega-blasts,
 *   circular shockwave grenades, heat-seeker missiles, laser inhibitors,
 *   immobilizer stasis beams, electric blaster bolts, electric green lasso,
 *   and the massive cone-expanding Evaporation Beam.
 *
 * Responsibilities:
 *   - Projectile class: Balances kinetic ballistics, mega-charges, homing missiles,
 *     and circular-shockwave grenades with wide blast radii.
 *   - LaserBeam class: Piercing laser inhibitor rounds.
 *   - ImmobilizerBeam class: 2-second stasis lock rounds.
 *   - ElectricBolt class: Chaining multi-target electric arcs.
 *   - ElectricLasso class: 1350px electric rope that snares and reels in opponents.
 *   - EvaporationBeam class: Massive cone-shaped beam that expands up to 100% thicker
 *     over the arena length, reflects off purple barriers, and dissipates in power
 *     as it spreads out.
 * ============================================================================
 */

class Projectile {
    constructor(x, y, angle, ownerId, color, isMega = false, isGrenade = false, isHoming = false) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.ownerId = ownerId;
        this.color = color;
        this.isMega = isMega;
        this.isGrenade = isGrenade;
        this.isHoming = isHoming;
        this.isGhost = false;
        this.target = null;

        if (isMega) {
            this.speed = 1000;
            this.radius = 12;
            this.damage = 3;
            this.bounceTimer = 6.0;
        } else if (isGrenade) {
            this.speed = 700;
            this.radius = 10;
            this.damage = 4; // High direct hit damage
            this.bounceTimer = 1.6; // Fuse time before detonation
            this.blastRadius = 115; // Wide blast radius
        } else if (isHoming) {
            this.speed = 460;
            this.radius = 8;
            this.damage = 2;
            this.bounceTimer = 5.0;
            this.turnRate = 4.5;
        } else {
            this.speed = 900;
            this.radius = 5;
            this.damage = 1;
            this.bounceTimer = 6.0;
        }

        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.bounced = false;
        this.isReflected = false;
        this.reflectedBy = null;
        this.exploded = false;
    }

    update(dt, particleSystem, allShips = []) {
        this.bounceTimer -= dt;

        if (this.isHoming) {
            // Dynamic target acquisition if target is null, dead, or off-field
            if (!this.target || this.target.hp <= 0) {
                this.target = null;
                if (allShips && allShips.length > 0) {
                    let closest = null, minD = Infinity;
                    for (const s of allShips) {
                        if (s.hp <= 0 || s.id === this.ownerId) continue;
                        if (this.team && s.team && this.team !== 'NONE' && this.team === s.team) continue;
                        const d = Math.hypot((s.x + s.width / 2) - this.x, (s.y + s.height / 2) - this.y);
                        if (d < minD) {
                            minD = d;
                            closest = s;
                        }
                    }
                    this.target = closest;
                }
            }

            if (this.target && this.target.hp > 0) {
                const tcx = this.target.x + this.target.width / 2;
                const tcy = this.target.y + this.target.height / 2;
                const targetAngle = Math.atan2(tcy - this.y, tcx - this.x);

                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const maxTurn = this.turnRate * dt;
                if (Math.abs(angleDiff) < maxTurn) {
                    this.angle = targetAngle;
                } else {
                    this.angle += Math.sign(angleDiff) * maxTurn;
                }

                this.speed = Math.min(820, this.speed + 280 * dt);
                this.vx = Math.cos(this.angle) * this.speed;
                this.vy = Math.sin(this.angle) * this.speed;
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.isGrenade) {
            this.vx *= Math.pow(0.96, dt * 60);
            this.vy *= Math.pow(0.96, dt * 60);
            if (this.bounceTimer <= 0) {
                this.exploded = true;
            }
        }

        if (this.isHoming && this.bounceTimer <= 0) {
            this.exploded = true;
        }

        if (Math.random() < 0.4) {
            let pColor = this.color;
            if (this.isGrenade) pColor = '#ff7b00';
            else if (this.isHoming) pColor = '#ff5e62';

            particleSystem.push(new Particle(
                this.x, this.y,
                -this.vx * 0.1 + (Math.random() - 0.5) * 20,
                -this.vy * 0.1 + (Math.random() - 0.5) * 20,
                pColor,
                this.isMega ? 5 : (this.isGrenade ? 4 : 2),
                0.08
            ));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isMega ? 20 : (this.isGrenade ? 14 : 10);
        ctx.fillStyle = this.color;

        if (this.isGrenade) {
            ctx.fillStyle = '#ff7b00';
            ctx.shadowColor = '#ffb703';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Internal blinking core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isHoming) {
            ctx.fillStyle = '#ff5e62';
            ctx.shadowColor = '#ff0055';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            if (this.isMega) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    isOutOfBounds(width, height) {
        return (
            this.bounceTimer <= 0 ||
            this.x < -40 ||
            this.x > width + 40 ||
            this.y < -40 ||
            this.y > height + 40
        );
    }
}

class LaserBeam {
    constructor(x, y, angle, ownerId, team = 'NONE') {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.ownerId = ownerId;
        this.team = team;
        this.speed = 1400;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.bounced = false;
        this.radius = 4;
        this.length = 24;
        this.bounceTimer = 8.0;
    }

    update(dt, particleSystem) {
        this.bounceTimer -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (Math.random() < 0.6) {
            particleSystem.push(new Particle(
                this.x, this.y,
                (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50,
                '#ff007f', Math.random() * 4 + 2, 0.08
            ));
        }
    }

    bounce() {
        this.bounced = true;
        this.angle += Math.PI;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;

        const tailX = this.x - Math.cos(this.angle) * this.length;
        const tailY = this.y - Math.sin(this.angle) * this.length;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        ctx.restore();
    }

    isOutOfBounds(width, height) {
        return (
            this.bounceTimer <= 0 ||
            this.x < -40 ||
            this.x > width + 40 ||
            this.y < -40 ||
            this.y > height + 40
        );
    }
}

class ImmobilizerBeam {
    constructor(x, y, angle, ownerId, team = 'NONE') {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.ownerId = ownerId;
        this.team = team;
        this.speed = 1200;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.bounced = false;
        this.radius = 5;
        this.length = 28;
        this.bounceTimer = 8.0;
    }

    update(dt, particleSystem) {
        this.bounceTimer -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (Math.random() < 0.6) {
            particleSystem.push(new Particle(
                this.x, this.y,
                (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50,
                '#00f2fe', Math.random() * 4 + 2, 0.08
            ));
        }
    }

    bounce() {
        this.bounced = true;
        this.angle += Math.PI;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;

        const tailX = this.x - Math.cos(this.angle) * this.length;
        const tailY = this.y - Math.sin(this.angle) * this.length;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        ctx.restore();
    }

    isOutOfBounds(width, height) {
        return (
            this.bounceTimer <= 0 ||
            this.x < -40 ||
            this.x > width + 40 ||
            this.y < -40 ||
            this.y > height + 40
        );
    }
}

class ElectricBolt {
    constructor(x, y, angle, ownerId, color, team = 'NONE') {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.ownerId = ownerId;
        this.color = color;
        this.team = team;
        this.speed = 1350;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 6;
        this.damage = 1;
        this.bounceTimer = 6.0;
        this.isReflected = false;
        this.reflectedBy = null;
        this.isGrenade = false;
        this.isHoming = false;
        this.isMega = false;
    }

    update(dt, particleSystem) {
        this.bounceTimer -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (Math.random() < 0.6) {
            particleSystem.push(new Particle(
                this.x, this.y,
                (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80,
                this.color, Math.random() * 4 + 2, 0.08
            ));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;

        const tailX = this.x - Math.cos(this.angle) * 18;
        const tailY = this.y - Math.sin(this.angle) * 18;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isOutOfBounds(width, height) {
        return (
            this.bounceTimer <= 0 ||
            this.x < -40 ||
            this.x > width + 40 ||
            this.y < -40 ||
            this.y > height + 40
        );
    }
}

/**
 * Massive Laser (Evaporation Beam) Class
 * Feature: Cone-shaped expanding beam up to 100% thicker over arena length,
 * reflecting off purple barriers, with power dissipation as it spreads out.
 */
class EvaporationBeam {
    constructor(sourcePlayer, boundsWidth, boundsHeight) {
        this.sourcePlayer = sourcePlayer;
        this.ownerId = sourcePlayer.id;
        this.duration = 0.75;
        this.timer = this.duration;
        this.baseWidth = 32;       // Starts at 32px
        this.maxGrowthRatio = 1.0; // Grows up to +100% (64px)
        this.arenaLength = boundsWidth || 1200;
        this.maxDamage = 12;
        this.damageDealt = 0;
        this.damageTickTimer = 0;
        this.capturedPlayer = null;
        this.segments = [];
        this.boundsWidth = boundsWidth;
        this.boundsHeight = boundsHeight;
    }

    computeSegments(obstacles) {
        const cx = this.sourcePlayer.x + this.sourcePlayer.width / 2;
        const cy = this.sourcePlayer.y + this.sourcePlayer.height / 2;
        let startX = cx + Math.cos(this.sourcePlayer.turretAngle) * 26;
        let startY = cy + Math.sin(this.sourcePlayer.turretAngle) * 26;
        let dirX = Math.cos(this.sourcePlayer.turretAngle);
        let dirY = Math.sin(this.sourcePlayer.turretAngle);

        this.segments = [];
        const maxBounces = 2;
        let bounces = 0;
        let cumulativeDist = 0;

        while (bounces <= maxBounces) {
            let closestT = Infinity;
            let hitNormalX = 0;
            let hitNormalY = 0;
            let hitObstacle = null;

            // 1. Arena Boundary intersections
            if (dirX > 0.0001) {
                const t = (this.boundsWidth - startX) / dirX;
                if (t > 0.001 && t < closestT) {
                    closestT = t; hitNormalX = -1; hitNormalY = 0; hitObstacle = 'WALL';
                }
            } else if (dirX < -0.0001) {
                const t = -startX / dirX;
                if (t > 0.001 && t < closestT) {
                    closestT = t; hitNormalX = 1; hitNormalY = 0; hitObstacle = 'WALL';
                }
            }

            if (dirY > 0.0001) {
                const t = (this.boundsHeight - startY) / dirY;
                if (t > 0.001 && t < closestT) {
                    closestT = t; hitNormalX = 0; hitNormalY = -1; hitObstacle = 'WALL';
                }
            } else if (dirY < -0.0001) {
                const t = -startY / dirY;
                if (t > 0.001 && t < closestT) {
                    closestT = t; hitNormalX = 0; hitNormalY = 1; hitObstacle = 'WALL';
                }
            }

            // 2. Obstacle box intersections
            for (const obs of obstacles) {
                if (dirX > 0.0001) {
                    const t = (obs.x - startX) / dirX;
                    if (t > 0.001 && t < closestT) {
                        const y = startY + t * dirY;
                        if (y >= obs.y - 1 && y <= obs.y + obs.h + 1) {
                            closestT = t; hitNormalX = -1; hitNormalY = 0; hitObstacle = obs;
                        }
                    }
                }
                if (dirX < -0.0001) {
                    const t = (obs.x + obs.w - startX) / dirX;
                    if (t > 0.001 && t < closestT) {
                        const y = startY + t * dirY;
                        if (y >= obs.y - 1 && y <= obs.y + obs.h + 1) {
                            closestT = t; hitNormalX = 1; hitNormalY = 0; hitObstacle = obs;
                        }
                    }
                }
                if (dirY > 0.0001) {
                    const t = (obs.y - startY) / dirY;
                    if (t > 0.001 && t < closestT) {
                        const x = startX + t * dirX;
                        if (x >= obs.x - 1 && x <= obs.x + obs.w + 1) {
                            closestT = t; hitNormalX = 0; hitNormalY = -1; hitObstacle = obs;
                        }
                    }
                }
                if (dirY < -0.0001) {
                    const t = (obs.y + obs.h - startY) / dirY;
                    if (t > 0.001 && t < closestT) {
                        const x = startX + t * dirX;
                        if (x >= obs.x - 1 && x <= obs.x + obs.w + 1) {
                            closestT = t; hitNormalX = 0; hitNormalY = 1; hitObstacle = obs;
                        }
                    }
                }
            }

            if (closestT === Infinity || closestT <= 0.001) {
                const segLen = 1500;
                const endX = startX + dirX * segLen;
                const endY = startY + dirY * segLen;
                const startW = this.getWidthAtDist(cumulativeDist);
                const endW = this.getWidthAtDist(cumulativeDist + segLen);
                this.segments.push({ startX, startY, endX, endY, startW, endW, startDist: cumulativeDist, endDist: cumulativeDist + segLen });
                break;
            }

            const endX = startX + dirX * closestT;
            const endY = startY + dirY * closestT;
            const segDist = closestT;
            const startW = this.getWidthAtDist(cumulativeDist);
            const endW = this.getWidthAtDist(cumulativeDist + segDist);

            this.segments.push({
                startX, startY, endX, endY,
                startW, endW,
                startDist: cumulativeDist,
                endDist: cumulativeDist + segDist,
                hitNormalX, hitNormalY, hitObstacle
            });

            cumulativeDist += segDist;

            if (hitObstacle === 'WALL' || bounces >= maxBounces) {
                break;
            }

            const dot = dirX * hitNormalX + dirY * hitNormalY;
            dirX = dirX - 2 * dot * hitNormalX;
            dirY = dirY - 2 * dot * hitNormalY;
            const len = Math.hypot(dirX, dirY);
            if (len > 0.0001) {
                dirX /= len;
                dirY /= len;
            }

            startX = endX + hitNormalX * 0.5;
            startY = endY + hitNormalY * 0.5;
            bounces++;
        }
    }

    /**
     * Cone growth calculation: width expands linearly with cumulative distance
     */
    getWidthAtDist(dist) {
        const growth = Math.min(this.maxGrowthRatio, dist / this.arenaLength);
        return this.baseWidth * (1 + growth);
    }

    /**
     * Power density dissipation calculation: as beam gets wider, power drops
     */
    getPowerRatioAtDist(dist) {
        const currentW = this.getWidthAtDist(dist);
        return Math.max(0.4, this.baseWidth / currentW);
    }

    update(dt, obstacles, targetPlayer, particleSystem, soundFx, mines = null, asteroids = null) {
        this.timer -= dt;
        if (this.timer <= 0) return;

        this.computeSegments(obstacles);

        // Clear proximity mines caught in the beam
        if (mines) {
            for (let m = mines.length - 1; m >= 0; m--) {
                const mine = mines[m];
                if (mine.exploded) continue;
                for (const seg of this.segments) {
                    const vx = seg.endX - seg.startX;
                    const vy = seg.endY - seg.startY;
                    const segLenSq = vx * vx + vy * vy;
                    if (segLenSq === 0) continue;
                    let t = ((mine.x - seg.startX) * vx + (mine.y - seg.startY) * vy) / segLenSq;
                    t = Math.max(0, Math.min(1, t));
                    const projX = seg.startX + t * vx;
                    const projY = seg.startY + t * vy;
                    const segDistAtT = seg.startDist + t * Math.sqrt(segLenSq);
                    const beamWAtT = this.getWidthAtDist(segDistAtT);

                    if (Math.hypot(mine.x - projX, mine.y - projY) <= beamWAtT / 2 + mine.radius) {
                        mine.exploded = true;
                        if (soundFx) soundFx.playExplosion();
                        for (let k = 0; k < 18; k++) {
                            const a = Math.random() * Math.PI * 2;
                            particleSystem.push(new Particle(mine.x, mine.y, Math.cos(a) * 200, Math.sin(a) * 200, '#c77dff', Math.random() * 4 + 2, 0.08));
                        }
                        mines.splice(m, 1);
                        break;
                    }
                }
            }
        }

        // Sizzle & shatter asteroids caught in the evaporation beam
        if (asteroids) {
            for (const ast of asteroids) {
                if (ast.destroyed) continue;
                for (const seg of this.segments) {
                    const vx = seg.endX - seg.startX;
                    const vy = seg.endY - seg.startY;
                    const segLenSq = vx * vx + vy * vy;
                    if (segLenSq === 0) continue;
                    let t = ((ast.x - seg.startX) * vx + (ast.y - seg.startY) * vy) / segLenSq;
                    t = Math.max(0, Math.min(1, t));
                    const projX = seg.startX + t * vx;
                    const projY = seg.startY + t * vy;
                    const segDistAtT = seg.startDist + t * Math.sqrt(segLenSq);
                    const beamWAtT = this.getWidthAtDist(segDistAtT);

                    if (Math.hypot(ast.x - projX, ast.y - projY) <= beamWAtT / 2 + ast.radius) {
                        ast.takeDamage(1.5 * dt, particleSystem, soundFx, asteroids);
                        break;
                    }
                }
            }
        }

        if (!targetPlayer || targetPlayer.hp <= 0) {
            this.capturedPlayer = null;
            return;
        }

        const tcx = targetPlayer.x + targetPlayer.width / 2;
        const tcy = targetPlayer.y + targetPlayer.height / 2;
        const targetRadius = 20;

        let isHit = false;
        let closestPt = null;
        let minHitDist = Infinity;
        let hitDistAlongBeam = 0;

        for (const seg of this.segments) {
            const vx = seg.endX - seg.startX;
            const vy = seg.endY - seg.startY;
            const segLenSq = vx * vx + vy * vy;
            if (segLenSq === 0) continue;

            let t = ((tcx - seg.startX) * vx + (tcy - seg.startY) * vy) / segLenSq;
            t = Math.max(0, Math.min(1, t));

            const projX = seg.startX + t * vx;
            const projY = seg.startY + t * vy;
            const dist = Math.hypot(tcx - projX, tcy - projY);
            const distAlongBeam = seg.startDist + t * Math.sqrt(segLenSq);
            const beamWAtT = this.getWidthAtDist(distAlongBeam);
            const hitThreshold = beamWAtT / 2 + targetRadius;

            if (dist <= hitThreshold && dist < minHitDist) {
                isHit = true;
                minHitDist = dist;
                closestPt = { x: projX, y: projY };
                hitDistAlongBeam = distAlongBeam;
            }
        }

        if (isHit && closestPt) {
            this.capturedPlayer = targetPlayer;

            // Tractor Pull toward beam center axis
            targetPlayer.vx *= 0.14;
            targetPlayer.vy *= 0.14;

            const pullFactor = 0.20;
            targetPlayer.x += (closestPt.x - tcx) * pullFactor;
            targetPlayer.y += (closestPt.y - tcy) * pullFactor;

            // Frazzle Jitter
            targetPlayer.x += (Math.random() - 0.5) * 6;
            targetPlayer.y += (Math.random() - 0.5) * 6;

            targetPlayer.pushOutFromObstacles(obstacles);

            // Arcing Particles
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 250 + 60;
                particleSystem.push(new Particle(
                    tcx + (Math.random() - 0.5) * 24,
                    tcy + (Math.random() - 0.5) * 24,
                    Math.cos(angle) * spd,
                    Math.sin(angle) * spd,
                    Math.random() < 0.6 ? '#c77dff' : '#00f2fe',
                    Math.random() * 4 + 2,
                    0.07
                ));
            }

            // Damage Ticks with distance/reflection power dissipation
            this.damageTickTimer += dt;
            const powerRatio = this.getPowerRatioAtDist(hitDistAlongBeam);
            // Less powerful as it spreads out -> slower damage accumulation or damage scaling
            const tickInterval = 0.058 / powerRatio; 
            while (this.damageTickTimer >= tickInterval && this.damageDealt < this.maxDamage && targetPlayer.hp > 0) {
                this.damageTickTimer -= tickInterval;
                this.damageDealt += 1;
                targetPlayer.takeDamage(1, particleSystem, soundFx);
                if (soundFx) soundFx.playFrazzleHit();
            }
        } else {
            this.capturedPlayer = null;
        }

        // Particle sparks at beam reflection/impact points
        for (const seg of this.segments) {
            if (seg.hitObstacle && Math.random() < 0.45) {
                particleSystem.push(new Particle(
                    seg.endX, seg.endY,
                    (Math.random() - 0.5) * 180, (Math.random() - 0.5) * 180,
                    '#c77dff', Math.random() * 4 + 2, 0.08
                ));
            }
        }
    }

    isExpired() {
        return this.timer <= 0;
    }

    /**
     * Draw cone-shaped expanding trapezoidal beam segments
     */
    draw(ctx) {
        if (this.timer <= 0 || this.segments.length === 0) return;

        ctx.save();
        const intensity = 0.8 + 0.2 * Math.sin(this.timer * 40);

        for (const seg of this.segments) {
            const segDist = Math.hypot(seg.endX - seg.startX, seg.endY - seg.startY);
            if (segDist < 1) continue;

            const nx = -(seg.endY - seg.startY) / segDist;
            const ny = (seg.endX - seg.startX) / segDist;

            const halfW1 = (seg.startW / 2) * intensity;
            const halfW2 = (seg.endW / 2) * intensity;

            // Helper to draw trapezoid path
            const drawTrapezoid = (h1, h2) => {
                ctx.beginPath();
                ctx.moveTo(seg.startX + nx * h1, seg.startY + ny * h1);
                ctx.lineTo(seg.endX + nx * h2, seg.endY + ny * h2);
                ctx.lineTo(seg.endX - nx * h2, seg.endY - ny * h2);
                ctx.lineTo(seg.startX - nx * h1, seg.startY - ny * h1);
                ctx.closePath();
            };

            // 1. Giant Ultraviolet Corona Outer Glow
            ctx.shadowColor = '#9d4edd';
            ctx.shadowBlur = 30;
            ctx.fillStyle = `rgba(157, 78, 221, ${0.4 * intensity})`;
            drawTrapezoid(halfW1, halfW2);
            ctx.fill();

            // 2. Neon Purple / Violet Core
            ctx.shadowColor = '#c77dff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(199, 125, 255, ${0.7 * intensity})`;
            drawTrapezoid(halfW1 * 0.65, halfW2 * 0.65);
            ctx.fill();

            // 3. High-Energy Cyan Plasma Stream
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = 14;
            ctx.fillStyle = `rgba(0, 242, 254, ${0.85 * intensity})`;
            drawTrapezoid(halfW1 * 0.35, halfW2 * 0.35);
            ctx.fill();

            // 4. Searing White Core Line
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(3, 7 * intensity);
            ctx.beginPath();
            ctx.moveTo(seg.startX, seg.startY);
            ctx.lineTo(seg.endX, seg.endY);
            ctx.stroke();

            // 5. Jagged Lightning Arcs
            ctx.shadowColor = '#c77dff';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 2;

            const steps = Math.max(2, Math.floor(segDist / 35));
            ctx.beginPath();
            ctx.moveTo(seg.startX, seg.startY);
            for (let s = 1; s < steps; s++) {
                const ratio = s / steps;
                const px = seg.startX + (seg.endX - seg.startX) * ratio;
                const py = seg.startY + (seg.endY - seg.startY) * ratio;
                const localHalfW = halfW1 + (halfW2 - halfW1) * ratio;
                const jitter = (Math.random() - 0.5) * (localHalfW * 0.8);
                ctx.lineTo(px + nx * jitter, py + ny * jitter);
            }
            ctx.lineTo(seg.endX, seg.endY);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class ElectricLasso {
    constructor(sourcePlayer, boundsWidth, boundsHeight) {
        this.sourcePlayer = sourcePlayer;
        this.ownerId = sourcePlayer.id;
        this.team = sourcePlayer.team;
        this.maxRange = 1350;
        this.launchSpeed = 2400;
        this.reachDist = 0;
        this.state = 'EXTENDING'; // 'EXTENDING', 'SNAGGED', 'REELING', 'HOLDING', 'RETRACTING', 'EXPIRED'
        this.holdDuration = 4.0;
        this.holdTimer = this.holdDuration;
        this.snaredTarget = null;
        this.cablePoints = [];
        this.boundsWidth = boundsWidth;
        this.boundsHeight = boundsHeight;
        this.launchAngle = sourcePlayer.turretAngle;
    }

    update(dt, allShips, obstacles, particleSystem, soundFx) {
        const cx = this.sourcePlayer.x + this.sourcePlayer.width / 2;
        const cy = this.sourcePlayer.y + this.sourcePlayer.height / 2;

        if (this.state === 'EXTENDING') {
            this.reachDist += this.launchSpeed * dt;
            const tipX = cx + Math.cos(this.launchAngle) * this.reachDist;
            const tipY = cy + Math.sin(this.launchAngle) * this.reachDist;

            // Check obstacle collision
            for (const obs of obstacles) {
                if (obs.collidesWithRect(tipX - 6, tipY - 6, 12, 12)) {
                    this.state = 'RETRACTING';
                    if (soundFx) soundFx.playLassoRelease();
                    return;
                }
            }

            // Check target snaring
            for (const ship of allShips) {
                if (!ship || ship === this.sourcePlayer || ship.hp <= 0) continue;
                if (ship.team !== 'NONE' && ship.team === this.team) continue;

                const scx = ship.x + ship.width / 2;
                const scy = ship.y + ship.height / 2;
                if (Math.hypot(scx - tipX, scy - tipY) <= ship.width / 2 + 10) {
                    this.state = 'REELING';
                    this.snaredTarget = ship;
                    ship.freezeTimer = this.holdDuration;
                    if (soundFx) soundFx.playLassoSnare();
                    break;
                }
            }

            if (this.reachDist >= this.maxRange) {
                this.state = 'RETRACTING';
            }
        } else if (this.state === 'REELING') {
            if (!this.snaredTarget || this.snaredTarget.hp <= 0) {
                this.state = 'RETRACTING';
                return;
            }

            const scx = this.snaredTarget.x + this.snaredTarget.width / 2;
            const scy = this.snaredTarget.y + this.snaredTarget.height / 2;
            const targetHoldX = cx + Math.cos(this.sourcePlayer.turretAngle) * 65;
            const targetHoldY = cy + Math.sin(this.sourcePlayer.turretAngle) * 65;

            const pullDist = Math.hypot(targetHoldX - scx, targetHoldY - scy);
            if (pullDist <= 15) {
                this.state = 'HOLDING';
            } else {
                const reelSpeed = 1600;
                const pullAngle = Math.atan2(targetHoldY - scy, targetHoldX - scx);
                this.snaredTarget.x += Math.cos(pullAngle) * reelSpeed * dt;
                this.snaredTarget.y += Math.sin(pullAngle) * reelSpeed * dt;
                this.snaredTarget.pushOutFromObstacles(obstacles);
            }
        } else if (this.state === 'HOLDING') {
            this.holdTimer -= dt;
            if (this.holdTimer <= 0 || !this.snaredTarget || this.snaredTarget.hp <= 0) {
                this.state = 'RETRACTING';
                if (soundFx) soundFx.playLassoRelease();
                return;
            }

            // Lock in front of player
            const targetHoldX = cx + Math.cos(this.sourcePlayer.turretAngle) * 65;
            const targetHoldY = cy + Math.sin(this.sourcePlayer.turretAngle) * 65;
            this.snaredTarget.x = targetHoldX - this.snaredTarget.width / 2;
            this.snaredTarget.y = targetHoldY - this.snaredTarget.height / 2;
            this.snaredTarget.pushOutFromObstacles(obstacles);
            this.snaredTarget.freezeTimer = this.holdTimer;
        } else if (this.state === 'RETRACTING') {
            this.reachDist -= this.launchSpeed * 1.5 * dt;
            if (this.reachDist <= 0) {
                this.state = 'EXPIRED';
            }
        }
    }

    draw(ctx) {
        if (this.state === 'EXPIRED') return;

        const cx = this.sourcePlayer.x + this.sourcePlayer.width / 2;
        const cy = this.sourcePlayer.y + this.sourcePlayer.height / 2;

        let endX = cx + Math.cos(this.launchAngle) * this.reachDist;
        let endY = cy + Math.sin(this.launchAngle) * this.reachDist;

        if ((this.state === 'REELING' || this.state === 'HOLDING') && this.snaredTarget) {
            endX = this.snaredTarget.x + this.snaredTarget.width / 2;
            endY = this.snaredTarget.y + this.snaredTarget.height / 2;
        }

        ctx.save();
        ctx.strokeStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3.5;

        // Draw electric rope with vibrating jitter
        const dist = Math.hypot(endX - cx, endY - cy);
        const steps = Math.max(3, Math.floor(dist / 25));
        const nx = -(endY - cy) / (dist || 1);
        const ny = (endX - cx) / (dist || 1);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let i = 1; i < steps; i++) {
            const r = i / steps;
            const px = cx + (endX - cx) * r;
            const py = cy + (endY - cy) * r;
            const jitter = (Math.random() - 0.5) * 8;
            ctx.lineTo(px + nx * jitter, py + ny * jitter);
        }
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Glowing lasso tip ring
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isExpired() {
        return this.state === 'EXPIRED';
    }
}

/**
 * ============================================================================
 * Starship Arena - Active Fire-Lashing Inferno (RingOfFireEntity)
 * ============================================================================
 * Description:
 *   Active swirling fire aura anchored directly to the starship. Tightly hugs the
 *   hull (55px radius). When the pilot presses the Fire key, roaring flame tendrils
 *   lash outward, burning nearby enemies, detonating mines, cracking asteroids,
 *   and melting incoming hostile ballistic projectiles.
 * ============================================================================
 */
class RingOfFireEntity {
    constructor(ownerShipOrX, y = 0, ownerId = null, targetShip = null) {
        if (typeof ownerShipOrX === 'object' && ownerShipOrX !== null) {
            this.ownerShip = ownerShipOrX;
            this.ownerId = ownerShipOrX.id;
            this.x = ownerShipOrX.x + ownerShipOrX.width / 2;
            this.y = ownerShipOrX.y + ownerShipOrX.height / 2;
        } else {
            this.ownerShip = null;
            this.x = ownerShipOrX;
            this.y = y;
            this.ownerId = ownerId;
        }
        this.radius = 55; // Tighter, turbulent flame radius
        this.duration = 12.0;
        this.timer = this.duration;
        this.pulse = 0;
        this.isLashing = false;
        this.lashTimer = 0;
        this.damageCooldowns = new Map();
    }

    lash() {
        this.isLashing = true;
        this.lashTimer = 0.35; // Active outward surge duration
    }

    update(dt, allShips, particleSystem, soundFx, mines = [], projectiles = [], asteroids = []) {
        this.timer -= dt;
        this.pulse += dt * 14;

        if (this.ownerShip && this.ownerShip.hp > 0) {
            this.x = this.ownerShip.x + this.ownerShip.width / 2;
            this.y = this.ownerShip.y + this.ownerShip.height / 2;
        }

        if (this.lashTimer > 0) {
            this.lashTimer -= dt;
            this.isLashing = true;
        } else {
            this.isLashing = false;
        }

        const effectiveRadius = this.isLashing ? this.radius + 15 : this.radius;

        // Roaring chaotic flame particles
        if (particleSystem) {
            const particleCount = this.isLashing ? 4 : 1;
            for (let p = 0; p < particleCount; p++) {
                const angle = Math.random() * Math.PI * 2;
                const r = effectiveRadius * (0.6 + Math.random() * 0.45);
                const px = this.x + Math.cos(angle) * r;
                const py = this.y + Math.sin(angle) * r;
                const spd = this.isLashing ? (Math.random() * 90 + 40) : (Math.random() * 30 + 10);
                const outAngle = angle + (Math.random() - 0.5) * 0.8;
                particleSystem.push(new Particle(
                    px, py,
                    Math.cos(outAngle) * spd,
                    Math.sin(outAngle) * spd,
                    Math.random() < 0.4 ? '#ff3b30' : (Math.random() < 0.7 ? '#ff9500' : '#ffea00'),
                    Math.random() * 4 + 2,
                    0.08
                ));
            }
        }

        // Decrement damage cooldowns
        for (const [key, cd] of this.damageCooldowns.entries()) {
            if (cd <= dt) this.damageCooldowns.delete(key);
            else this.damageCooldowns.set(key, cd - dt);
        }

        // 1. Burn nearby enemy ships
        for (const ship of allShips) {
            if (ship.hp <= 0 || ship.id === this.ownerId) continue;
            if (this.ownerShip && ship.team !== 'NONE' && ship.team === this.ownerShip.team) continue;
            const scx = ship.x + ship.width / 2;
            const scy = ship.y + ship.height / 2;
            const dist = Math.hypot(scx - this.x, scy - this.y);

            if (dist <= effectiveRadius + ship.width / 2) {
                const cd = this.damageCooldowns.get(ship.id) || 0;
                if (cd <= 0) {
                    ship.takeDamage(1, particleSystem, soundFx);
                    this.damageCooldowns.set(ship.id, 0.25);

                    // Kinetic outward repulsion
                    const pushAngle = Math.atan2(scy - this.y, scx - this.x);
                    ship.vx += Math.cos(pushAngle) * 160;
                    ship.vy += Math.sin(pushAngle) * 160;

                    if (soundFx) soundFx.playBump();
                }
            }
        }

        // 2. Melt incoming hostile standard ballistic projectiles
        if (projectiles) {
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const proj = projectiles[i];
                if (proj.ownerId === this.ownerId || proj.isMega) continue;
                const dist = Math.hypot(proj.x - this.x, proj.y - this.y);
                if (dist <= effectiveRadius + 8) {
                    // Vaporize projectile with sizzle
                    if (particleSystem) {
                        for (let k = 0; k < 6; k++) {
                            const a = Math.random() * Math.PI * 2;
                            particleSystem.push(new Particle(proj.x, proj.y, Math.cos(a) * 120, Math.sin(a) * 120, '#ff9500', 3, 0.07));
                        }
                    }
                    projectiles.splice(i, 1);
                }
            }
        }

        // 3. Detonate proximity mines in fire path
        if (mines && window._currentGame) {
            for (let i = mines.length - 1; i >= 0; i--) {
                const m = mines[i];
                const dist = Math.hypot(m.x - this.x, m.y - this.y);
                if (dist <= effectiveRadius + m.radius) {
                    m.detonate(window._currentGame);
                }
            }
        }

        // 4. Scorch asteroids
        if (asteroids) {
            for (const ast of asteroids) {
                if (ast.destroyed) continue;
                const dist = Math.hypot(ast.x - this.x, ast.y - this.y);
                if (dist <= effectiveRadius + ast.radius) {
                    const cdKey = `ast_${ast.x}_${ast.y}`;
                    const cd = this.damageCooldowns.get(cdKey) || 0;
                    if (cd <= 0) {
                        ast.takeDamage(1, particleSystem, soundFx, asteroids);
                        this.damageCooldowns.set(cdKey, 0.3);
                    }
                }
            }
        }
    }

    isExpired() {
        return this.timer <= 0 || (this.ownerShip && this.ownerShip.hp <= 0);
    }

    draw(ctx) {
        if (this.timer <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        const currentR = this.isLashing ? this.radius + 15 : this.radius;
        const fireAlpha = Math.min(1.0, this.timer * 0.5 + 0.5);

        // Core thermal glow
        const glowGrad = ctx.createRadialGradient(0, 0, currentR * 0.3, 0, 0, currentR * 1.3);
        glowGrad.addColorStop(0, 'rgba(255, 60, 0, 0.25)');
        glowGrad.addColorStop(0.7, 'rgba(255, 140, 0, 0.12)');
        glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, currentR * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // 12 chaotic swirling jagged flame tongues
        const flamePoints = 12;
        ctx.save();
        ctx.shadowColor = this.isLashing ? '#ffea00' : '#ff3b30';
        ctx.shadowBlur = this.isLashing ? 28 : 16;
        ctx.lineWidth = this.isLashing ? 3.5 : 2.5;

        // Outer lashing flame outline
        ctx.strokeStyle = `rgba(255, 60, 0, ${fireAlpha * 0.9})`;
        ctx.beginPath();
        for (let i = 0; i <= flamePoints; i++) {
            const a = (i / flamePoints) * Math.PI * 2 + this.pulse * 0.3;
            const wave = Math.sin(a * 5 + this.pulse) * (this.isLashing ? 14 : 7);
            const r = currentR + wave;
            const fx = Math.cos(a) * r;
            const fy = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(fx, fy);
            else ctx.lineTo(fx, fy);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner white-hot flame ring
        ctx.strokeStyle = `rgba(255, 220, 100, ${fireAlpha * 0.85})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= flamePoints; i++) {
            const a = (i / flamePoints) * Math.PI * 2 - this.pulse * 0.45;
            const wave = Math.cos(a * 4 - this.pulse) * (this.isLashing ? 9 : 4);
            const r = (currentR * 0.82) + wave;
            const fx = Math.cos(a) * r;
            const fy = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(fx, fy);
            else ctx.lineTo(fx, fy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Swirling fire sparks on rim
        const sparkCount = this.isLashing ? 8 : 5;
        for (let i = 0; i < sparkCount; i++) {
            const a = (i / sparkCount) * Math.PI * 2 + this.pulse * 0.7;
            const sr = currentR + Math.sin(this.pulse + i) * 6;
            ctx.fillStyle = (i % 2 === 0) ? '#ffea00' : '#ff3b30';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * sr, Math.sin(a) * sr, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

