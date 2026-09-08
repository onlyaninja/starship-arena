/**
 * ============================================================================
 * Starship Arena - Proximity Mine System (ProximityMine)
 * ============================================================================
 * Description:
 *   Autonomous explosive hazard ordnance deployed by ships equipped with the
 *   Minelayer power-up. Features arming delay, proximity triggers, massive
 *   sub-bass whomp shockwaves, high direct-hit damage, and chain reaction detonations.
 *
 * Responsibilities:
 *   - Proximity detection for enemy ships, bullet impacts, and laser triggers.
 *   - Direct-hit high damage (5 HP at center, tapering across 130px blast radius).
 *   - Chain reaction logic: Detonating mines ignite nearby adjacent mines.
 *   - Sub-bass "whomp" audio & expanding circular shockwave ring effects.
 *   - If the laying ship moves slowly, dropped mines cluster together and chain-detonate.
 * ============================================================================
 */

class ProximityMine {
    constructor(x, y, ownerId) {
        this.x = x;
        this.y = y;
        this.ownerId = ownerId;
        this.radius = 13;
        this.triggerRadius = 32;
        this.blastRadius = 130;  // Wider blast radius
        this.maxDirectDamage = 4; // Balanced direct hit
        this.maxArmTimer = 3.0;
        this.armTimer = 3.0;     // 3-second arm delay so dropper can clear out safely
        this.timer = 24.0;
        this.pulse = 0;
        this.exploded = false;
        this.chainTriggered = false;
    }

    isArmed() {
        return this.armTimer <= 0;
    }

    update(dt, particleSystem) {
        if (this.armTimer > 0) this.armTimer -= dt;
        this.timer -= dt;
        this.pulse += dt * (this.isArmed() ? 8 : 4);

        if (Math.random() < 0.15) {
            const pColor = this.isArmed() ? '#00ff88' : '#ffe600';
            particleSystem.push(new Particle(
                this.x + (Math.random() - 0.5) * 12,
                this.y + (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                pColor, Math.random() * 3 + 1, 0.06
            ));
        }
    }

    draw(ctx) {
        if (this.exploded || this.timer <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        const isArmed = this.isArmed();
        const mainColor = isArmed ? '#00ff88' : '#ffe600';
        const blinkColor = (Math.sin(this.pulse) > 0) ? '#ff0055' : '#00ff88';

        // 1. Proximity boundary ring / 3-second Arming Progress Arc
        if (!isArmed) {
            const armRatio = Math.max(0, this.armTimer / this.maxArmTimer);
            ctx.strokeStyle = 'rgba(255, 230, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.triggerRadius + 4, -Math.PI / 2, -Math.PI / 2 + (1 - armRatio) * Math.PI * 2);
            ctx.stroke();

            // Unarmed warning indicator text
            ctx.fillStyle = '#ffe600';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.ceil(this.armTimer)}s`, 0, -this.triggerRadius - 8);
        } else {
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, this.triggerRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 2. Blast hazard boundary faint glow
        ctx.strokeStyle = isArmed ? 'rgba(255, 0, 85, 0.08)' : 'rgba(255, 230, 0, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.blastRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Heavy armored metal casing
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. Hardened magnetic cross spikes
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const a = (Math.PI / 2) * i;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
            ctx.lineTo(Math.cos(a) * (this.radius + 4), Math.sin(a) * (this.radius + 4));
            ctx.stroke();
        }

        // 5. Pulsing central beacon
        ctx.fillStyle = isArmed ? blinkColor : '#ffe600';
        ctx.shadowColor = isArmed ? blinkColor : '#ffe600';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isExpired() {
        return this.timer <= 0 || this.exploded;
    }

    /**
     * Executes mine detonation: damage, circular shockwave, sub-bass whomp, and chain reaction
     */
    detonate(game) {
        if (this.exploded) return;
        this.exploded = true;

        // Sub-bass whomp sound
        if (game.soundFx) game.soundFx.playWhompExplosion();

        // Circular shockwave ring
        if (game.shockwaves) {
            game.shockwaves.push(new ShockwaveRing(this.x, this.y, this.blastRadius, '#00ff88', 0.5));
            game.shockwaves.push(new ShockwaveRing(this.x, this.y, this.blastRadius * 0.7, '#ff0055', 0.35));
        }

        // Debris particles
        for (let i = 0; i < 40; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 450 + 100;
            game.particles.push(new Particle(
                this.x, this.y,
                Math.cos(a) * spd, Math.sin(a) * spd,
                Math.random() < 0.6 ? '#00ff88' : '#ff0055',
                Math.random() * 6 + 2, 0.07
            ));
        }

        // Damage ships in blast radius (stronger with direct hit)
        const allShips = game.getAllShips ? game.getAllShips() : [game.p1, game.p2];
        for (const p of allShips) {
            if (!p || p.hp <= 0) continue;
            // Dropper has immunity if mine detonates prematurely while unarmed
            if (p.id === this.ownerId && !this.isArmed()) continue;

            const pcx = p.x + p.width / 2;
            const pcy = p.y + p.height / 2;
            const dist = Math.hypot(pcx - this.x, pcy - this.y);

            if (dist <= this.blastRadius) {
                // Direct hit (dist <= 38): 4 damage
                // Mid range (38 < dist <= 80): 2 damage
                // Outer edge (80 < dist <= 130): 1 damage
                let dmg = 1;
                if (dist <= 38) dmg = this.maxDirectDamage;
                else if (dist <= 80) dmg = 2;

                p.takeDamage(dmg, game.particles, game.soundFx);
            }
        }

        // Damage nearby asteroids in blast radius
        if (game.asteroids && game.asteroids.length > 0) {
            for (const ast of game.asteroids) {
                if (ast.destroyed) continue;
                const distAst = Math.hypot(ast.x - this.x, ast.y - this.y);
                if (distAst <= this.blastRadius + ast.radius) {
                    const dmg = distAst <= 45 ? 3 : (distAst <= 85 ? 2 : 1);
                    ast.takeDamage(dmg, game.particles, game.soundFx, game.asteroids);
                }
            }
        }

        // Chain Reaction: Check other mines in the blast radius
        if (game.mines && game.mines.length > 0) {
            for (const otherMine of game.mines) {
                if (otherMine === this || otherMine.exploded || otherMine.chainTriggered) continue;
                const distToOther = Math.hypot(otherMine.x - this.x, otherMine.y - this.y);
                if (distToOther <= this.blastRadius) {
                    otherMine.chainTriggered = true;
                    // Stagger chain explosion slightly (80ms) for dramatic cascading whomps
                    setTimeout(() => {
                        if (!otherMine.exploded) {
                            otherMine.detonate(game);
                        }
                    }, 80);
                }
            }
        }

        if (game.updateHUD) game.updateHUD();
        if (game.checkVictoryConditions) game.checkVictoryConditions();
    }
}
