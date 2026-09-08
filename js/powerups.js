/**
 * ============================================================================
 * Starship Arena - Power-Ups & Collectibles Engine (PowerUps)
 * ============================================================================
 * Description:
 *   Manages collectible tactical pick-up items spawned across the arena.
 *   Includes offensive arsenals, defensive overshields, speed boosters,
 *   hazard traps, rotating plasma blades, multiplayer partner resurrection,
 *   and tactical wingman boon buffs.
 *
 * Responsibilities:
 *   - PowerUpItem class: Animated pulsing icons, timers, and particle coronas.
 *   - Rotating Blade (ROTATING_BLADE): 15-second dual energy scythe aura
 *     orbiting the ship that shreds enemy hulls, slices bullets, and detonates mines.
 *   - Resurrect Partner (RESURRECT_PARTNER): Multiplayer item that revives a
 *     fallen teammate with full health and temporary invulnerability shield.
 *   - Partner Boon (PARTNER_BOON): Multiplayer item that confers speed, shields,
 *     and mega-charge energy to a wingman via radiant energy conduits.
 * ============================================================================
 */

class PowerUpItem {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isHazard = (type === 'HAZARD_DAMAGE' || type === 'HAZARD_SLOW');
        this.radius = 16;
        this.timer = 10.0;
        this.maxTimer = 10.0;
        this.pulse = 0;
        this.hazardRotation = 0;
    }

    update(dt, particleSystem) {
        this.timer -= dt;
        this.pulse += dt * 6;
        if (this.isHazard) {
            this.hazardRotation += dt * 1.5;
        }

        if (Math.random() < 0.35) {
            let pColor = '#ff7b00';
            if (this.type === 'SHIELD') pColor = '#00f2fe';
            else if (this.type === 'HEALTH') pColor = '#ff5e62';
            else if (this.type === 'MAX_HP') pColor = '#ff007f';
            else if (this.type === 'TELEPORT') pColor = '#9d4edd';
            else if (this.type === 'SPEED') pColor = '#ffe600';
            else if (this.type === 'MINE') pColor = '#00ff88';
            else if (this.type === 'EVAPORATION') pColor = '#c77dff';
            else if (this.type === 'TRACTOR_BEAM') pColor = '#39ff14';
            else if (this.type === 'DOPPELGANGER') pColor = '#48cae4';
            else if (this.type === 'ROTATING_BLADE') pColor = '#00f5d4';
            else if (this.type === 'QUAD_GUN') pColor = '#ffb703';
            else if (this.type === 'RING_OF_FIRE') pColor = '#ff3b30';
            else if (this.type === 'RESURRECT_PARTNER') pColor = '#2ec4b6';
            else if (this.type === 'PARTNER_BOON') pColor = '#ffd166';
            else if (this.type === 'IMMOBILIZER') pColor = '#00f5d4';
            else if (this.type === 'LASER_INHIBITOR') pColor = '#e0aaff';
            else if (this.type === 'HAZARD_DAMAGE') pColor = '#ff0055';
            else if (this.type === 'HAZARD_SLOW') pColor = '#d97706';

            const pSpeed = this.isHazard ? 25 : 35;
            particleSystem.push(new Particle(
                this.x + (Math.random() - 0.5) * 20,
                this.y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * pSpeed,
                (Math.random() - 0.5) * pSpeed,
                pColor,
                this.isHazard ? Math.random() * 3 + 2 : Math.random() * 4 + 2,
                this.isHazard ? 0.05 : 0.08
            ));
        }
    }

    draw(ctx) {
        if (this.timer <= 0) return;

        ctx.save();
        const pulseRadius = this.radius + Math.sin(this.pulse) * 2.5;
        const timerPct = Math.max(0, this.timer / this.maxTimer);

        if (this.isHazard) {
            // Hazard Pickup: Angular Spiked Warning Diamond
            const color = this.type === 'HAZARD_DAMAGE' ? '#ff0055' : '#d97706';
            const icon = this.type === 'HAZARD_DAMAGE' ? '💀' : '🐌';

            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([5, 3]);
            ctx.lineDashOffset = -this.hazardRotation * 20;

            ctx.beginPath();
            ctx.arc(0, 0, pulseRadius + 7, 0, Math.PI * 2 * timerPct);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.rotate(Math.PI / 4 + Math.sin(this.pulse * 0.5) * 0.1);
            const side = pulseRadius * 1.35;

            ctx.fillStyle = '#180812';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.rect(-side / 2, -side / 2, side, side);
            ctx.fill();
            ctx.stroke();

            ctx.restore();

            ctx.font = '14px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, this.x, this.y);

        } else {
            // Friendly Power-Up: Glowing Orb with Ring
            let mainColor = '#ff7b00';
            let icon = '💣';

            if (this.type === 'SHIELD') { mainColor = '#00f2fe'; icon = '🛡️'; }
            else if (this.type === 'HEALTH') { mainColor = '#ff5e62'; icon = '❤️'; }
            else if (this.type === 'MAX_HP') { mainColor = '#ff007f'; icon = '💖'; }
            else if (this.type === 'TELEPORT') { mainColor = '#9d4edd'; icon = '🌀'; }
            else if (this.type === 'SPEED') { mainColor = '#ffe600'; icon = '⚡'; }
            else if (this.type === 'MINE') { mainColor = '#00ff88'; icon = '🛑'; }
            else if (this.type === 'EVAPORATION') { mainColor = '#c77dff'; icon = '⚛️'; }
            else if (this.type === 'TRACTOR_BEAM') { mainColor = '#39ff14'; icon = '➰'; }
            else if (this.type === 'DOPPELGANGER') { mainColor = '#48cae4'; icon = '👥'; }
            else if (this.type === 'ROTATING_BLADE') { mainColor = '#00f5d4'; icon = '⚔️'; }
            else if (this.type === 'QUAD_GUN') { mainColor = '#ffb703'; icon = '⚡'; }
            else if (this.type === 'RING_OF_FIRE') { mainColor = '#ff3b30'; icon = '🔥'; }
            else if (this.type === 'RESURRECT_PARTNER') { mainColor = '#2ec4b6'; icon = '✝️'; }
            else if (this.type === 'PARTNER_BOON') { mainColor = '#ffd166'; icon = '✨'; }
            else if (this.type === 'IMMOBILIZER') { mainColor = '#00f5d4'; icon = '❄️'; }
            else if (this.type === 'LASER_INHIBITOR') { mainColor = '#e0aaff'; icon = '⚡'; }

            // Outer Timer Arc
            ctx.strokeStyle = mainColor;
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 12;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, pulseRadius + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * timerPct));
            ctx.stroke();

            // Inner Core
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Icon
            ctx.font = '14px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, this.x, this.y);
        }

        ctx.restore();
    }

    isExpired() {
        return this.timer <= 0;
    }
}
