/**
 * ============================================================================
 * Starship Arena - Doppelganger Decoy System (GhostShip)
 * ============================================================================
 * Description:
 *   Autonomous holographic starship clones deployed by the Doppelganger powerup.
 *   Mimics player appearance, emits thruster particles, fires harmless visual
 *   plasma bolts, draws holographic scanlines, and fools heat-seekers and AI bots.
 *
 * Responsibilities:
 *   - Autonomous steering and wander patterns.
 *   - Visual mimicry with scanline holographic rendering and decoy health bars.
 *   - Destruction upon taking weapon hits or absorbing homing missiles.
 * ============================================================================
 */

class GhostShip {
    constructor(x, y, turretAngle, ownerId, shipType, primaryColor, secondaryColor, chassis = 'VIPER') {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.turretAngle = turretAngle;
        this.ownerId = ownerId;
        this.shipType = shipType;
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
        this.chassis = chassis;
        this.speed = 190;
        this.vx = Math.cos(turretAngle) * this.speed;
        this.vy = Math.sin(turretAngle) * this.speed;
        this.timer = 12.0;
        this.duration = 12.0;
        this.hp = 1;
        this.turnTimer = 0;
        this.turnTarget = turretAngle;
        this.dummyFireTimer = Math.random() * 2 + 1;
        this.scanlinePhase = Math.random() * 10;
        this.flashTimer = 0;
    }

    update(dt, boundsWidth, boundsHeight, obstacles, particleSystem, soundFx, enemies = [], projectiles = null) {
        this.timer -= dt;
        this.scanlinePhase += dt * 8;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        if (this.timer <= 0 || this.hp <= 0) return;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // 1. Steering: Actively hunt and track closest enemy
        const aliveEnemies = (enemies || []).filter(e => e && e.hp > 0 && e.id !== this.ownerId);
        let closestDist = Infinity;
        if (aliveEnemies.length > 0) {
            let closest = null;
            for (const e of aliveEnemies) {
                const ecx = e.x + e.width / 2;
                const ecy = e.y + e.height / 2;
                const d = Math.hypot(ecx - cx, ecy - cy);
                if (d < closestDist) { closestDist = d; closest = e; }
            }
            if (closest) {
                const ecx = closest.x + closest.width / 2;
                const ecy = closest.y + closest.height / 2;
                this.turnTarget = Math.atan2(ecy - cy, ecx - cx);

                // Dynamic hunt throttle: rush when far, circle when in combat range
                if (closestDist > 240) this.speed = 280;
                else if (closestDist < 120) this.speed = 130;
                else this.speed = 210;
            }
        } else {
            this.speed = 190;
            this.turnTimer -= dt;
            if (this.turnTimer <= 0) {
                this.turnTimer = Math.random() * 1.5 + 0.8;
                this.turnTarget = this.turretAngle + (Math.random() - 0.5) * 1.6;
            }
        }

        let diff = this.turnTarget - this.turretAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.turretAngle += diff * Math.min(1, dt * 5.5);

        this.vx = Math.cos(this.turretAngle) * this.speed;
        this.vy = Math.sin(this.turretAngle) * this.speed;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Arena boundary bouncing
        const margin = 24;
        let bounced = false;
        if (this.x < margin) {
            this.x = margin;
            this.vx = Math.abs(this.vx);
            bounced = true;
        } else if (this.x > boundsWidth - margin - this.width) {
            this.x = boundsWidth - margin - this.width;
            this.vx = -Math.abs(this.vx);
            bounced = true;
        }
        if (this.y < margin) {
            this.y = margin;
            this.vy = Math.abs(this.vy);
            bounced = true;
        } else if (this.y > boundsHeight - margin - this.height) {
            this.y = boundsHeight - margin - this.height;
            this.vy = -Math.abs(this.vy);
            bounced = true;
        }
        if (bounced) {
            this.turretAngle = Math.atan2(this.vy, this.vx);
            this.turnTarget = this.turretAngle;
        }

        // Obstacle avoidance
        for (const obs of obstacles) {
            if (obs.collidesWithRect(this.x, this.y, this.width, this.height)) {
                const overlapLeft = (this.x + this.width) - obs.x;
                const overlapRight = (obs.x + obs.w) - this.x;
                const overlapTop = (this.y + this.height) - obs.y;
                const overlapBottom = (obs.y + obs.h) - this.y;
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft) { this.x = obs.x - this.width - 2; this.vx = -Math.abs(this.vx); }
                else if (minOverlap === overlapRight) { this.x = obs.x + obs.w + 2; this.vx = Math.abs(this.vx); }
                else if (minOverlap === overlapTop) { this.y = obs.y - this.height - 2; this.vy = -Math.abs(this.vy); }
                else if (minOverlap === overlapBottom) { this.y = obs.y + obs.h + 2; this.vy = Math.abs(this.vy); }

                this.turretAngle = Math.atan2(this.vy, this.vx);
                this.turnTarget = this.turretAngle;
            }
        }

        // 2. Thruster Ion Particles
        if (particleSystem && Math.random() < 0.4) {
            const tailX = cx - Math.cos(this.turretAngle) * 16;
            const tailY = cy - Math.sin(this.turretAngle) * 16;
            particleSystem.push(new Particle(
                tailX + (Math.random() - 0.5) * 8,
                tailY + (Math.random() - 0.5) * 8,
                -Math.cos(this.turretAngle) * (Math.random() * 80 + 30),
                -Math.sin(this.turretAngle) * (Math.random() * 80 + 30),
                this.primaryColor,
                Math.random() * 3 + 2,
                0.09
            ));
        }

        // 3. Firing Combat Weapons
        this.dummyFireTimer -= dt;
        const isAimedAtEnemy = aliveEnemies.length > 0 && Math.abs(diff) < 0.45 && closestDist < 600;
        if (this.dummyFireTimer <= 0 && isAimedAtEnemy) {
            this.dummyFireTimer = Math.random() * 0.6 + 0.4;
            const tipX = cx + Math.cos(this.turretAngle) * 24;
            const tipY = cy + Math.sin(this.turretAngle) * 24;

            if (projectiles) {
                const ghostBullet = new Projectile(tipX, tipY, this.turretAngle, this.ownerId, this.primaryColor, false, false, false);
                ghostBullet.isGhost = true;
                ghostBullet.damage = 1; // Deals 1 damage to aid the player
                projectiles.push(ghostBullet);
            }
            if (soundFx) soundFx.playShoot();

            if (particleSystem) {
                for (let k = 0; k < 6; k++) {
                    const a = this.turretAngle + (Math.random() - 0.5) * 0.4;
                    const spd = Math.random() * 150 + 100;
                    particleSystem.push(new Particle(
                        tipX, tipY,
                        Math.cos(a) * spd, Math.sin(a) * spd,
                        this.primaryColor,
                        Math.random() * 3 + 2,
                        0.08
                    ));
                }
            }
        } else if (this.dummyFireTimer <= 0) {
            this.dummyFireTimer = Math.random() * 1.4 + 0.8;
        }
    }

    isExpired() {
        return this.timer <= 0 || this.hp <= 0;
    }

    destroy(particleSystem, soundFx) {
        this.hp = 0;
        if (soundFx) soundFx.playDoppelgangerPop();
        if (particleSystem) {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            for (let i = 0; i < 24; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = Math.random() * 220 + 60;
                particleSystem.push(new Particle(
                    cx, cy,
                    Math.cos(a) * spd, Math.sin(a) * spd,
                    Math.random() < 0.5 ? this.primaryColor : '#48cae4',
                    Math.random() * 4 + 2,
                    0.07
                ));
            }
        }
    }

    draw(ctx, ownerPlayer = null) {
        if (this.timer <= 0 || this.hp <= 0) return;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();
        ctx.globalAlpha = 1.0; // Render completely identical to real ship

        // 1. Inherit Power-Up Auras from Owner
        if (ownerPlayer) {
            // Shield Bubble
            if (ownerPlayer.shieldHp > 0) {
                ctx.save();
                ctx.shadowColor = '#00f2fe';
                ctx.shadowBlur = 24;
                ctx.fillStyle = 'rgba(0, 242, 254, 0.12)';
                ctx.strokeStyle = '#00f2fe';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(cx, cy, 34, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // Speed Boost Aura
            if (ownerPlayer.speedBoostTimer > 0) {
                ctx.save();
                ctx.shadowColor = '#ffe600';
                ctx.shadowBlur = 18;
                ctx.strokeStyle = '#ffe600';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(cx, cy, 31, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Rotating Blade Aura
            if (ownerPlayer.bladeTimer > 0) {
                ctx.save();
                ctx.shadowColor = '#00f5d4';
                ctx.shadowBlur = 18;
                ctx.strokeStyle = '#00f5d4';
                ctx.lineWidth = 3;
                const orbitRadius = 44;
                for (let b = 0; b < 2; b++) {
                    const bAngle = (ownerPlayer.bladeAngle || 0) + (b * Math.PI);
                    const bx = cx + Math.cos(bAngle) * orbitRadius;
                    const by = cy + Math.sin(bAngle) * orbitRadius;
                    ctx.save();
                    ctx.translate(bx, by);
                    ctx.rotate(bAngle + Math.PI / 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(-16, 0);
                    ctx.quadraticCurveTo(0, 10, 16, 0);
                    ctx.quadraticCurveTo(0, 3, -16, 0);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                }
                ctx.restore();
            }
        }

        // 2. Render Matching Chassis
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.turretAngle);

        const chassisType = ownerPlayer ? (ownerPlayer.chassis || ownerPlayer.id) : this.shipType;
        if (typeof Player !== 'undefined' && Player.renderShip) {
            Player.renderShip(ctx, chassisType, this.primaryColor, this.secondaryColor, true, 1.0, 1.0, this.flashTimer > 0, this.primaryColor, false);
        }
        ctx.restore();

        // 3. Decoy Fake Health Bar matching owner
        if (ownerPlayer) {
            const barW = 32;
            const barH = 4;
            const barX = cx - barW / 2;
            const barY = this.y - 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barX, barY, barW, barH);

            const hpPct = Math.max(0, Math.min(1, ownerPlayer.hp / ownerPlayer.maxHp));
            ctx.fillStyle = this.primaryColor;
            ctx.fillRect(barX, barY, barW * hpPct, barH);
        }

        ctx.restore();
    }
}
