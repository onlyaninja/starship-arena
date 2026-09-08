/**
 * ============================================================================
 * Starship Arena - Particle & Visual Effects Engine (ParticleSystem)
 * ============================================================================
 * Description:
 *   High-performance particle emitter and expanding circular blast shockwave
 *   renderer. Handles sparks, thruster exhaust, explosion dust, and circular
 *   shockwave rings for grenades, mines, and mega-blasts.
 *
 * Responsibilities:
 *   - Particle class: Position, velocity, fade life, color, and size.
 *   - ShockwaveRing class: Expanding circular blast ring with neon corona,
 *     inner energy flash, and alpha decay to satisfy "circle of explosion
 *     rather than a splatter" for grenades and heavy mines.
 * ============================================================================
 */

class Particle {
    constructor(x, y, vx, vy, color, radius = 3, decay = 0.05) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.radius = radius;
        this.alpha = 1.0;
        this.decay = decay;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.alpha -= this.decay * (dt * 60);
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.radius * this.alpha), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

/**
 * Expanding circular shockwave ring entity for explosive munitions (Grenades & Mines)
 */
class ShockwaveRing {
    constructor(x, y, maxRadius = 110, color = '#ff7b00', duration = 0.45) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.maxRadius = maxRadius;
        this.color = color;
        this.duration = duration;
        this.timer = duration;
        this.alpha = 1.0;
    }

    update(dt) {
        this.timer -= dt;
        const progress = Math.min(1.0, 1.0 - (this.timer / this.duration));
        // Fast outward expansion ease-out
        this.radius = 6 + (this.maxRadius - 6) * Math.sin(progress * Math.PI * 0.5);
        this.alpha = Math.max(0, 1.0 - progress);
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // 1. Outer Neon Shockwave Ring
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;
        ctx.lineWidth = Math.max(1.5, 7 * this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Inner Hot Blast Core Flash
        if (this.alpha > 0.3) {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha * 0.22;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Central Searing White Shockwave
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 2.5 * this.alpha);
        ctx.globalAlpha = this.alpha * 0.8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.95, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    isDead() {
        return this.timer <= 0 || this.alpha <= 0;
    }
}
