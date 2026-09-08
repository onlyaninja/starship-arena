/**
 * ============================================================================
 * Starship Arena - Obstacle & Interactive Hazard Engine (Obstacles)
 * ============================================================================
 * Description:
 *   Manages structural arena boundaries, reflective purple barriers, timed
 *   pneumatic sliding blast doors, hydraulic crusher energy siphon traps,
 *   and spacetime labyrinth shifting sectors.
 *
 * Responsibilities:
 *   - Obstacle class: Reflective purple barriers with weapon reflection and collision.
 *   - SlidingDoor class: Automated timed blast doors that cycle between open
 *     and closed states, creating dynamic corridors for CTF Level 2.
 *   - CrusherTrap class: Hydraulic clamp trap that captures entering starships,
 *     crushes their hulls, and siphons stolen energy directly into enemy vessels.
 *   - SpacetimeLabyrinthSystem: Manages shifting arena quadrants for CTF Level 3,
 *     disrupting spacetime and transporting all entities (ships, flags, mines)
 *     with the sliding terrain.
 * ============================================================================
 */

class Obstacle {
    constructor(x, y, w, h, isSlidingDoor = false) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.isSlidingDoor = isSlidingDoor;
        this.fillColor = '#1e082b';
        this.strokeColor = '#c77dff';
        this.glowColor = '#9d4edd';
    }

    collidesWithRect(rx, ry, rw, rh) {
        return (
            rx < this.x + this.w &&
            rx + rw > this.x &&
            ry < this.y + this.h &&
            ry + rh > this.y
        );
    }

    reflectMunition(munition) {
        const r = munition.radius || 4;
        const leftOverlap = (munition.x + r) - this.x;
        const rightOverlap = (this.x + this.w) - (munition.x - r);
        const topOverlap = (munition.y + r) - this.y;
        const bottomOverlap = (this.y + this.h) - (munition.y - r);

        const minOverlap = Math.min(leftOverlap, rightOverlap, topOverlap, bottomOverlap);

        if (minOverlap === leftOverlap) {
            munition.x = this.x - r - 1;
            munition.vx = -Math.abs(munition.vx);
        } else if (minOverlap === rightOverlap) {
            munition.x = this.x + this.w + r + 1;
            munition.vx = Math.abs(munition.vx);
        } else if (minOverlap === topOverlap) {
            munition.y = this.y - r - 1;
            munition.vy = -Math.abs(munition.vy);
        } else {
            munition.y = this.y + this.h + r + 1;
            munition.vy = Math.abs(munition.vy);
        }

        munition.bounced = true;
        munition.isReflected = true;
        if (munition.isHoming) {
            munition.target = null; // Re-evaluate dynamic target upon barrier reflection
        }
        if (munition.angle !== undefined) {
            munition.angle = Math.atan2(munition.vy, munition.vx);
        }
    }

    reflectHorizontal(bullet) {
        this.reflectMunition(bullet);
    }

    reflectVertical(bullet) {
        this.reflectMunition(bullet);
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 14;

        ctx.fillStyle = this.fillColor;
        ctx.fillRect(this.x, this.y, this.w, this.h);

        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        // Core highlight
        ctx.strokeStyle = '#e0aaff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + 2, this.y + 2, Math.max(0, this.w - 4), Math.max(0, this.h - 4));

        ctx.restore();
    }
}

/**
 * Timed Pneumatic Sliding Blast Door Class
 * Cycles open and shut on an automated timer for CTF Level 2.
 */
class SlidingDoor extends Obstacle {
    constructor(x, y, w, h, openDuration = 5.0, closedDuration = 4.0, isHorizontal = false) {
        super(x, y, w, h, true);
        this.baseX = x;
        this.baseY = y;
        this.fullW = w;
        this.fullH = h;
        this.openDuration = openDuration;
        this.closedDuration = closedDuration;
        this.isHorizontal = isHorizontal;
        this.state = 'CLOSED'; // 'CLOSED', 'OPENING', 'OPEN', 'CLOSING'
        this.stateTimer = closedDuration;
        this.openProgress = 0.0; // 0.0 = fully closed, 1.0 = fully open
        this.warningTimer = 0;
    }

    update(dt, soundFx) {
        this.stateTimer -= dt;

        if (this.state === 'CLOSED') {
            this.openProgress = 0.0;
            if (this.stateTimer <= 0) {
                this.state = 'OPENING';
                this.stateTimer = 0.8; // Slide animation time
                if (soundFx) soundFx.playDoorSlide();
            }
        } else if (this.state === 'OPENING') {
            this.openProgress = Math.min(1.0, 1.0 - (this.stateTimer / 0.8));
            if (this.stateTimer <= 0) {
                this.state = 'OPEN';
                this.stateTimer = this.openDuration;
                this.openProgress = 1.0;
            }
        } else if (this.state === 'OPEN') {
            this.openProgress = 1.0;
            if (this.stateTimer <= 1.5) {
                this.warningTimer += dt * 8; // Flash warning lights
            }
            if (this.stateTimer <= 0) {
                this.state = 'CLOSING';
                this.stateTimer = 0.8;
                if (soundFx) soundFx.playDoorSlide();
            }
        } else if (this.state === 'CLOSING') {
            this.openProgress = Math.max(0.0, this.stateTimer / 0.8);
            if (this.stateTimer <= 0) {
                this.state = 'CLOSED';
                this.stateTimer = this.closedDuration;
                this.openProgress = 0.0;
            }
        }

        // Adjust effective obstacle collision bounds as door slides
        if (this.isHorizontal) {
            this.w = this.fullW * (1.0 - this.openProgress);
        } else {
            this.h = this.fullH * (1.0 - this.openProgress);
        }
    }

    collidesWithRect(rx, ry, rw, rh) {
        if (this.openProgress >= 0.85) return false; // Open enough to pass through
        return super.collidesWithRect(rx, ry, rw, rh);
    }

    draw(ctx) {
        ctx.save();
        
        // Draw Door Frame / Tracks
        ctx.strokeStyle = 'rgba(199, 125, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(this.baseX, this.baseY, this.fullW, this.fullH);
        ctx.setLineDash([]);

        // Draw Sliding Leaf
        if (this.w > 2 && this.h > 2) {
            const isWarning = (this.state === 'OPEN' && this.stateTimer <= 1.5);
            const doorColor = isWarning ? (Math.sin(this.warningTimer) > 0 ? '#ff0055' : '#ffd166') : '#c77dff';

            ctx.shadowColor = doorColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#1e082b';
            ctx.fillRect(this.x, this.y, this.w, this.h);

            ctx.strokeStyle = doorColor;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(this.x, this.y, this.w, this.h);

            // Hazard chevrons on blast door
            ctx.strokeStyle = isWarning ? 'rgba(255, 0, 85, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            const step = 16;
            for (let p = 0; p < (this.isHorizontal ? this.w : this.h); p += step) {
                ctx.beginPath();
                if (this.isHorizontal) {
                    ctx.moveTo(this.x + p, this.y);
                    ctx.lineTo(this.x + p + 8, this.y + this.h);
                } else {
                    ctx.moveTo(this.x, this.y + p);
                    ctx.lineTo(this.x + this.w, this.y + p + 8);
                }
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

/**
 * Hydraulic Crusher Trap & Energy Siphon
 * Clamps shut on entering starships, holding them, dealing damage, and
 * siphoning energy to the opposing team's ships via glowing plasma links.
 */
class CrusherTrap {
    constructor(x, y, w = 120, h = 120) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.state = 'READY'; // 'READY', 'CLAMPED', 'COOLDOWN'
        this.clampDuration = 2.8;
        this.clampTimer = 0;
        this.cooldownDuration = 6.0;
        this.cooldownTimer = 0;
        this.trappedShip = null;
        this.damageTickTimer = 0;
        this.jawProgress = 0; // 0 = open, 1 = closed
    }

    update(dt, game) {
        const allShips = game.getAllShips ? game.getAllShips() : [game.p1, game.p2];

        if (this.state === 'READY') {
            this.jawProgress = 0;

            // Check if any alive ship is inside the trap trigger zone
            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;

            for (const ship of allShips) {
                if (!ship || ship.hp <= 0) continue;
                const scx = ship.x + ship.width / 2;
                const scy = ship.y + ship.height / 2;

                if (Math.hypot(scx - cx, scy - cy) <= this.w * 0.38) {
                    this.state = 'CLAMPED';
                    this.trappedShip = ship;
                    this.clampTimer = this.clampDuration;
                    this.damageTickTimer = 0;
                    if (game.soundFx) game.soundFx.playCrusherClamp();
                    break;
                }
            }
        } else if (this.state === 'CLAMPED') {
            this.clampTimer -= dt;
            this.jawProgress = Math.min(1.0, this.jawProgress + dt * 4);

            if (!this.trappedShip || this.trappedShip.hp <= 0 || this.clampTimer <= 0) {
                this.state = 'COOLDOWN';
                this.cooldownTimer = this.cooldownDuration;
                if (this.trappedShip) this.trappedShip.freezeTimer = 0;
                this.trappedShip = null;
                return;
            }

            // Immobilize and pull trapped ship to center
            const cx = this.x + this.w / 2;
            const cy = this.y + this.h / 2;
            this.trappedShip.x = cx - this.trappedShip.width / 2;
            this.trappedShip.y = cy - this.trappedShip.height / 2;
            this.trappedShip.freezeTimer = this.clampTimer;

            // Damage Ticks: 1 HP per 0.9s
            this.damageTickTimer += dt;
            if (this.damageTickTimer >= 0.85) {
                this.damageTickTimer = 0;
                this.trappedShip.takeDamage(1, game.particles, game.soundFx);
                if (game.soundFx) game.soundFx.playSiphonDrain();

                // Siphon Energy: Find opposing team's ships to empower
                const enemyTeam = (this.trappedShip.team === 'BLUE') ? 'RED' : 'BLUE';
                const enemies = allShips.filter(s => s && s.hp > 0 && (s.team === enemyTeam || s.id !== this.trappedShip.id));

                if (enemies.length > 0) {
                    for (const enemy of enemies) {
                        // Empower enemy with HP or Mega-Blast charge
                        if (enemy.hp < enemy.maxHp) enemy.hp = Math.min(enemy.maxHp, enemy.hp + 1);
                        else enemy.chargeTimer = enemy.maxChargeTime; // Instant mega charge!

                        // Spawn radiant energy siphon particles from crusher to enemy
                        const ecx = enemy.x + enemy.width / 2;
                        const ecy = enemy.y + enemy.height / 2;
                        for (let k = 0; k < 12; k++) {
                            const ratio = k / 12;
                            game.particles.push(new Particle(
                                cx + (ecx - cx) * ratio + (Math.random() - 0.5) * 20,
                                cy + (ecy - cy) * ratio + (Math.random() - 0.5) * 20,
                                (ecx - cx) * 0.4, (ecy - cy) * 0.4,
                                '#00f2fe', Math.random() * 4 + 2, 0.09
                            ));
                        }
                    }
                    if (game.updateHUD) game.updateHUD();
                }
            }
        } else if (this.state === 'COOLDOWN') {
            this.cooldownTimer -= dt;
            this.jawProgress = Math.max(0.0, this.jawProgress - dt * 2);
            if (this.cooldownTimer <= 0) {
                this.state = 'READY';
                this.jawProgress = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const isClamped = (this.state === 'CLAMPED');
        const mainColor = isClamped ? '#ff0055' : (this.state === 'READY' ? '#ffd166' : '#6c757d');

        // Outer Trap Floor Grate
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = isClamped ? 18 : 8;
        ctx.strokeRect(0, 0, this.w, this.h);

        // Warning Hazard Stripes
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.25)';
        ctx.lineWidth = 2;
        for (let p = 0; p < this.w; p += 20) {
            ctx.beginPath();
            ctx.moveTo(p, 0); ctx.lineTo(p + 15, this.h);
            ctx.stroke();
        }

        // Hydraulic Piston Jaws
        const jawOffset = (this.w * 0.4) * this.jawProgress;
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3;

        // Left Jaw
        ctx.fillRect(0, 0, 16 + jawOffset, this.h);
        ctx.strokeRect(0, 0, 16 + jawOffset, this.h);

        // Right Jaw
        ctx.fillRect(this.w - (16 + jawOffset), 0, 16 + jawOffset, this.h);
        ctx.strokeRect(this.w - (16 + jawOffset), 0, 16 + jawOffset, this.h);

        // Clamping teeth
        for (let t = 10; t < this.h - 15; t += 25) {
            ctx.beginPath();
            ctx.moveTo(16 + jawOffset, t);
            ctx.lineTo(24 + jawOffset, t + 10);
            ctx.lineTo(16 + jawOffset, t + 20);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(this.w - (16 + jawOffset), t);
            ctx.lineTo(this.w - (24 + jawOffset), t + 10);
            ctx.lineTo(this.w - (16 + jawOffset), t + 20);
            ctx.stroke();
        }

        // Siphon Core Glyph
        ctx.fillStyle = mainColor;
        ctx.font = '16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isClamped ? '⚡ SIPHON' : '⚙️ CRUSHER', this.w / 2, this.h / 2);

        ctx.restore();
    }
}

/**
 * Spacetime Labyrinth Disruption System
 * Shifts arena sectors dynamically on a periodic timer for CTF Level 3,
 * carrying players, AIs, flags, powerups, and mines along with the shifting terrain.
 */
class SpacetimeLabyrinthSystem {
    constructor(arenaWidth, arenaHeight) {
        this.arenaWidth = arenaWidth;
        this.arenaHeight = arenaHeight;
        this.shiftInterval = 14.0;
        this.timer = this.shiftInterval;
        this.warningDuration = 3.0;
        this.isShifting = false;
        this.shiftProgress = 0;
        this.shiftDirection = 1; // 1 = right/down, -1 = left/up
        this.shiftAxis = 'X';    // 'X' or 'Y'
        this.affectedZone = 1;   // Row or Column index (0, 1, or 2)
        this.shiftMagnitude = 160; // Distance to shift
    }

    update(dt, game) {
        this.timer -= dt;

        if (this.timer <= this.warningDuration && !this.isShifting) {
            // Screen shake or warning particles
            if (Math.random() < 0.3) {
                const px = Math.random() * this.arenaWidth;
                const py = Math.random() * this.arenaHeight;
                game.particles.push(new Particle(px, py, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, '#9d4edd', 4, 0.08));
            }
        }

        if (this.timer <= 0) {
            this.timer = this.shiftInterval;
            this.executeShift(game);
        }
    }

    executeShift(game) {
        if (game.soundFx) game.soundFx.playLabyrinthShift();

        this.shiftAxis = (Math.random() < 0.5) ? 'X' : 'Y';
        this.shiftDirection = (Math.random() < 0.5) ? 1 : -1;
        this.affectedZone = Math.floor(Math.random() * 3); // 3 bands

        const shiftDist = this.shiftMagnitude * this.shiftDirection;

        // Visual warp ring
        if (game.shockwaves) {
            game.shockwaves.push(new ShockwaveRing(this.arenaWidth / 2, this.arenaHeight / 2, this.arenaWidth * 0.7, '#c77dff', 0.8));
        }

        // Define the bounds of the shifting zone
        let minX = 0, maxX = this.arenaWidth;
        let minY = 0, maxY = this.arenaHeight;

        if (this.shiftAxis === 'X') {
            const rowH = this.arenaHeight / 3;
            minY = this.affectedZone * rowH;
            maxY = minY + rowH;
        } else {
            const colW = this.arenaWidth / 3;
            minX = this.affectedZone * colW;
            maxX = minX + colW;
        }

        // 1. Shift all Obstacles inside the zone
        for (const obs of game.obstacles) {
            if (obs.x + obs.w > minX && obs.x < maxX && obs.y + obs.h > minY && obs.y < maxY) {
                if (this.shiftAxis === 'X') {
                    obs.x = Math.max(30, Math.min(this.arenaWidth - obs.w - 30, obs.x + shiftDist));
                } else {
                    obs.y = Math.max(30, Math.min(this.arenaHeight - obs.h - 30, obs.y + shiftDist));
                }
            }
        }

        // 2. Shift all Ships (Humans & AIs) inside the zone along with the ground
        const allShips = game.getAllShips ? game.getAllShips() : [game.p1, game.p2];
        for (const ship of allShips) {
            if (!ship || ship.hp <= 0) continue;
            const scx = ship.x + ship.width / 2;
            const scy = ship.y + ship.height / 2;
            if (scx >= minX && scx <= maxX && scy >= minY && scy <= maxY) {
                if (this.shiftAxis === 'X') {
                    ship.x = Math.max(20, Math.min(this.arenaWidth - ship.width - 20, ship.x + shiftDist));
                } else {
                    ship.y = Math.max(20, Math.min(this.arenaHeight - ship.height - 20, ship.y + shiftDist));
                }
                ship.pushOutFromObstacles(game.obstacles);
            }
        }

        // 3. Shift dropped flags inside the zone
        for (const flag of [game.blueFlag, game.redFlag]) {
            if (flag && !flag.carrier) {
                if (flag.x >= minX && flag.x <= maxX && flag.y >= minY && flag.y <= maxY) {
                    if (this.shiftAxis === 'X') flag.x = Math.max(40, Math.min(this.arenaWidth - 40, flag.x + shiftDist));
                    else flag.y = Math.max(40, Math.min(this.arenaHeight - 40, flag.y + shiftDist));
                }
            }
        }

        // 4. Shift Mines inside the zone
        if (game.mines) {
            for (const mine of game.mines) {
                if (mine.x >= minX && mine.x <= maxX && mine.y >= minY && mine.y <= maxY) {
                    if (this.shiftAxis === 'X') mine.x = Math.max(30, Math.min(this.arenaWidth - 30, mine.x + shiftDist));
                    else mine.y = Math.max(30, Math.min(this.arenaHeight - 30, mine.y + shiftDist));
                }
            }
        }

        // 5. Shift Power-Ups inside the zone
        if (game.powerUps) {
            for (const p of game.powerUps) {
                if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
                    if (this.shiftAxis === 'X') p.x = Math.max(30, Math.min(this.arenaWidth - 30, p.x + shiftDist));
                    else p.y = Math.max(30, Math.min(this.arenaHeight - 30, p.y + shiftDist));
                }
            }
        }
    }

    draw(ctx) {
        // Draw spacetime rift warning grid if timer is approaching shift
        if (this.timer <= this.warningDuration) {
            ctx.save();
            const pulse = (Math.sin(Date.now() * 0.01) + 1) * 0.5;
            ctx.strokeStyle = `rgba(157, 78, 221, ${0.25 + pulse * 0.35})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);

            if (this.shiftAxis === 'X') {
                const rowH = this.arenaHeight / 3;
                const minY = this.affectedZone * rowH;
                ctx.strokeRect(0, minY, this.arenaWidth, rowH);
            } else {
                const colW = this.arenaWidth / 3;
                const minX = this.affectedZone * colW;
                ctx.strokeRect(minX, 0, colW, this.arenaHeight);
            }
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}

/**
 * ============================================================================
 * Starship Arena - Stealth Nebula Blind Zone (StealthNebula)
 * ============================================================================
 * Description:
 *   Electromagnetic deep space dust clouds featured on advanced stages.
 *   Entities inside the cloud are obscured and hidden from outside view,
 *   creating tactical blind spots and ambush locations.
 * ============================================================================
 */
class StealthNebula {
    constructor(x, y, radius = 145) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.pulse = Math.random() * Math.PI * 2;
        this.wisps = [];
        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2;
            const dist = Math.random() * (radius * 0.7);
            this.wisps.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                r: Math.random() * 40 + 45,
                angle: Math.random() * Math.PI * 2,
                speed: (Math.random() - 0.5) * 0.4
            });
        }
        this.lightningTimer = Math.random() * 2;
    }

    containsPoint(px, py) {
        return Math.hypot(px - this.x, py - this.y) <= this.radius;
    }

    containsShip(ship) {
        const scx = ship.x + ship.width / 2;
        const scy = ship.y + ship.height / 2;
        return this.containsPoint(scx, scy);
    }

    update(dt) {
        this.pulse += dt * 1.5;
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
            this.lightningTimer = Math.random() * 2.5 + 1.0;
        }
        for (const w of this.wisps) {
            w.angle += w.speed * dt;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Dense volumetric opaque core (completely obscures anything beneath)
        const baseGrad = ctx.createRadialGradient(0, 0, this.radius * 0.25, 0, 0, this.radius);
        baseGrad.addColorStop(0, 'rgba(4, 2, 12, 0.99)');
        baseGrad.addColorStop(0.55, 'rgba(18, 6, 32, 0.94)');
        baseGrad.addColorStop(0.85, 'rgba(28, 12, 48, 0.75)');
        baseGrad.addColorStop(1, 'rgba(5, 4, 15, 0)');

        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Heavy swirling dust cloud wisps
        for (const w of this.wisps) {
            ctx.fillStyle = 'rgba(74, 20, 110, 0.42)';
            ctx.beginPath();
            ctx.arc(w.x + Math.cos(w.angle) * 12, w.y + Math.sin(w.angle) * 12, w.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Inner dark vortex
        ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing electromagnetic static & perimeter ring
        ctx.strokeStyle = 'rgba(199, 125, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 10]);
        ctx.lineDashOffset = -this.pulse * 14;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.96, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tactical label
        ctx.fillStyle = 'rgba(199, 125, 255, 0.65)';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ STEALTH CLOUD ⚡', 0, this.radius - 12);

        ctx.restore();
    }
}

/**
 * ============================================================================
 * Starship Arena - Starbase Dock & Forcefield Protection (RepairBase)
 * ============================================================================
 * Description:
 *   Tactical starbase installation. When an allied ship is docked within the
 *   perimeter, nanobots repair the hull (+1 HP/s) and an energy defense dome
 *   absorbs or reflects incoming hostile fire.
 * ============================================================================
 */
class RepairBase {
    constructor(x, y, radius = 70, team = 'NEUTRAL', label = 'REPAIR DOCK') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.team = team; // 'BLUE', 'RED', 'NEUTRAL'
        this.label = label;
        this.healCooldowns = new Map();
        this.pulse = 0;
    }

    containsShip(ship) {
        const scx = ship.x + ship.width / 2;
        const scy = ship.y + ship.height / 2;
        return Math.hypot(scx - this.x, scy - this.y) <= this.radius;
    }

    protectsShip(ship) {
        if (!this.containsShip(ship)) return false;
        if (this.team === 'NEUTRAL') return true;
        return ship.team === this.team || ship.id === this.team;
    }

    deflectsProjectile(proj) {
        const dist = Math.hypot(proj.x - this.x, proj.y - this.y);
        if (dist <= this.radius + 6) {
            // Deflect/absorb if projectile is hostile to this base
            if (this.team === 'NEUTRAL') return false; // Neutral bases let fire through unless specifically tuned
            if (proj.team && proj.team !== this.team) return true;
            if (proj.ownerId && proj.ownerId.includes('AI') && this.team === 'BLUE') return true;
            if (proj.ownerId === 'P1' && (this.team === 'RED' || this.team === 'P2')) return true;
            if (proj.ownerId === 'P2' && (this.team === 'BLUE' || this.team === 'P1')) return true;
            if (this.team === 'P1' && proj.ownerId !== 'P1') return true;
            if (this.team === 'P2' && proj.ownerId !== 'P2') return true;
        }
        return false;
    }

    update(dt, allShips, particleSystem, soundFx) {
        this.pulse += dt * 3.5;

        // Decrement heal cooldowns
        for (const [shipId, cd] of this.healCooldowns.entries()) {
            if (cd <= dt) this.healCooldowns.delete(shipId);
            else this.healCooldowns.set(shipId, cd - dt);
        }

        for (const ship of allShips) {
            if (ship.hp <= 0) continue;
            if (!this.containsShip(ship)) continue;

            const isAllied = (this.team === 'NEUTRAL' || ship.team === this.team || ship.id === this.team);
            if (!isAllied) continue;

            const cd = this.healCooldowns.get(ship.id) || 0;
            if (cd <= 0) {
                this.healCooldowns.set(ship.id, 1.0);

                if (ship.hp < ship.maxHp) {
                    ship.hp = Math.min(ship.maxHp, ship.hp + 1);

                    // Medical nanobot healing particles
                    if (particleSystem) {
                        const scx = ship.x + ship.width / 2;
                        const scy = ship.y + ship.height / 2;
                        for (let k = 0; k < 12; k++) {
                            const a = Math.random() * Math.PI * 2;
                            const spd = Math.random() * 80 + 30;
                            particleSystem.push(new Particle(
                                scx, scy,
                                Math.cos(a) * spd, Math.sin(a) * spd,
                                '#00f5d4', 3.5, 0.08
                            ));
                        }
                    }
                    if (soundFx && soundFx.playResurrect) soundFx.playResurrect();
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const color = (this.team === 'BLUE') ? '#00f2fe' : (this.team === 'RED' ? '#ff007f' : '#00f5d4');

        // Forcefield dome gradient
        const domeGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.radius);
        domeGrad.addColorStop(0, 'rgba(0, 245, 212, 0.08)');
        domeGrad.addColorStop(0.7, 'rgba(0, 245, 212, 0.04)');
        domeGrad.addColorStop(1, 'rgba(0, 245, 212, 0.18)');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing forcefield boundary ring
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating octagonal tech pad
        ctx.save();
        ctx.rotate(this.pulse * 0.15);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = Math.cos(a) * (this.radius * 0.7);
            const py = Math.sin(a) * (this.radius * 0.7);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Central Medical Cross
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-3, -11, 6, 22);
        ctx.fillRect(-11, -3, 22, 6);

        // Tech Label
        ctx.fillStyle = color;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+ ${this.label} +`, 0, this.radius - 10);

        ctx.restore();
    }
}
