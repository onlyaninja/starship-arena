/**
 * ============================================================================
 * Starship Arena - Hyper Grand Prix Race Engine (race.js)
 * ============================================================================
 * Description:
 *   Autonomous 2D combat racing engine across 5 distinct space stages.
 *   Provides checkpoint tracking, boost pads, static power-up pods,
 *   slipstream drafting, rapid 1.0s track respawning, real-time leaderboard
 *   positioning, and championship points management.
 * ============================================================================
 */

class BoostPad {
    constructor(x, y, w, h, angle = 0, name = 'Boost Pad') {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.angle = angle;
        this.name = name;
        this.pulseTimer = 0;
    }

    update(dt) {
        this.pulseTimer = (this.pulseTimer + dt * 4.5) % (Math.PI * 2);
    }

    checkCollision(ship, game) {
        if (!ship || ship.hp <= 0) return false;
        const scx = ship.x + ship.width / 2;
        const scy = ship.y + ship.height / 2;

        if (scx >= this.x - this.w / 2 && scx <= this.x + this.w / 2 &&
            scy >= this.y - this.h / 2 && scy <= this.y + this.h / 2) {
            
            // Trigger Boost if not already at maximum turbo
            if (!ship.raceBoostTimer || ship.raceBoostTimer < 0.3) {
                ship.raceBoostTimer = 1.35;
                const boostPower = 340;
                ship.vx += Math.cos(this.angle) * boostPower;
                ship.vy += Math.sin(this.angle) * boostPower;

                if (game && game.soundFx) {
                    if (game.soundFx.playBoost) game.soundFx.playBoost();
                    else game.soundFx.playPowerUp();
                }

                // Burst of glowing cyan warp particles
                if (game && game.particles) {
                    for (let i = 0; i < 14; i++) {
                        const a = this.angle + Math.PI + (Math.random() - 0.5) * 0.8;
                        const spd = Math.random() * 320 + 80;
                        game.particles.push(new Particle(
                            scx, scy,
                            Math.cos(a) * spd, Math.sin(a) * spd,
                            i % 2 === 0 ? '#00f2fe' : '#ffd700',
                            Math.random() * 4 + 2,
                            0.06
                        ));
                    }
                }
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Pad background
        ctx.fillStyle = 'rgba(0, 242, 254, 0.18)';
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 12;
        ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

        // Animated neon forward speed chevrons
        const chevronCount = 3;
        const spacing = this.w / (chevronCount + 1);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const offset = (Math.sin(this.pulseTimer) * 4);
        for (let i = 0; i < chevronCount; i++) {
            const cx = -this.w / 2 + (i + 1) * spacing + offset;
            ctx.beginPath();
            ctx.moveTo(cx - 8, -this.h * 0.35);
            ctx.lineTo(cx + 6, 0);
            ctx.lineTo(cx - 8, this.h * 0.35);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class TrackItemPod {
    constructor(x, y, radius = 18) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.active = true;
        this.cooldownTimer = 0;
        this.rotationAngle = 0;
        this.floatOffset = 0;
    }

    update(dt) {
        this.rotationAngle += dt * 2.2;
        this.floatOffset = Math.sin(this.rotationAngle * 1.5) * 4;

        if (!this.active) {
            this.cooldownTimer -= dt;
            if (this.cooldownTimer <= 0) {
                this.active = true;
                this.cooldownTimer = 0;
            }
        }
    }

    checkPickup(ship, game) {
        if (!this.active || !ship || ship.hp <= 0) return false;
        const scx = ship.x + ship.width / 2;
        const scy = ship.y + ship.height / 2;

        if (Math.hypot(scx - this.x, scy - this.y) <= this.radius + ship.width / 2) {
            this.active = false;
            this.cooldownTimer = 9.0; // 9s respawn time for fair sparse item distribution

            // Curated racing powerup pool
            const racePowerUps = ['SPEED', 'GRENADE', 'LASER', 'STASIS', 'SHIELD', 'RING_OF_FIRE', 'MINE'];
            const chosen = racePowerUps[Math.floor(Math.random() * racePowerUps.length)];

            if (chosen === 'SPEED') {
                ship.speedBoostTimer = 6.0;
            } else if (chosen === 'GRENADE') {
                ship.grenadeAmmo = (ship.grenadeAmmo || 0) + 3;
            } else if (chosen === 'LASER') {
                ship.laserAmmo = (ship.laserAmmo || 0) + 4;
            } else if (chosen === 'STASIS') {
                ship.stasisAmmo = (ship.stasisAmmo || 0) + 3;
            } else if (chosen === 'SHIELD') {
                ship.shieldHp = Math.min(20, ship.shieldHp + 10);
                ship.shieldTimer = 15.0;
            } else if (chosen === 'RING_OF_FIRE') {
                ship.ringOfFireAmmo = (ship.ringOfFireAmmo || 0) + 2;
            } else if (chosen === 'MINE') {
                ship.mineAmmo = (ship.mineAmmo || 0) + 2;
            }

            if (game.soundFx) game.soundFx.playPowerUp();

            // Item pickup burst particles
            if (game.particles) {
                for (let i = 0; i < 18; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 200 + 50;
                    game.particles.push(new Particle(
                        this.x, this.y,
                        Math.cos(a) * spd, Math.sin(a) * spd,
                        i % 2 === 0 ? '#ffd700' : '#c77dff',
                        Math.random() * 4 + 2,
                        0.07
                    ));
                }
            }

            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        const drawY = this.y + this.floatOffset;

        if (this.active) {
            // Glowing Hologram Pod Box
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 16;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;

            ctx.save();
            ctx.translate(this.x, drawY);
            ctx.rotate(this.rotationAngle);

            ctx.fillStyle = 'rgba(255, 215, 0, 0.22)';
            ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

            // Inner Question / Diamond Glyph
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', 0, 0);
            ctx.restore();

            // Ground beacon ring
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + 16, this.radius * 1.2, this.radius * 0.45, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

        } else {
            // Inactive cooldown hologram wireframe
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - this.radius, drawY - this.radius, this.radius * 2, this.radius * 2);

            // Cooldown progress ring
            const pct = 1 - (this.cooldownTimer / 9.0);
            ctx.beginPath();
            ctx.arc(this.x, drawY, this.radius * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

class RaceTrack {
    constructor(stageNum = 1, game = null) {
        this.stage = stageNum;
        this.game = game;
        this.name = '';
        this.subtitle = '';
        this.totalLaps = 3;
        this.checkpoints = [];
        this.boostPads = [];
        this.itemPods = [];
        this.obstacles = [];
        this.crushers = [];
        this.slidingDoors = [];
        this.stealthNebulae = [];
        this.bases = [];
        this.gridSlots = [];
        this.trackSurface = null;
        this.finishOrder = [];
        this.raceOver = false;

        this.setupStage(stageNum, game);
    }

    setupStage(stageNum, game) {
        this.stage = stageNum;
        this.checkpoints = [];
        this.boostPads = [];
        this.itemPods = [];
        this.obstacles = [];
        this.crushers = [];
        this.slidingDoors = [];
        this.stealthNebulae = [];
        this.bases = [];
        this.finishOrder = [];
        this.raceOver = false;

        const cw = (game && game.logicalWidth) ? game.logicalWidth : 1200;
        const ch = (game && game.logicalHeight) ? game.logicalHeight : 750;

        // Base Circuit Dimensions (Clockwise flow: Bottom straight East->West, Left curve South->North, Top straight West->East, Right curve North->South)
        // Outer boundaries
        const wallThick = 20;
        this.obstacles.push(new Obstacle(40, 40, cw - 80, wallThick)); // Top wall
        this.obstacles.push(new Obstacle(40, ch - 40 - wallThick, cw - 80, wallThick)); // Bottom wall
        this.obstacles.push(new Obstacle(40, 40, wallThick, ch - 80)); // Left wall
        this.obstacles.push(new Obstacle(cw - 40 - wallThick, 40, wallThick, ch - 80)); // Right wall

        if (stageNum === 1) {
            // ==========================================================
            // STAGE 1: NEON SPEEDWAY (High-Speed Open Circuit)
            // ==========================================================
            this.name = 'STAGE 1: NEON SPEEDWAY';
            this.subtitle = 'Flowing High-Speed Proving Grounds (3 Laps)';

            // Infield central barrier island
            this.obstacles.push(new Obstacle(240, 220, cw - 480, ch - 440));

            // Checkpoints (8 gates dividing the circuit evenly)
            this.checkpoints = [
                { id: 0, cx: 600, cy: ch - 120, x1: 600, y1: ch - 220, x2: 600, y2: ch - 60, dir: Math.PI, name: 'START / FINISH' },
                { id: 1, cx: 320, cy: ch - 120, x1: 320, y1: ch - 220, x2: 320, y2: ch - 60, dir: Math.PI, name: 'TURN 1 ENTRY' },
                { id: 2, cx: 140, cy: ch * 0.5, x1: 60, y1: ch * 0.5, x2: 240, y2: ch * 0.5, dir: -Math.PI / 2, name: 'TURN 1 APEX' },
                { id: 3, cx: 320, cy: 120, x1: 320, y1: 60, x2: 320, y2: 220, dir: 0, name: 'TURN 1 EXIT' },
                { id: 4, cx: 600, cy: 120, x1: 600, y1: 60, x2: 600, y2: 220, dir: 0, name: 'BACK STRAIGHT' },
                { id: 5, cx: 880, cy: 120, x1: 880, y1: 60, x2: 880, y2: 220, dir: 0, name: 'TURN 2 ENTRY' },
                { id: 6, cx: cw - 140, cy: ch * 0.5, x1: cw - 240, y1: ch * 0.5, x2: cw - 60, y2: ch * 0.5, dir: Math.PI / 2, name: 'TURN 2 APEX' },
                { id: 7, cx: 880, cy: ch - 120, x1: 880, y1: ch - 220, x2: 880, y2: ch - 60, dir: Math.PI, name: 'FINAL CHICANE' }
            ];

            // 2 High-speed boost strips
            this.boostPads.push(new BoostPad(500, 120, 90, 48, 0, 'Top Turbo'));
            this.boostPads.push(new BoostPad(750, ch - 120, 90, 48, Math.PI, 'Main Turbo'));

            // 2 Strategic item pods
            this.itemPods.push(new TrackItemPod(140, ch * 0.5));
            this.itemPods.push(new TrackItemPod(cw - 140, ch * 0.5));

        } else if (stageNum === 2) {
            // ==========================================================
            // STAGE 2: PNEUMATIC GAUNTLET (Sliding Blast Doors & Chicane)
            // ==========================================================
            this.name = 'STAGE 2: PNEUMATIC GAUNTLET';
            this.subtitle = 'Timed Blast Doors & Hydraulic Crusher (3 Laps)';

            // Infield with split corridors
            this.obstacles.push(new Obstacle(240, 220, 280, ch - 440));
            this.obstacles.push(new Obstacle(680, 220, 280, ch - 440));

            // Central chicane partition with timed sliding doors
            const door1 = new SlidingDoor(560, 60, 40, 160, 3.8, 2.4, false);
            this.slidingDoors.push(door1);
            this.obstacles.push(door1);

            const door2 = new SlidingDoor(600, 220, 40, ch - 440, 4.0, 2.5, false);
            this.slidingDoors.push(door2);
            this.obstacles.push(door2);

            // Hydraulic Crusher Trap in alternative bottom apex
            this.crushers.push(new CrusherTrap(550, ch - 180, 100, 100));

            // Checkpoints
            this.checkpoints = [
                { id: 0, cx: 600, cy: ch - 120, x1: 600, y1: ch - 220, x2: 600, y2: ch - 60, dir: Math.PI, name: 'START / FINISH' },
                { id: 1, cx: 320, cy: ch - 120, x1: 320, y1: ch - 220, x2: 320, y2: ch - 60, dir: Math.PI, name: 'CRUSHER BYPASS' },
                { id: 2, cx: 140, cy: ch * 0.5, x1: 60, y1: ch * 0.5, x2: 240, y2: ch * 0.5, dir: -Math.PI / 2, name: 'TURN 1' },
                { id: 3, cx: 320, cy: 120, x1: 320, y1: 60, x2: 320, y2: 220, dir: 0, name: 'DOOR SECTOR IN' },
                { id: 4, cx: 600, cy: 120, x1: 600, y1: 60, x2: 600, y2: 220, dir: 0, name: 'PNEUMATIC GATE' },
                { id: 5, cx: 880, cy: 120, x1: 880, y1: 60, x2: 880, y2: 220, dir: 0, name: 'DOOR SECTOR OUT' },
                { id: 6, cx: cw - 140, cy: ch * 0.5, x1: cw - 240, y1: ch * 0.5, x2: cw - 60, y2: ch * 0.5, dir: Math.PI / 2, name: 'TURN 2' },
                { id: 7, cx: 880, cy: ch - 120, x1: 880, y1: ch - 220, x2: 880, y2: ch - 60, dir: Math.PI, name: 'FRONT STRAIGHT' }
            ];

            this.boostPads.push(new BoostPad(460, 120, 85, 45, 0, 'Blast Boost'));
            this.boostPads.push(new BoostPad(780, ch - 120, 85, 45, Math.PI, 'Chicane Boost'));

            this.itemPods.push(new TrackItemPod(140, ch * 0.5));
            this.itemPods.push(new TrackItemPod(cw - 140, ch * 0.5));

        } else if (stageNum === 3) {
            // ==========================================================
            // STAGE 3: NEBULA DRIFT (Stealth Storm & Gravitational Slingshot)
            // ==========================================================
            this.name = 'STAGE 3: NEBULA DRIFT';
            this.subtitle = 'Radar Storm & Black Hole Gravity Slingshot (3 Laps)';

            // Two circular infield dividers
            this.obstacles.push(new Obstacle(240, 220, 260, ch - 440));
            this.obstacles.push(new Obstacle(700, 220, 260, ch - 440));

            // Central Black Hole slingshot in the middle corridor!
            if (typeof BlackHole !== 'undefined') {
                game.blackHoles = [new BlackHole(600, ch * 0.5, 38)];
            }

            // Flanking Stealth Nebulae hiding Turn 1 and Turn 2 hairpins!
            if (typeof StealthNebula !== 'undefined') {
                this.stealthNebulae.push(new StealthNebula(150, ch * 0.5, 140));
                this.stealthNebulae.push(new StealthNebula(cw - 150, ch * 0.5, 140));
            }

            this.checkpoints = [
                { id: 0, cx: 600, cy: ch - 120, x1: 600, y1: ch - 220, x2: 600, y2: ch - 60, dir: Math.PI, name: 'START / FINISH' },
                { id: 1, cx: 320, cy: ch - 120, x1: 320, y1: ch - 220, x2: 320, y2: ch - 60, dir: Math.PI, name: 'NEBULA 1 ENTRY' },
                { id: 2, cx: 140, cy: ch * 0.5, x1: 60, y1: ch * 0.5, x2: 240, y2: ch * 0.5, dir: -Math.PI / 2, name: 'NEBULA 1 APEX' },
                { id: 3, cx: 320, cy: 120, x1: 320, y1: 60, x2: 320, y2: 220, dir: 0, name: 'NEBULA 1 EXIT' },
                { id: 4, cx: 600, cy: 120, x1: 600, y1: 60, x2: 600, y2: 220, dir: 0, name: 'VORTEX CREST' },
                { id: 5, cx: 880, cy: 120, x1: 880, y1: 60, x2: 880, y2: 220, dir: 0, name: 'NEBULA 2 ENTRY' },
                { id: 6, cx: cw - 140, cy: ch * 0.5, x1: cw - 240, y1: ch * 0.5, x2: cw - 60, y2: ch * 0.5, dir: Math.PI / 2, name: 'NEBULA 2 APEX' },
                { id: 7, cx: 880, cy: ch - 120, x1: 880, y1: ch - 220, x2: 880, y2: ch - 60, dir: Math.PI, name: 'HOME STRETCH' }
            ];

            this.boostPads.push(new BoostPad(460, 120, 90, 48, 0, 'Storm Warp'));
            this.boostPads.push(new BoostPad(760, ch - 120, 90, 48, Math.PI, 'Slingshot Boost'));

            this.itemPods.push(new TrackItemPod(140, ch * 0.5));
            this.itemPods.push(new TrackItemPod(cw - 140, ch * 0.5));
            this.itemPods.push(new TrackItemPod(600, 120));

        } else if (stageNum === 4) {
            // ==========================================================
            // STAGE 4: LASER BARRIER SECTOR (Reflective Corridors & Pit Dock)
            // ==========================================================
            this.name = 'STAGE 4: LASER BARRIER SECTOR';
            this.subtitle = 'Ricochet Corridors & Starbase Pit Lane (3 Laps)';

            // Inner dividers lined with reflective purple walls
            this.obstacles.push(new Obstacle(240, 220, 300, 40));
            this.obstacles.push(new Obstacle(240, ch - 260, 300, 40));
            this.obstacles.push(new Obstacle(660, 220, 300, 40));
            this.obstacles.push(new Obstacle(660, ch - 260, 300, 40));

            // Center partition separating front straight from Pit Lane!
            this.obstacles.push(new Obstacle(480, ch - 170, 240, 20));

            // Pit Lane / Repair Dock along the inside bottom lane!
            if (typeof RepairBase !== 'undefined') {
                this.bases.push(new RepairBase(600, ch - 215, 65, 'NEUTRAL', 'PIT DOCK'));
            }

            this.checkpoints = [
                { id: 0, cx: 600, cy: ch - 105, x1: 600, y1: ch - 170, x2: 600, y2: ch - 60, dir: Math.PI, name: 'START / FINISH' },
                { id: 1, cx: 320, cy: ch - 120, x1: 320, y1: ch - 220, x2: 320, y2: ch - 60, dir: Math.PI, name: 'SECTOR 1 IN' },
                { id: 2, cx: 140, cy: ch * 0.5, x1: 60, y1: ch * 0.5, x2: 240, y2: ch * 0.5, dir: -Math.PI / 2, name: 'LASER APEX 1' },
                { id: 3, cx: 320, cy: 120, x1: 320, y1: 60, x2: 320, y2: 220, dir: 0, name: 'TOP MIRROR LANE' },
                { id: 4, cx: 600, cy: 120, x1: 600, y1: 60, x2: 600, y2: 220, dir: 0, name: 'RICOCHET CHUTE' },
                { id: 5, cx: 880, cy: 120, x1: 880, y1: 60, x2: 880, y2: 220, dir: 0, name: 'SECTOR 2 IN' },
                { id: 6, cx: cw - 140, cy: ch * 0.5, x1: cw - 240, y1: ch * 0.5, x2: cw - 60, y2: ch * 0.5, dir: Math.PI / 2, name: 'LASER APEX 2' },
                { id: 7, cx: 880, cy: ch - 120, x1: 880, y1: ch - 220, x2: 880, y2: ch - 60, dir: Math.PI, name: 'PIT LANE FORK' }
            ];

            this.boostPads.push(new BoostPad(460, 120, 85, 45, 0, 'Laser Boost'));
            this.boostPads.push(new BoostPad(800, ch - 105, 85, 45, Math.PI, 'Main Boost'));

            this.itemPods.push(new TrackItemPod(140, ch * 0.5));
            this.itemPods.push(new TrackItemPod(cw - 140, ch * 0.5));

        } else {
            // ==========================================================
            // STAGE 5: SPACETIME HYPER-LABYRINTH (Championship Grand Prix)
            // ==========================================================
            this.name = 'STAGE 5: SPACETIME LABYRINTH';
            this.subtitle = 'Grand Prix Master Circuit (Dynamic Shifting Sectors)';

            // Labyrinth blocks in infield
            this.obstacles.push(new Obstacle(260, 220, 160, 120));
            this.obstacles.push(new Obstacle(cw - 420, 220, 160, 120));
            this.obstacles.push(new Obstacle(260, ch - 340, 160, 120));
            this.obstacles.push(new Obstacle(cw - 420, ch - 340, 160, 120));

            // Central Dynamic Spacetime Labyrinth Engine
            if (typeof SpacetimeLabyrinthSystem !== 'undefined') {
                game.labyrinthSystem = new SpacetimeLabyrinthSystem(cw, ch);
            }

            // Ring of Fire perimeter hazard in Sector 3 hairpin
            if (typeof RingOfFireHazard !== 'undefined') {
                this.obstacles.push(new Obstacle(cw * 0.5 - 20, 200, 40, 100));
            }

            this.checkpoints = [
                { id: 0, cx: 600, cy: ch - 120, x1: 600, y1: ch - 220, x2: 600, y2: ch - 60, dir: Math.PI, name: 'START / FINISH' },
                { id: 1, cx: 320, cy: ch - 120, x1: 320, y1: ch - 220, x2: 320, y2: ch - 60, dir: Math.PI, name: 'LABYRINTH SECTOR 1' },
                { id: 2, cx: 140, cy: ch * 0.5, x1: 60, y1: ch * 0.5, x2: 240, y2: ch * 0.5, dir: -Math.PI / 2, name: 'WARP TURN 1' },
                { id: 3, cx: 320, cy: 120, x1: 320, y1: 60, x2: 320, y2: 220, dir: 0, name: 'WARP CREST' },
                { id: 4, cx: 600, cy: 120, x1: 600, y1: 60, x2: 600, y2: 220, dir: 0, name: 'DYNAMIC SHIFT ZONE' },
                { id: 5, cx: 880, cy: 120, x1: 880, y1: 60, x2: 880, y2: 220, dir: 0, name: 'HYPER CHICANE' },
                { id: 6, cx: cw - 140, cy: ch * 0.5, x1: cw - 240, y1: ch * 0.5, x2: cw - 60, y2: ch * 0.5, dir: Math.PI / 2, name: 'WARP TURN 2' },
                { id: 7, cx: 880, cy: ch - 120, x1: 880, y1: ch - 220, x2: 880, y2: ch - 60, dir: Math.PI, name: 'CHAMPIONSHIP SPRINT' }
            ];

            this.boostPads.push(new BoostPad(460, 120, 90, 48, 0, 'Hyper Turbo 1'));
            this.boostPads.push(new BoostPad(760, ch - 120, 90, 48, Math.PI, 'Hyper Turbo 2'));
            this.boostPads.push(new BoostPad(cw - 140, 240, 48, 90, Math.PI / 2, 'Hairpin Boost'));

            this.itemPods.push(new TrackItemPod(140, ch * 0.5));
            this.itemPods.push(new TrackItemPod(cw - 140, ch * 0.5));
            this.itemPods.push(new TrackItemPod(600, 120));
        }

        // Staggered Starting Grid behind Checkpoint 0 (heading West, Math.PI)
        const cp0 = this.checkpoints[0];
        const gridStartX = cp0.cx + 80;
        const gridLane1Y = cp0.cy - 30;
        const gridLane2Y = cp0.cy + 30;

        this.gridSlots = [
            { x: gridStartX, y: gridLane1Y, angle: Math.PI, label: 'P1 (Pole)' },
            { x: gridStartX, y: gridLane2Y, angle: Math.PI, label: 'P2' },
            { x: gridStartX + 90, y: gridLane1Y, angle: Math.PI, label: 'P3' },
            { x: gridStartX + 90, y: gridLane2Y, angle: Math.PI, label: 'P4' }
        ];

        // Apply obstacles to game world
        if (game) {
            game.obstacles = this.obstacles;
            game.crushers = this.crushers;
            game.slidingDoors = this.slidingDoors;
            game.stealthNebulae = this.stealthNebulae;
            game.bases = this.bases;
        }
    }

    getNextCheckpointForShip(ship) {
        if (!ship || !this.checkpoints || this.checkpoints.length === 0) return null;
        const idx = ship.raceCheckpointIndex || 0;
        return this.checkpoints[idx % this.checkpoints.length];
    }

    update(dt, game) {
        // 1. Update interactive track elements
        for (const pad of this.boostPads) pad.update(dt);
        for (const pod of this.itemPods) pod.update(dt);

        const allShips = game.getAllShips ? game.getAllShips() : [game.p1, game.p2];

        // 2. Process check collisions, checkpoints, and drafting for each ship
        for (const ship of allShips) {
            if (!ship) continue;

            // Initialize race properties if needed
            if (ship.raceLap === undefined) ship.raceLap = 1;
            if (ship.raceCheckpointIndex === undefined) ship.raceCheckpointIndex = 0;
            if (ship.raceBoostTimer === undefined) ship.raceBoostTimer = 0;
            if (ship.raceDrafting === undefined) ship.raceDrafting = false;
            if (ship.raceFinished === undefined) ship.raceFinished = false;

            // Track boost decay
            if (ship.raceBoostTimer > 0) {
                ship.raceBoostTimer -= dt;
                // Emit turbo trails
                if (game.particles && Math.random() < 0.6) {
                    const cx = ship.x + ship.width / 2;
                    const cy = ship.y + ship.height / 2;
                    const bAngle = ship.turretAngle + Math.PI + (Math.random() - 0.5) * 0.4;
                    game.particles.push(new Particle(
                        cx, cy,
                        Math.cos(bAngle) * 260, Math.sin(bAngle) * 260,
                        '#00f2fe', Math.random() * 3 + 2, 0.05
                    ));
                }
            }

            // Check if ship is alive
            if (ship.hp > 0) {
                // Check boost pads
                for (const pad of this.boostPads) {
                    pad.checkCollision(ship, game);
                }

                // Check item pods
                for (const pod of this.itemPods) {
                    pod.checkPickup(ship, game);
                }

                // Checkpoint crossing detection
                const scx = ship.x + ship.width / 2;
                const scy = ship.y + ship.height / 2;
                const targetCp = this.checkpoints[ship.raceCheckpointIndex];

                if (targetCp) {
                    // Check if within gate radius (gate line segment distance)
                    const distToCp = Math.hypot(scx - targetCp.cx, scy - targetCp.cy);
                    if (distToCp < 95) {
                        // Crossed Start/Finish Line (CP 0)?
                        if (targetCp.id === 0) {
                            ship.raceLap++;
                            if (game.soundFx && game.soundFx.playCheckpoint) {
                                game.soundFx.playCheckpoint();
                            } else if (game.soundFx && game.soundFx.playFlagPickup) {
                                game.soundFx.playFlagPickup();
                            }

                            // Finished Race?
                            if (ship.raceLap > this.totalLaps && !ship.raceFinished) {
                                ship.raceFinished = true;
                                ship.raceFinishTime = game.raceElapsedTime || 0;
                                this.finishOrder.push(ship);
                                if (game.recordRaceFinish) game.recordRaceFinish(ship);
                            }
                        }

                        // Advanced to next checkpoint!
                        ship.raceCheckpointIndex = (ship.raceCheckpointIndex + 1) % this.checkpoints.length;
                        ship.lastValidTrackX = targetCp.cx;
                        ship.lastValidTrackY = targetCp.cy;
                        ship.lastValidTrackAngle = targetCp.dir;
                    }
                }

                // Update continuous track waypoint for clean 1s respawn
                ship.lastValidTrackX = scx;
                ship.lastValidTrackY = scy;
                ship.lastValidTrackAngle = ship.turretAngle;

            } else {
                // ==============================================================
                // RAPID 1.0-SECOND TRACK RESPAWN (User Requested Specification)
                // ==============================================================
                ship.respawnTimer -= dt;
                if (ship.respawnTimer <= 0) {
                    ship.hp = ship.maxHp;
                    // Respawn where destroyed / last track waypoint
                    const rx = ship.lastValidTrackX || 600;
                    const ry = ship.lastValidTrackY || (game.logicalHeight - 120);
                    const rAngle = ship.lastValidTrackAngle || Math.PI;

                    ship.x = rx - ship.width / 2;
                    ship.y = ry - ship.height / 2;
                    ship.vx = Math.cos(rAngle) * 180; // Forward impulse out of respawn
                    ship.vy = Math.sin(rAngle) * 180;
                    ship.turretAngle = rAngle;
                    ship.invulnerableTimer = 1.5; // Brief invulnerability shield
                    ship.respawnTimer = 1.0;
                    ship.pushOutFromObstacles(game.obstacles);

                    if (game.soundFx) game.soundFx.playPlayerResurrect();

                    // Warp respawn flash particles
                    if (game.particles) {
                        for (let i = 0; i < 24; i++) {
                            const a = Math.random() * Math.PI * 2;
                            const spd = Math.random() * 260 + 60;
                            game.particles.push(new Particle(
                                rx, ry,
                                Math.cos(a) * spd, Math.sin(a) * spd,
                                '#00f2fe', Math.random() * 5 + 2, 0.08
                            ));
                        }
                    }
                }
            }

            // Real-time progress score (Laps * 100,000 + CP * 10,000 - distToNext)
            const curCp = this.checkpoints[ship.raceCheckpointIndex || 0];
            const dist = curCp ? Math.hypot((ship.x + ship.width / 2) - curCp.cx, (ship.y + ship.height / 2) - curCp.cy) : 999;
            ship.raceProgress = (ship.raceLap * 100000) + ((ship.raceCheckpointIndex || 0) * 10000) - dist;
        }

        // 3. Slipstream / Drafting Mechanic
        for (const shipA of allShips) {
            if (!shipA || shipA.hp <= 0) continue;
            shipA.raceDrafting = false;
            const acx = shipA.x + shipA.width / 2;
            const acy = shipA.y + shipA.height / 2;

            for (const shipB of allShips) {
                if (!shipB || shipB.hp <= 0 || shipB.id === shipA.id) continue;
                const bcx = shipB.x + shipB.width / 2;
                const bcy = shipB.y + shipB.height / 2;

                const dist = Math.hypot(acx - bcx, acy - bcy);
                if (dist > 35 && dist < 120) {
                    // Check if A is behind B along B's direction
                    const bHeadingX = Math.cos(shipB.turretAngle);
                    const bHeadingY = Math.sin(shipB.turretAngle);
                    const toAx = acx - bcx;
                    const toAy = acy - bcy;

                    // Dot product should be negative (A is behind B)
                    const dot = (toAx * bHeadingX + toAy * bHeadingY) / dist;
                    if (dot < -0.75) {
                        shipA.raceDrafting = true;
                        // Give +15% draft acceleration
                        shipA.vx += bHeadingX * 160 * dt;
                        shipA.vy += bHeadingY * 160 * dt;

                        // Visual slipstream trail
                        if (game.particles && Math.random() < 0.4) {
                            game.particles.push(new Particle(
                                (acx + bcx) / 2 + (Math.random() - 0.5) * 10,
                                (acy + bcy) / 2 + (Math.random() - 0.5) * 10,
                                bHeadingX * 80, bHeadingY * 80,
                                '#4facfe', 2.5, 0.05
                            ));
                        }
                        break;
                    }
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // 1. Draw Track Surface Base
        const cw = (this.game && this.game.logicalWidth) ? this.game.logicalWidth : 1200;
        const ch = (this.game && this.game.logicalHeight) ? this.game.logicalHeight : 750;

        ctx.fillStyle = '#060a17';
        ctx.fillRect(40, 40, cw - 80, ch - 80);

        // Track roadway strip
        ctx.fillStyle = 'rgba(14, 20, 42, 0.9)';
        ctx.fillRect(60, 60, cw - 120, ch - 120);

        // Glowing neon track edge kerbs
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.strokeRect(60, 60, cw - 120, ch - 120);

        // 2. Draw Start/Finish Line (Checkpoint 0)
        const cp0 = this.checkpoints[0];
        if (cp0) {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.setLineDash([8, 8]); // Checkered pattern
            ctx.beginPath();
            ctx.moveTo(cp0.x1, cp0.y1);
            ctx.lineTo(cp0.x2, cp0.y2);
            ctx.stroke();

            // Finish Line Neon Gantry Arch
            ctx.setLineDash([]);
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.strokeRect(cp0.cx - 16, Math.min(cp0.y1, cp0.y2), 32, Math.abs(cp0.y2 - cp0.y1));

            ctx.fillStyle = '#ffd700';
            ctx.font = '900 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('FINISH', cp0.cx, Math.min(cp0.y1, cp0.y2) - 6);
            ctx.restore();
        }

        // 3. Draw Checkpoint Directional Chevrons
        for (let i = 1; i < this.checkpoints.length; i++) {
            const cp = this.checkpoints[i];
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(cp.x1, cp.y1);
            ctx.lineTo(cp.x2, cp.y2);
            ctx.stroke();
            ctx.restore();
        }

        // 4. Draw Boost Pads
        for (const pad of this.boostPads) {
            pad.draw(ctx);
        }

        // 5. Draw Track Item Pods
        for (const pod of this.itemPods) {
            pod.draw(ctx);
        }

        ctx.restore();
    }

    getStandings(game) {
        const allShips = game.getAllShips ? game.getAllShips() : [game.p1, game.p2];
        return [...allShips].filter(s => s != null).sort((a, b) => (b.raceProgress || 0) - (a.raceProgress || 0));
    }

    drawOverlays(ctx, game) {
        ctx.save();
        // Rank ships by raceProgress to get 1st, 2nd, 3rd, 4th
        const sorted = this.getStandings(game);

        // Draw position badge floating above each active ship
        for (let i = 0; i < sorted.length; i++) {
            const ship = sorted[i];
            const rankLabel = (i === 0) ? '1st' : (i === 1 ? '2nd' : (i === 2 ? '3rd' : '4th'));
            const rankColor = (i === 0) ? '#ffd700' : (i === 1 ? '#00f2fe' : (i === 2 ? '#ff007f' : '#a855f7'));

            const scx = ship.x + ship.width / 2;
            const scy = ship.y - 12;

            if (ship.hp > 0) {
                // Position tag pill
                ctx.save();
                ctx.fillStyle = 'rgba(5, 10, 25, 0.85)';
                ctx.strokeStyle = rankColor;
                ctx.lineWidth = 1.5;
                ctx.shadowColor = rankColor;
                ctx.shadowBlur = 8;

                const tagW = 34;
                const tagH = 15;
                ctx.beginPath();
                ctx.roundRect(scx - tagW / 2, scy - tagH, tagW, tagH, 4);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(rankLabel, scx, scy - tagH / 2);

                // Slipstream drafting indicator
                if (ship.raceDrafting) {
                    ctx.fillStyle = '#00f2fe';
                    ctx.font = 'bold 8px monospace';
                    ctx.fillText('DRAFT', scx, scy - tagH - 5);
                }
                ctx.restore();

            } else {
                // 1.0-Second Rapid Respawn Holographic Marker
                ctx.save();
                const rx = ship.lastValidTrackX || scx;
                const ry = ship.lastValidTrackY || scy;

                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(rx, ry, 24, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                const timeRem = Math.max(0, ship.respawnTimer || 0).toFixed(1);
                ctx.fillText(`WARP ${timeRem}s`, rx, ry - 30);
                ctx.restore();
            }
        }

        ctx.restore();
    }
}
