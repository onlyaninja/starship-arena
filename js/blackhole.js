/**
 * ============================================================================
 * Starship Arena - Gravitational Vortex System (BlackHole)
 * ============================================================================
 * Description:
 *   Gravitational singularity entity featured dynamically in matches and
 *   permanently in Stage 5. Exerts non-linear Newtonian pull forces on
 *   starships and projectiles, pulls munitions into its singularity, and
 *   rewards pilots who survive 2 seconds inside with 20s of Electric Blaster.
 *
 * Responsibilities:
 *   - Radial gravitational pull on ships and projectiles.
 *   - Accretion disk rendering with multi-stop radial gradient and event horizon.
 *   - 2-second entrapment risk-and-reward calculation awarding the Electric Blaster.
 * ============================================================================
 */

class BlackHole {
    constructor(x, y, isPermanent = false) {
        this.x = x;
        this.y = y;
        this.isPermanent = isPermanent;
        this.radius = isPermanent ? 32 : 28;
        this.timer = isPermanent ? 999999 : 5.0;
        this.maxTimer = isPermanent ? 999999 : 5.0;
        this.pullRadius = isPermanent ? 520 : 480;
        this.pullForce = isPermanent ? 2600 : 2400;
        this.rotation = 0;

        this.damageCooldowns = new Map();
    }

    update(dt, particleSystem) {
        if (!this.isPermanent) {
            this.timer -= dt;
        }
        this.rotation += dt * 5;

        // Decrement damage timers
        for (const [id, t] of this.damageCooldowns.entries()) {
            if (t <= dt) this.damageCooldowns.delete(id);
            else this.damageCooldowns.set(id, t - dt);
        }

        if (Math.random() < 0.6) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 140 + 40;
            const px = this.x + Math.cos(angle) * dist;
            const py = this.y + Math.sin(angle) * dist;
            const speed = 240;

            particleSystem.push(new Particle(
                px, py,
                (this.x - px) / dist * speed,
                (this.y - py) / dist * speed,
                Math.random() < 0.5 ? '#9d4edd' : '#00f2fe',
                Math.random() * 5 + 2, 0.08
            ));
        }
    }

    applyGravityToPlayer(player, dt, particleSystem, game) {
        if (this.timer <= 0 || player.hp <= 0) return;
        const pcx = player.x + player.width / 2;
        const pcy = player.y + player.height / 2;
        const dx = this.x - pcx;
        const dy = this.y - pcy;
        const dist = Math.hypot(dx, dy);

        if (dist > 0 && dist <= this.pullRadius) {
            const factor = Math.pow(1 - dist / this.pullRadius, 1.4);
            const force = this.pullForce * factor * dt;
            player.vx += (dx / dist) * force;
            player.vy += (dy / dist) * force;
        }

        if (dist <= 50) {
            const dmgTimer = this.damageCooldowns.get(player.id) || 0;
            if (dmgTimer <= 0) {
                player.takeDamage(1, particleSystem, game.soundFx);
                this.damageCooldowns.set(player.id, 0.6); // Black hole hurts to be inside

                for (let i = 0; i < 15; i++) {
                    const a = Math.random() * Math.PI * 2;
                    particleSystem.push(new Particle(
                        pcx, pcy,
                        Math.cos(a) * 350, Math.sin(a) * 350,
                        '#ff5e62', Math.random() * 6 + 3, 0.06
                    ));
                }

                if (game.updateHUD) game.updateHUD();
                if (game.checkVictoryConditions) game.checkVictoryConditions();
            }

            // 2-second entrapment reward: 20 seconds of Electric Blaster!
            if (player.blackHoleTrappedTimer >= 0) {
                player.blackHoleTrappedTimer += dt;

                // Crackling charging particles
                if (Math.random() < 0.6) {
                    const a = Math.random() * Math.PI * 2;
                    particleSystem.push(new Particle(
                        pcx + (Math.random() - 0.5) * 20,
                        pcy + (Math.random() - 0.5) * 20,
                        Math.cos(a) * 120, Math.sin(a) * 120,
                        Math.random() < 0.5 ? '#00f2fe' : '#ffe600',
                        Math.random() * 4 + 2, 0.07
                    ));
                }

                if (player.blackHoleTrappedTimer >= 2.0) {
                    player.electricBlasterTimer = 20.0;
                    player.blackHoleTrappedTimer = -6.0; // Cooldown before can be awarded again

                    if (game.soundFx) game.soundFx.playElectricReward();

                    // Massive shockwave of electric lightning
                    for (let i = 0; i < 45; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const spd = Math.random() * 450 + 150;
                        particleSystem.push(new Particle(
                            pcx, pcy,
                            Math.cos(a) * spd, Math.sin(a) * spd,
                            Math.random() < 0.5 ? '#00f2fe' : '#ffe600',
                            Math.random() * 6 + 3, 0.12
                        ));
                    }

                    if (game.updateHUD) game.updateHUD();
                }
            } else {
                player.blackHoleTrappedTimer += dt;
                if (player.blackHoleTrappedTimer > 0) player.blackHoleTrappedTimer = 0;
            }
        } else {
            // Outside core
            if (player.blackHoleTrappedTimer > 0) {
                player.blackHoleTrappedTimer = Math.max(0, player.blackHoleTrappedTimer - dt * 2);
            } else if (player.blackHoleTrappedTimer < 0) {
                player.blackHoleTrappedTimer += dt;
                if (player.blackHoleTrappedTimer > 0) player.blackHoleTrappedTimer = 0;
            }
        }
    }

    applyGravityToProjectile(proj, dt) {
        if (this.timer <= 0 || proj.exploded) return;
        const dx = this.x - proj.x;
        const dy = this.y - proj.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0 && dist <= this.pullRadius) {
            const factor = Math.pow(1 - dist / this.pullRadius, 1.2);
            const force = 2200 * factor * dt;
            
            proj.vx += (dx / dist) * force;
            proj.vy += (dy / dist) * force;
            proj.angle = Math.atan2(proj.vy, proj.vx);

            if (dist <= 22) {
                proj.exploded = true;
            }
        }
    }

    draw(ctx) {
        if (this.timer <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const timerPct = this.isPermanent ? 1.0 : Math.max(0, this.timer / this.maxTimer);

        ctx.strokeStyle = 'rgba(157, 78, 221, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.pullRadius * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#9d4edd';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#9d4edd';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerPct);
        ctx.stroke();

        const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 80);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.3, '#3c096c');
        grad.addColorStop(0.65, '#7b2cbf');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.isPermanent ? '#ffe600' : '#00f2fe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.fillStyle = '#05030a';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isExpired() {
        return !this.isPermanent && this.timer <= 0;
    }
}
