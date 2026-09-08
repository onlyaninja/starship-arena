/**
 * ============================================================================
 * Starship Arena - Asteroid Hazard System (Asteroid)
 * ============================================================================
 * Description:
 *   Autonomous drifting celestial hazards that traverse the battlefield.
 *   Asteroids bash into ships inflicting collision damage, absorb ballistic and
 *   energy weapons, shatter into smaller fragments upon destruction, and freely
 *   phase through purple barriers unimpeded.
 *
 * Responsibilities:
 *   - 3 Sizes:
 *       - BIG: 3 Damage, stately slow drift & slow rotation, high health (6 HP),
 *         splits into medium fragments.
 *       - MEDIUM: 2 Damage, moderate speed & rotation, medium health (3 HP),
 *         splits into small fragments.
 *       - SMALL: 1 Damage, fast zipping speed & rapid spin, low health (1 HP).
 *   - Freely moves through purple barriers without bouncing or being blocked.
 *   - Absorbs projectiles, lasers, and explosive munitions.
 *   - Bashing physics: Incurs damage and exerts kinetic knockback on impact with ships.
 * ============================================================================
 */

class Asteroid {
    constructor(x, y, size = 'MEDIUM', vx = null, vy = null) {
        this.x = x;
        this.y = y;
        this.size = size; // 'BIG', 'MEDIUM', 'SMALL'

        if (size === 'BIG') {
            this.radius = 38;
            this.damage = 3;
            this.maxHp = 1;
            this.speed = Math.random() * 35 + 40; // 40 - 75 px/s (slow and stately)
            this.rotSpeed = (Math.random() - 0.5) * 0.7; // Slow stately rotation
        } else if (size === 'MEDIUM') {
            this.radius = 24;
            this.damage = 2;
            this.maxHp = 1;
            this.speed = Math.random() * 60 + 90; // 90 - 150 px/s
            this.rotSpeed = (Math.random() - 0.5) * 1.8;
        } else {
            this.radius = 13;
            this.damage = 1;
            this.maxHp = 1;
            this.speed = Math.random() * 120 + 200; // 200 - 320 px/s (zipping by)
            this.rotSpeed = (Math.random() - 0.5) * 4.5; // Fast spin
        }

        this.hp = this.maxHp;
        this.angle = Math.random() * Math.PI * 2;

        if (vx !== null && vy !== null) {
            this.vx = vx;
            this.vy = vy;
        } else {
            const moveAngle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(moveAngle) * this.speed;
            this.vy = Math.sin(moveAngle) * this.speed;
        }

        this.hitCooldowns = new Map(); // Ship collision debounce
        this.destroyed = false;

        // Generate craggy procedural rock vertices
        this.numVertices = Math.floor(Math.random() * 4) + 9;
        this.vertexOffsets = [];
        for (let i = 0; i < this.numVertices; i++) {
            this.vertexOffsets.push(0.78 + Math.random() * 0.44); // 0.78 to 1.22
        }

        // Craters
        this.craters = [];
        const numCraters = (size === 'BIG') ? 4 : (size === 'MEDIUM' ? 2 : 1);
        for (let i = 0; i < numCraters; i++) {
            const crDist = Math.random() * (this.radius * 0.55);
            const crAngle = Math.random() * Math.PI * 2;
            this.craters.push({
                x: Math.cos(crAngle) * crDist,
                y: Math.sin(crAngle) * crDist,
                r: Math.random() * (this.radius * 0.22) + 2.5
            });
        }

        // Procedural fracture cracks (revealed when damaged)
        this.cracks = [];
        const numCracks = (size === 'BIG') ? 4 : (size === 'MEDIUM' ? 3 : 2);
        for (let i = 0; i < numCracks; i++) {
            const crackAngle = (i / numCracks) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const points = [{ x: 0, y: 0 }];
            const segs = Math.floor(Math.random() * 2) + 2;
            let curR = 0;
            let curA = crackAngle;
            for (let s = 0; s < segs; s++) {
                curR += (this.radius / segs) * (0.8 + Math.random() * 0.4);
                curA += (Math.random() - 0.5) * 0.45;
                points.push({
                    x: Math.cos(curA) * curR,
                    y: Math.sin(curA) * curR
                });
            }
            this.cracks.push(points);
        }
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle += this.rotSpeed * dt;

        // Decrement hit cooldowns
        for (const [shipId, timer] of this.hitCooldowns.entries()) {
            if (timer <= dt) this.hitCooldowns.delete(shipId);
            else this.hitCooldowns.set(shipId, timer - dt);
        }
    }

    draw(ctx) {
        if (this.destroyed) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Craggy outline
        ctx.fillStyle = '#2b2d42';
        ctx.strokeStyle = '#8d99ae';
        ctx.lineWidth = (this.size === 'BIG') ? 2.8 : (this.size === 'MEDIUM' ? 2.0 : 1.5);
        ctx.shadowColor = 'rgba(141, 153, 174, 0.4)';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        for (let i = 0; i < this.numVertices; i++) {
            const a = (i / this.numVertices) * Math.PI * 2;
            const r = this.radius * this.vertexOffsets[i];
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Craters
        ctx.fillStyle = '#1e1f29';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (const cr of this.craters) {
            ctx.beginPath();
            ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Fissure cracks & charred soot impact scorches if damaged
        if (this.hp < this.maxHp) {
            const damageRatio = (this.maxHp - this.hp) / this.maxHp;

            // 1. Carbon blackened scorched impact crater
            ctx.save();
            ctx.fillStyle = 'rgba(10, 10, 16, 0.72)';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.55 * (0.6 + damageRatio * 0.4), 0, Math.PI * 2);
            ctx.fill();

            // 2. Molten glowing internal fissures
            const crackGlow = damageRatio >= 0.65 ? '#ff3b30' : '#ff9500';
            ctx.strokeStyle = crackGlow;
            ctx.shadowColor = crackGlow;
            ctx.shadowBlur = 8;
            ctx.lineWidth = 1.8;
            for (const points of this.cracks) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let p = 1; p < points.length; p++) {
                    ctx.lineTo(points[p].x, points[p].y);
                }
                ctx.stroke();
            }

            // 3. Hot molten core ember
            ctx.fillStyle = crackGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 2.5 * damageRatio, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.restore();
    }

    /**
     * Asteroid absorbs weapons: damages asteroid and checks for shatter
     */
    takeDamage(amount, particleSystem, soundFx, newAsteroidsList = null) {
        this.hp -= amount;

        // Rock chipping sparks
        for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 180 + 40;
            particleSystem.push(new Particle(
                this.x, this.y,
                Math.cos(a) * spd, Math.sin(a) * spd,
                Math.random() < 0.5 ? '#8d99ae' : '#edf2f4',
                Math.random() * 3 + 1.5, 0.08
            ));
        }

        if (this.hp <= 0 && !this.destroyed) {
            this.destroy(particleSystem, soundFx, newAsteroidsList);
        }
    }

    /**
     * Instantly disintegrate asteroid completely without fragments (e.g. from Mega Blast)
     */
    disintegrate(particleSystem, soundFx) {
        this.destroyed = true;
        this.hp = 0;
        if (soundFx) soundFx.playExplosion();

        // Dense cosmic dust disintegration burst with radiant vapor particles
        for (let i = 0; i < 40; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 360 + 70;
            particleSystem.push(new Particle(
                this.x, this.y,
                Math.cos(a) * spd, Math.sin(a) * spd,
                Math.random() < 0.4 ? '#00f2fe' : (Math.random() < 0.7 ? '#ffffff' : '#4facfe'),
                Math.random() * 5 + 2, 0.09
            ));
        }
    }

    destroy(particleSystem, soundFx, newAsteroidsList = null) {
        this.destroyed = true;
        if (soundFx) soundFx.playExplosion();

        // Dense rock explosion
        const count = (this.size === 'BIG') ? 35 : (this.size === 'MEDIUM' ? 22 : 12);
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 320 + 60;
            particleSystem.push(new Particle(
                this.x, this.y,
                Math.cos(a) * spd, Math.sin(a) * spd,
                Math.random() < 0.6 ? '#8d99ae' : '#2b2d42',
                Math.random() * 5 + 2, 0.07
            ));
        }

        // Split into smaller asteroids
        if (newAsteroidsList) {
            if (this.size === 'BIG') {
                for (let k = 0; k < 2; k++) {
                    const splitAngle = this.angle + (k === 0 ? 0.9 : -0.9);
                    const spd = Math.random() * 40 + 100;
                    newAsteroidsList.push(new Asteroid(
                        this.x + Math.cos(splitAngle) * 15,
                        this.y + Math.sin(splitAngle) * 15,
                        'MEDIUM',
                        Math.cos(splitAngle) * spd,
                        Math.sin(splitAngle) * spd
                    ));
                }
            } else if (this.size === 'MEDIUM') {
                for (let k = 0; k < 2; k++) {
                    const splitAngle = this.angle + (k === 0 ? 1.2 : -1.2);
                    const spd = Math.random() * 60 + 200;
                    newAsteroidsList.push(new Asteroid(
                        this.x + Math.cos(splitAngle) * 10,
                        this.y + Math.sin(splitAngle) * 10,
                        'SMALL',
                        Math.cos(splitAngle) * spd,
                        Math.sin(splitAngle) * spd
                    ));
                }
            }
        }
    }

    isOutOfBounds(boundsWidth, boundsHeight) {
        const margin = this.radius + 60;
        return (
            this.x < -margin ||
            this.x > boundsWidth + margin ||
            this.y < -margin ||
            this.y > boundsHeight + margin
        );
    }
}
