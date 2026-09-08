/**
 * ============================================================================
 * Starship Arena - Capture The Flag System (Flag)
 * ============================================================================
 * Description:
 *   Tactical objective flag entity for Capture The Flag (CTF) operations.
 *   Tracks base home stations, carrier starships, dropped status with return
 *   countdowns, and visual flag accumulation pedestals.
 *
 * Responsibilities:
 *   - Carrier escort mechanics and drop physics upon carrier destruction.
 *   - Auto-return to home base after 15-second drop countdown.
 *   - Drawing animated pulsing home pedestals and captured flag trophy racks
 *     that clearly show flags accumulating as captures are scored.
 * ============================================================================
 */

class Flag {
    constructor(team, homeX, homeY) {
        this.team = team; // 'BLUE' or 'RED'
        this.homeX = homeX;
        this.homeY = homeY;
        this.x = homeX;
        this.y = homeY;
        this.radius = 20;
        this.carrier = null;
        this.isDropped = false;
        this.dropTimer = 0;
        this.maxDropTimer = 15.0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.primaryColor = (team === 'BLUE') ? '#00f2fe' : '#ff007f';
        this.secondaryColor = (team === 'BLUE') ? '#4facfe' : '#ff5e62';
    }

    get baseX() { return this.homeX; }
    set baseX(v) { this.homeX = v; }
    get baseY() { return this.homeY; }
    set baseY(v) { this.homeY = v; }

    isAtHome() {
        return !this.carrier && !this.isDropped && this.x === this.homeX && this.y === this.homeY;
    }

    get atHome() {
        return this.isAtHome();
    }

    update(dt, particles = null, soundFx = null) {
        this.pulsePhase += dt * 4;

        if (this.carrier) {
            this.isDropped = false;
            if (this.carrier.hp <= 0) {
                this.drop(this.carrier.x + this.carrier.width / 2, this.carrier.y + this.carrier.height / 2, soundFx);
            } else {
                const ccx = this.carrier.x + this.carrier.width / 2;
                const ccy = this.carrier.y + this.carrier.height / 2;
                this.x = ccx - Math.cos(this.carrier.turretAngle) * 28;
                this.y = ccy - Math.sin(this.carrier.turretAngle) * 28;

                if (particles && Math.random() < 0.4) {
                    particles.push(new Particle(
                        this.x, this.y,
                        -Math.cos(this.carrier.turretAngle) * 60 + (Math.random() - 0.5) * 20,
                        -Math.sin(this.carrier.turretAngle) * 60 + (Math.random() - 0.5) * 20,
                        this.primaryColor,
                        Math.random() * 4 + 2, 0.08
                    ));
                }
            }
        } else if (this.isDropped) {
            this.dropTimer -= dt;
            if (this.dropTimer <= 0) {
                this.returnHome(soundFx);
            }
        }
    }

    pickup(player, soundFx = null) {
        this.carrier = player;
        player.capturedFlag = this;
        this.isDropped = false;
        this.dropTimer = 0;
        if (soundFx) soundFx.playFlagPickup();
    }

    drop(x, y, soundFx = null) {
        if (this.carrier) {
            this.carrier.capturedFlag = null;
            this.carrier = null;
        }
        this.isDropped = true;
        this.dropTimer = this.maxDropTimer;
        this.x = x;
        this.y = y;
        if (soundFx) soundFx.playFlagStolen();
    }

    returnHome(soundFx = null) {
        if (this.carrier) {
            this.carrier.capturedFlag = null;
            this.carrier = null;
        }
        this.isDropped = false;
        this.dropTimer = 0;
        this.x = this.homeX;
        this.y = this.homeY;
        if (soundFx) soundFx.playFlagReturn();
    }

    returnToBase(soundFx = null) {
        return this.returnHome(soundFx);
    }

    draw(ctx, teamScore = 0) {
        ctx.save();

        // 1. Home Base Pedestal Zone
        ctx.save();
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -this.pulsePhase * 8;
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, 38, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = (this.team === 'BLUE') ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 0, 127, 0.08)';
        ctx.fill();

        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(this.homeX, this.homeY, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Trophy Flag Accumulator Sockets in Home Base
        const opposingColor = (this.team === 'BLUE') ? '#ff007f' : '#00f2fe';
        const socketYOffset = 48;
        for (let i = 0; i < 3; i++) {
            const sx = this.homeX + (i - 1) * 22;
            const sy = this.homeY + socketYOffset;

            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = (i < teamScore) ? opposingColor : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // If flag is captured, draw miniature glowing captured pennant
            if (i < teamScore) {
                ctx.fillStyle = opposingColor;
                ctx.shadowColor = opposingColor;
                ctx.shadowBlur = 10;
                ctx.font = '10px Outfit, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🚩', sx, sy);
            }
        }

        ctx.restore();

        // 2. Animated Flag Banner & Beacon
        const drawX = this.x;
        const drawY = this.y;
        const bob = Math.sin(this.pulsePhase) * 4;

        ctx.shadowColor = this.primaryColor;
        ctx.shadowBlur = 18;

        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY + 8, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Flag Pole
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(drawX - 4, drawY + 12);
        ctx.lineTo(drawX - 4, drawY - 24 + bob);
        ctx.stroke();

        // Flag Fabric (Waving Pennant)
        const wave = Math.sin(this.pulsePhase * 1.8) * 3;
        ctx.fillStyle = this.primaryColor;
        ctx.beginPath();
        ctx.moveTo(drawX - 4, drawY - 24 + bob);
        ctx.quadraticCurveTo(drawX + 12 + wave, drawY - 18 + bob, drawX + 22, drawY - 16 + bob);
        ctx.lineTo(drawX + 10 + wave, drawY - 8 + bob);
        ctx.lineTo(drawX - 4, drawY - 8 + bob);
        ctx.closePath();
        ctx.fill();

        // Energy Core Orb on Top of Pole
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(drawX - 4, drawY - 25 + bob, 4, 0, Math.PI * 2);
        ctx.fill();

        // If dropped, draw countdown timer ring
        if (this.isDropped) {
            const dropPct = Math.max(0, this.dropTimer / this.maxDropTimer);
            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(drawX, drawY, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dropPct);
            ctx.stroke();

            ctx.fillStyle = '#ffe600';
            ctx.font = '700 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(this.dropTimer)}s`, drawX, drawY - 32);
        }

        ctx.restore();
    }
}
