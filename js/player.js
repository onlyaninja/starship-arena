/**
 * ============================================================================
 * Starship Arena - Player & Starship Engine (Player)
 * ============================================================================
 * Description:
 *   Core combat starship entity supporting both human pilots and autonomous AI bots.
 *   Implements 6-DOF inertial starship physics (forward thrust, reverse thrusters,
 *   lateral strafing left/right, and rotational steering), weapon systems,
 *   power-up management (shields, rotating blades, speed boosts, minelaying,
 *   evaporation beams, tractor lassos), damage mitigation, and audio lifecycle handling.
 *
 * Responsibilities:
 *   - 6-DOF flight dynamics with rotation and strafe vectors for both humans & AIs.
 *   - Support for both "MODERN" 6-DOF controls and "CLASSIC" cardinal controls.
 *   - Rotating Blade aura: Slicing energy scythes orbiting the ship.
 *   - Ballistic weapons firing, Mega-Blast charge meter, and cooldown timers.
 *   - Health regeneration, shield overshields, stasis freezes, and teleportation.
 *   - Audio bug elimination: Immediate charge oscillator termination upon ship destruction.
 *   - Vector starship rendering for Aegis Viper (P1) and Phantom Striker (P2).
 * ============================================================================
 */

class Player {
    constructor(id, x, y, primaryColor, secondaryColor, defaultAngle, baseHp = 5, isAI = false, team = 'NONE', aiName = '') {
        this.id = id;
        this.isAI = isAI;
        this.team = team;
        this.aiName = aiName;
        this.aiController = isAI ? new AIController(this) : null;

        // Virtual input state for human/AI parity
        this.virtualForward = false;
        this.virtualReverse = false;
        this.virtualStrafeLeft = false;
        this.virtualStrafeRight = false;
        this.virtualRotateLeft = false;
        this.virtualRotateRight = false;
        this.virtualFirePressed = false;
        this.virtualLaserPressed = false;
        this.virtualFreezePressed = false;

        this.invulnerableTimer = 0;
        this.respawnTimer = 0;
        this.width = 44;
        this.height = 44;
        this.x = x - this.width / 2;
        this.y = y - this.height / 2;

        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;

        // Inertial Physics
        this.vx = 0;
        this.vy = 0;
        this.maxSpeed = 500;
        this.acceleration = 2860;
        this.friction = 0.84;
        this.turnSpeed = 2.4; // Radians per second for rotational steering (half as fast for precision)
        this.turretAngle = defaultAngle;

        // Health & Regeneration
        this.maxHp = baseHp;
        this.hp = baseHp;
        this.regenTimer = 0;
        this.regenInterval = 10.0;

        // Tactical Status Timers
        this.shieldHp = 0;
        this.shieldTimer = 0;
        this.freezeTimer = 0;
        this.weaponBlockedTimer = 0;
        this.hasHeatSeeker = false;
        this.hasEvaporationBeam = false;
        this.hasTractorBeam = false;
        this.tractorCapturedTimer = 0;
        this.tractorCaptor = null;
        this.speedBoostTimer = 0;
        this.slowTimer = 0;
        this.mineLayerTimer = 0;
        this.mineDropTimer = 0;
        this.electricBlasterTimer = 0;
        this.electricFireCooldown = 0;
        this.blackHoleTrappedTimer = 0;
        this.grenadeTimer = 0;

        // Rotating Blade Power-Up
        this.bladeTimer = 0;
        this.bladeAngle = 0;
        this.bladeHitCooldowns = new Map();

        // Weapon Cooldowns & Mega-Blast Charging
        this.fireCooldown = 0;
        this.laserCooldown = 0;
        this.freezeCooldown = 0;
        this.laserAmmo = 0; // Auxiliary powerup ammo (Laser Inhibitor)
        this.immobilizerAmmo = 0; // Auxiliary powerup ammo (Stasis Immobilizer)
        this.isCharging = false;
        this.chargeTimer = 0;
        this.maxChargeTime = 1.0;
        this.wasFirePressed = false;
        this.flashTimer = 0;
        this.capturedFlag = null;

        // Ship Chassis & New Power-Ups
        this.chassis = (id === 'P1') ? (typeof localStorage !== 'undefined' && localStorage.getItem('starship_p1_chassis') || 'VIPER') : (typeof localStorage !== 'undefined' && localStorage.getItem('starship_p2_chassis') || 'CRUISER');
        this.quadGunTimer = 0;
        this.hasRingOfFire = false;
    }

    setChassis(chassisName) {
        this.chassis = chassisName;
        if (typeof localStorage !== 'undefined') {
            const key = (this.id === 'P1') ? 'starship_p1_chassis' : 'starship_p2_chassis';
            localStorage.setItem(key, chassisName);
        }
    }

    triggerSelfDestruct(game) {
        if (this.hp <= 0) return;
        this.hp = 0;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        if (game.soundFx) {
            game.soundFx.playWhompExplosion();
            if (game.soundFx.playExplosion) game.soundFx.playExplosion();
        }

        // Screen Shake Tremor for visceral game feel
        if (game) {
            game.screenShake = 0.75;
        }

        // Multi-tier chromatic thermal shockwaves
        if (game.shockwaves) {
            game.shockwaves.push(new ShockwaveRing(cx, cy, 200, '#ffffff', 0.65));
            game.shockwaves.push(new ShockwaveRing(cx, cy, 160, '#ff7b00', 0.55));
            game.shockwaves.push(new ShockwaveRing(cx, cy, 120, '#ff0055', 0.45));
            game.shockwaves.push(new ShockwaveRing(cx, cy, 70, '#ffd166', 0.35));
        }

        // 95+ high-velocity explosion debris, flame jets & dense smoke particles
        if (game.particles) {
            for (let i = 0; i < 95; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = Math.random() * 600 + 80;
                const pColor = (i % 5 === 0) ? '#ffffff' : ((i % 5 === 1) ? '#ffea00' : ((i % 5 === 2) ? '#ff7b00' : ((i % 5 === 3) ? '#ff0055' : '#c77dff')));
                game.particles.push(new Particle(
                    cx, cy,
                    Math.cos(a) * spd, Math.sin(a) * spd,
                    pColor,
                    Math.random() * 7 + 3,
                    0.09
                ));
            }
        }

        // Self-destruct blast damage: 20 damage within 40px, 8 mid (90px), 4 outer (160px)
        const allShips = game.getAllShips ? game.getAllShips() : [game.p1, game.p2];
        for (const ship of allShips) {
            if (!ship || ship.hp <= 0 || ship.id === this.id) continue;
            const scx = ship.x + ship.width / 2;
            const scy = ship.y + ship.height / 2;
            const dist = Math.hypot(scx - cx, scy - cy);
            if (dist <= 160) {
                const dmg = dist <= 40 ? 20 : (dist <= 90 ? 8 : 4);
                ship.takeDamage(dmg, game.particles, game.soundFx);
            }
        }

        // Damage nearby asteroids and detonate mines
        if (game.asteroids) {
            for (const ast of game.asteroids) {
                if (ast.destroyed) continue;
                const dist = Math.hypot(ast.x - cx, ast.y - cy);
                if (dist <= 40 + ast.radius) {
                    ast.disintegrate(game.particles, game.soundFx);
                } else if (dist <= 160 + ast.radius) {
                    ast.takeDamage(6, game.particles, game.soundFx, game.asteroids);
                }
            }
        }
        if (game.mines) {
            for (const mine of game.mines) {
                if (mine.exploded) continue;
                if (Math.hypot(mine.x - cx, mine.y - cy) <= 160) {
                    mine.detonate(game);
                }
            }
        }

        if (game.ui) game.ui.update();
        if (game.checkVictoryConditions) game.checkVictoryConditions();
    }

    pushOutFromObstacles(obstacles) {
        for (const obs of obstacles) {
            if (obs.collidesWithRect(this.x, this.y, this.width, this.height)) {
                const overlapLeft = (this.x + this.width) - obs.x;
                const overlapRight = (obs.x + obs.w) - this.x;
                const overlapTop = (this.y + this.height) - obs.y;
                const overlapBottom = (obs.y + obs.h) - this.y;

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                if (minOverlap === overlapLeft) this.x = obs.x - this.width - 3;
                else if (minOverlap === overlapRight) this.x = obs.x + obs.w + 3;
                else if (minOverlap === overlapTop) this.y = obs.y - this.height - 3;
                else if (minOverlap === overlapBottom) this.y = obs.y + obs.h + 3;

                this.vx = 0;
                this.vy = 0;
            }
        }
    }

    update(dt, input, boundsWidth, boundsHeight, enableTrail, particleSystem, obstacles = [], soundFx = null, mines = null, evaporationBeams = null, tractorBeams = null, opponent = null) {
        // Cooldown decrements
        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.laserCooldown > 0) this.laserCooldown -= dt;
        if (this.freezeCooldown > 0) this.freezeCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.grenadeTimer > 0) this.grenadeTimer -= dt;
        if (this.electricFireCooldown > 0) this.electricFireCooldown -= dt;
        if (this.quadGunTimer > 0) this.quadGunTimer -= dt;

        // Rotating Blade Timer & Orbit Spin
        if (this.bladeTimer > 0) {
            this.bladeTimer -= dt;
            this.bladeAngle += dt * 10;
            if (this.bladeTimer <= 0) this.bladeTimer = 0;

            // Decrement blade hit debounces
            for (const [targetId, t] of this.bladeHitCooldowns.entries()) {
                if (t <= dt) this.bladeHitCooldowns.delete(targetId);
                else this.bladeHitCooldowns.set(targetId, t - dt);
            }
        }

        if (this.tractorCapturedTimer > 0) {
            this.tractorCapturedTimer -= dt;
            this.vx = 0;
            this.vy = 0;
            if (this.tractorCapturedTimer <= 0) {
                this.tractorCapturedTimer = 0;
                this.tractorCaptor = null;
            }
        }

        if (this.mineLayerTimer > 0) {
            this.mineLayerTimer -= dt;
            if (this.mineLayerTimer <= 0) this.mineLayerTimer = 0;
        }

        if (this.electricBlasterTimer > 0) {
            this.electricBlasterTimer -= dt;
            if (this.electricBlasterTimer <= 0) this.electricBlasterTimer = 0;
        }

        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0 || this.shieldHp <= 0) {
                this.shieldTimer = 0;
                this.shieldHp = 0;
            }
        }

        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            if (this.speedBoostTimer <= 0) this.speedBoostTimer = 0;
        }

        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowTimer = 0;
        }

        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            this.vx = 0;
            this.vy = 0;
            if (this.freezeTimer <= 0) this.freezeTimer = 0;
        }

        if (this.weaponBlockedTimer > 0) {
            this.weaponBlockedTimer -= dt;
            if (this.weaponBlockedTimer <= 0) {
                this.weaponBlockedTimer = 0;
                this.hasHeatSeeker = true;
            }
        }

        // Ship Death Lifecycle Check & Audio Loop Fix
        if (this.hp <= 0) {
            if (this.isCharging) {
                this.isCharging = false;
                this.chargeTimer = 0;
                if (soundFx) soundFx.stopCharge(this.id);
            }
            this.virtualFirePressed = false;
            return null;
        }

        // Health Regeneration
        if (this.hp < this.maxHp) {
            this.regenTimer += dt;
            if (this.regenTimer >= this.regenInterval) {
                this.hp = Math.min(this.maxHp, this.hp + 1);
                this.regenTimer = 0;

                const cx = this.x + this.width / 2;
                const cy = this.y + this.height / 2;
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    particleSystem.push(new Particle(
                        cx, cy,
                        Math.cos(angle) * 120, Math.sin(angle) * 120,
                        '#2ec4b6', Math.random() * 5 + 3, 0.08
                    ));
                }
            }
        } else {
            this.regenTimer = 0;
        }

        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

        // Movement & Rotation Processing
        const scheme = (input && input.controlScheme) ? input.controlScheme : 'MODERN';

        if (this.freezeTimer <= 0) {
            // Read Inputs
            let fwd = false, rev = false, strLeft = false, strRight = false, rotLeft = false, rotRight = false;

            if (this.isAI && this.aiController) {
                if (window._currentGame) this.aiController.update(dt, window._currentGame);
                fwd = this.virtualForward;
                rev = this.virtualReverse;
                strLeft = this.virtualStrafeLeft;
                strRight = this.virtualStrafeRight;
                rotLeft = this.virtualRotateLeft;
                rotRight = this.virtualRotateRight;
            } else if (this.id === 'P1') {
                const isSolo = (window._currentGame && window._currentGame.playerCount === 1);
                fwd = input.isPressed('P1_FORWARD') || (isSolo && input.isPressed('P2_FORWARD'));
                rev = input.isPressed('P1_REVERSE') || (isSolo && input.isPressed('P2_REVERSE'));
                strLeft = input.isPressed('P1_STRAFE_LEFT') || (isSolo && input.isPressed('P2_STRAFE_LEFT'));
                strRight = input.isPressed('P1_STRAFE_RIGHT') || (isSolo && input.isPressed('P2_STRAFE_RIGHT'));
                rotLeft = input.isPressed('P1_ROTATE_LEFT') || (isSolo && input.isPressed('P2_ROTATE_LEFT'));
                rotRight = input.isPressed('P1_ROTATE_RIGHT') || (isSolo && input.isPressed('P2_ROTATE_RIGHT'));
            } else {
                fwd = input.isPressed('P2_FORWARD');
                rev = input.isPressed('P2_REVERSE');
                strLeft = input.isPressed('P2_STRAFE_LEFT');
                strRight = input.isPressed('P2_STRAFE_RIGHT');
                rotLeft = input.isPressed('P2_ROTATE_LEFT');
                rotRight = input.isPressed('P2_ROTATE_RIGHT');
            }

            const speedMult = (this.speedBoostTimer > 0) ? 1.5 : (this.slowTimer > 0 ? 0.5 : 1.0);
            const effectiveAccel = this.acceleration * speedMult;
            const effectiveMaxSpeed = this.maxSpeed * speedMult;

            if (scheme === 'MODERN') {
                // ==========================================
                // MODERN 6-DOF STARSHIP PHYSICS
                // ==========================================
                // 1. Rotational Steering
                if (rotLeft) this.turretAngle -= this.turnSpeed * dt;
                if (rotRight) this.turretAngle += this.turnSpeed * dt;

                // Normalize angle to [-PI, PI]
                while (this.turretAngle > Math.PI) this.turretAngle -= Math.PI * 2;
                while (this.turretAngle < -Math.PI) this.turretAngle += Math.PI * 2;

                // 2. Linear Thruster Vectors
                const hx = Math.cos(this.turretAngle);
                const hy = Math.sin(this.turretAngle);
                const sx = -hy; // Perpendicular strafe right
                const sy = hx;

                let accelX = 0;
                let accelY = 0;

                if (fwd) {
                    accelX += hx * effectiveAccel;
                    accelY += hy * effectiveAccel;
                }
                if (rev) {
                    accelX -= hx * (effectiveAccel * 0.75);
                    accelY -= hy * (effectiveAccel * 0.75);
                }
                if (strLeft) {
                    accelX -= sx * (effectiveAccel * 0.85);
                    accelY -= sy * (effectiveAccel * 0.85);
                }
                if (strRight) {
                    accelX += sx * (effectiveAccel * 0.85);
                    accelY += sy * (effectiveAccel * 0.85);
                }

                this.vx += accelX * dt;
                this.vy += accelY * dt;

            } else {
                // ==========================================
                // CLASSIC CARDINAL CONTROLS (ROLLBACK SCHEME)
                // ==========================================
                let moveX = 0;
                let moveY = 0;
                if (fwd) moveY -= 1;
                if (rev) moveY += 1;
                if (rotLeft) moveX -= 1;
                if (rotRight) moveX += 1;

                if (moveX !== 0 && moveY !== 0) {
                    const len = Math.hypot(moveX, moveY);
                    moveX /= len;
                    moveY /= len;
                }

                this.vx += moveX * effectiveAccel * dt;
                this.vy += moveY * effectiveAccel * dt;

                const curSpd = Math.hypot(this.vx, this.vy);
                if (curSpd > 20) {
                    this.turretAngle = Math.atan2(this.vy, this.vx);
                }
            }

            // Friction & Speed Clamping
            this.vx *= Math.pow(this.friction, dt * 60);
            this.vy *= Math.pow(this.friction, dt * 60);

            const currentSpeed = Math.hypot(this.vx, this.vy);
            if (currentSpeed > effectiveMaxSpeed) {
                this.vx = (this.vx / currentSpeed) * effectiveMaxSpeed;
                this.vy = (this.vy / currentSpeed) * effectiveMaxSpeed;
            }

            // Obstacle Collision & Resolution
            const prevX = this.x;
            this.x += this.vx * dt;
            for (const obs of obstacles) {
                if (obs.collidesWithRect(this.x, this.y, this.width, this.height)) {
                    this.x = prevX;
                    this.vx = 0;
                    break;
                }
            }

            const prevY = this.y;
            this.y += this.vy * dt;
            for (const obs of obstacles) {
                if (obs.collidesWithRect(this.x, this.y, this.width, this.height)) {
                    this.y = prevY;
                    this.vy = 0;
                    break;
                }
            }

            this.pushOutFromObstacles(obstacles);

            // Arena Boundaries
            if (this.x < 0) { this.x = 0; this.vx = 0; }
            if (this.x + this.width > boundsWidth) { this.x = boundsWidth - this.width; this.vx = 0; }
            if (this.y < 0) { this.y = 0; this.vy = 0; }
            if (this.y + this.height > boundsHeight) { this.y = boundsHeight - this.height; this.vy = 0; }

            // Particle Trails
            if (enableTrail && currentSpeed > 30 && Math.random() < 0.3) {
                const cx = this.x + this.width / 2;
                const cy = this.y + this.height / 2;
                particleSystem.push(new Particle(
                    cx, cy, 
                    -this.vx * 0.1, -this.vy * 0.1, 
                    this.primaryColor, 4, 0.08
                ));
            }

            // Minelayer auto-deploy behind tank
            // Allows dropping even at slow speeds to enable chain reaction clusters!
            if (this.mineLayerTimer > 0 && mines) {
                this.mineDropTimer -= dt;
                if (this.mineDropTimer <= 0) {
                    this.mineDropTimer = 1.1;
                    const cx = this.x + this.width / 2;
                    const cy = this.y + this.height / 2;
                    const dropX = cx - Math.cos(this.turretAngle) * 30;
                    const dropY = cy - Math.sin(this.turretAngle) * 30;
                    mines.push(new ProximityMine(dropX, dropY, this.id));
                    if (soundFx) soundFx.playMinePlant();
                }
            }
        }

        // Firing & Mega-Blast Charging Logic
        const isSolo = (window._currentGame && window._currentGame.playerCount === 1);
        const isFirePressed = this.isAI ? this.virtualFirePressed : ((this.id === 'P1') ? (input.isPressed('P1_FIRE') || (isSolo && input.isPressed('P2_FIRE'))) : input.isPressed('P2_FIRE'));
        let spawnedProjectile = null;

        if (isFirePressed) {
            if (this.freezeTimer > 0 || this.weaponBlockedTimer > 0) {
                this.isCharging = false;
                this.chargeTimer = 0;
                if (soundFx) soundFx.stopCharge(this.id);
            } else {
                if (this.hasEvaporationBeam) {
                    if (this.fireCooldown <= 0 && evaporationBeams) {
                        this.hasEvaporationBeam = false;
                        this.fireCooldown = 0.8;
                        this.isCharging = false;
                        this.chargeTimer = 0;
                        if (soundFx) {
                            soundFx.stopCharge(this.id);
                            soundFx.playEvaporationBeam();
                        }
                        evaporationBeams.push(new EvaporationBeam(this, boundsWidth, boundsHeight));
                    }
                } else if (this.hasTractorBeam) {
                    if (this.fireCooldown <= 0 && tractorBeams) {
                        this.hasTractorBeam = false;
                        this.fireCooldown = 0.6;
                        this.isCharging = false;
                        this.chargeTimer = 0;
                        if (soundFx) {
                            soundFx.stopCharge(this.id);
                            soundFx.playTractorLaunch();
                        }
                        tractorBeams.push(new ElectricLasso(this, boundsWidth, boundsHeight));
                    }
                } else if (this.electricBlasterTimer > 0) {
                    if (this.electricFireCooldown <= 0) {
                        this.electricFireCooldown = 0.12;
                        const cx = this.x + this.width / 2;
                        const cy = this.y + this.height / 2;
                        const tipX = cx + Math.cos(this.turretAngle) * 24;
                        const tipY = cy + Math.sin(this.turretAngle) * 24;

                        spawnedProjectile = new ElectricBolt(tipX, tipY, this.turretAngle, this.id, this.primaryColor, this.team);
                        if (soundFx) soundFx.playElectricZap();
                    }
                } else {
                    // Standard / Mega / Grenade / Homing charge
                    this.isCharging = true;
                    this.chargeTimer += dt;

                    if (soundFx) {
                        const ratio = Math.min(this.chargeTimer / this.maxChargeTime, 3.0);
                        soundFx.updateCharge(this.id, ratio, this.chargeTimer);
                    }

                    // Overcharge overload hazard (>3.0s)
                    if (this.chargeTimer >= this.selfExplodeTime) {
                        this.isCharging = false;
                        this.chargeTimer = 0;
                        if (soundFx) {
                            soundFx.stopCharge(this.id);
                            soundFx.playExplosion();
                        }
                        this.takeDamage(3, particleSystem, soundFx);
                        this.fireCooldown = 0.5;
                    }
                }
            }
        } else {
            // Fire Released: Launch bullet
            if (this.isCharging) {
                const wasCharging = this.isCharging;
                const finalChargeTimer = this.chargeTimer;
                this.isCharging = false;
                this.chargeTimer = 0;

                if (soundFx) soundFx.stopCharge(this.id);

                if (wasCharging && this.fireCooldown <= 0) {
                    const cx = this.x + this.width / 2;
                    const cy = this.y + this.height / 2;
                    const tipX = cx + Math.cos(this.turretAngle) * 24;
                    const tipY = cy + Math.sin(this.turretAngle) * 24;

                    const isMega = finalChargeTimer >= this.maxChargeTime;
                    const isGrenade = this.grenadeTimer > 0;
                    const isHoming = this.hasHeatSeeker;
                    if (isHoming) this.hasHeatSeeker = false;

                    if (this.quadGunTimer > 0) {
                        const nx = -Math.sin(this.turretAngle);
                        const ny = Math.cos(this.turretAngle);
                        const offsets = [-24, -8, 8, 24];
                        const quadShots = [];
                        for (const off of offsets) {
                            const qx = tipX + nx * off;
                            const qy = tipY + ny * off;
                            const qProj = new Projectile(qx, qy, this.turretAngle, this.id, '#ffb703', false, false, false);
                            qProj.damage = 1;
                            quadShots.push(qProj);
                        }
                        spawnedProjectile = quadShots;
                        this.fireCooldown = 0.22;
                        if (soundFx) soundFx.playShoot();
                    } else {
                        spawnedProjectile = new Projectile(tipX, tipY, this.turretAngle, this.id, this.primaryColor, isMega, isGrenade, isHoming);
                        if (isHoming && closestEnemy) {
                            spawnedProjectile.target = closestEnemy;
                        }
                        this.fireCooldown = isMega ? 0.35 : (isGrenade ? 0.3 : 0.21);

                        if (soundFx) {
                            if (isMega) soundFx.playMegaShoot();
                            else if (isGrenade) soundFx.playWhompExplosion();
                            else soundFx.playShoot();
                        }
                    }

                    // Active Ring of Fire lashing on fire
                    if (this.ringOfFireTimer > 0 && window._currentGame && window._currentGame.ringsOfFire) {
                        const myRing = window._currentGame.ringsOfFire.find(r => r.ownerShip === this || r.ownerId === this.id);
                        if (myRing) myRing.lash();
                    }
                }
            }
        }

        this.wasFirePressed = isFirePressed;
        return spawnedProjectile;
    }

    tryShootLaser(input, soundFx = null) {
        if (this.freezeTimer > 0 || this.weaponBlockedTimer > 0 || this.laserCooldown > 0 || this.hp <= 0) return null;
        if (this.laserAmmo <= 0) return null; // Requires Laser Inhibitor power-up
        const isLaserPressed = this.isAI ? this.virtualLaserPressed : (this.id === 'P1' ? input.isPressed('P1_LASER') : input.isPressed('P2_LASER'));

        if (isLaserPressed) {
            this.laserAmmo--;
            this.laserCooldown = 0.45;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const tipX = cx + Math.cos(this.turretAngle) * 24;
            const tipY = cy + Math.sin(this.turretAngle) * 24;

            if (soundFx) soundFx.playLaser();
            return new LaserBeam(tipX, tipY, this.turretAngle, this.id, this.team);
        }
        return null;
    }

    tryShootFreeze(input, soundFx = null) {
        if (this.freezeTimer > 0 || this.weaponBlockedTimer > 0 || this.freezeCooldown > 0 || this.hp <= 0) return null;
        if (this.immobilizerAmmo <= 0) return null; // Requires Stasis Immobilizer power-up
        const isFreezePressed = this.isAI ? this.virtualFreezePressed : (this.id === 'P1' ? input.isPressed('P1_FREEZE') : input.isPressed('P2_FREEZE'));

        if (isFreezePressed) {
            this.immobilizerAmmo--;
            this.freezeCooldown = 0.7;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const tipX = cx + Math.cos(this.turretAngle) * 24;
            const tipY = cy + Math.sin(this.turretAngle) * 24;

            if (soundFx) soundFx.playFreeze();
            return new ImmobilizerBeam(tipX, tipY, this.turretAngle, this.id, this.team);
        }
        return null;
    }

    teleport(boundsWidth, boundsHeight, particleSystem, obstacles, soundFx = null) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            particleSystem.push(new Particle(
                cx, cy,
                Math.cos(angle) * 300, Math.sin(angle) * 300,
                '#9d4edd', Math.random() * 5 + 3, 0.08
            ));
        }

        let newX = Math.random() * (boundsWidth - 100) + 50;
        let newY = Math.random() * (boundsHeight - 100) + 50;
        this.x = newX;
        this.y = newY;
        this.pushOutFromObstacles(obstacles);

        if (soundFx) soundFx.playTeleport();

        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            particleSystem.push(new Particle(
                this.x + this.width / 2, this.y + this.height / 2,
                Math.cos(angle) * 300, Math.sin(angle) * 300,
                '#9d4edd', Math.random() * 5 + 3, 0.08
            ));
        }
    }

    takeDamage(amount, particleSystem, soundFx = null) {
        if (this.invulnerableTimer > 0 || this.hp <= 0) return;
        if (soundFx) soundFx.playHit();

        if (this.shieldHp > 0) {
            this.shieldHp -= amount;
            if (this.shieldHp < 0) {
                const leftover = -this.shieldHp;
                this.shieldHp = 0;
                this.hp = Math.max(0, this.hp - leftover);
            }
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                particleSystem.push(new Particle(
                    cx, cy,
                    Math.cos(angle) * 250, Math.sin(angle) * 250,
                    '#00f2fe', Math.random() * 5 + 2, 0.08
                ));
            }
        } else {
            this.hp = Math.max(0, this.hp - amount);
            this.flashTimer = 0.25;

            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const particleCount = amount >= 3 ? 35 : 15;

            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * (amount >= 3 ? 500 : 250) + 100;
                particleSystem.push(new Particle(
                    cx, cy,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    amount >= 3 ? '#ff5e62' : this.primaryColor,
                    Math.random() * 6 + 3, 0.07
                ));
            }
        }

        // SHIP DESTROYED: Halt all charging sounds immediately!
        if (this.hp <= 0) {
            this.isCharging = false;
            this.chargeTimer = 0;
            this.virtualFirePressed = false;
            if (soundFx) {
                soundFx.stopCharge(this.id);
                soundFx.playExplosion();
            }
            if (this.capturedFlag) {
                this.capturedFlag.drop(this.x + this.width / 2, this.y + this.height / 2, soundFx);
                this.capturedFlag = null;
            }
        }
    }

    draw(ctx) {
        if (this.hp <= 0) return;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();

        // 1. Invulnerability Shield Bubble (CTF Base Respawn Shield)
        if (this.invulnerableTimer > 0) {
            ctx.save();
            const pulse = 0.7 + Math.sin(performance.now() * 0.012) * 0.3;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 22 * pulse;
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.85 * pulse})`;
            ctx.lineWidth = 2.8;
            ctx.fillStyle = `rgba(255, 215, 0, ${0.14 * pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, 32, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 2. Freeze Stasis Bubble
        if (this.freezeTimer > 0) {
            ctx.save();
            ctx.shadowColor = '#a0c4ff';
            ctx.shadowBlur = 24;
            ctx.strokeStyle = '#a0c4ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 38, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(160, 196, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(cx, cy, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 3. Shield Bubble
        if (this.shieldHp > 0) {
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

        // 4. Speed Boost Aura
        if (this.speedBoostTimer > 0) {
            ctx.save();
            ctx.shadowColor = '#ffe600';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 6]);
            ctx.lineDashOffset = -performance.now() * 0.04;
            ctx.beginPath();
            ctx.arc(cx, cy, 31, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 5. Minelayer Aura
        if (this.mineLayerTimer > 0) {
            ctx.save();
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = performance.now() * 0.03;
            ctx.beginPath();
            ctx.arc(cx, cy, 33, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 6. Electric Blaster Aura
        if (this.electricBlasterTimer > 0) {
            ctx.save();
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = 24;
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.lineDashOffset = -performance.now() * 0.06;
            ctx.beginPath();
            ctx.arc(cx, cy, 37, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.lineDashOffset = performance.now() * 0.08;
            ctx.beginPath();
            ctx.arc(cx, cy, 41, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 7. Rotating Blade Aura (Spinning Energy Scythes)
        if (this.bladeTimer > 0) {
            ctx.save();
            ctx.shadowColor = '#00f5d4';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 3;

            const orbitRadius = 44;
            const numBlades = 2; // Dual orbiting energy scythes

            for (let b = 0; b < numBlades; b++) {
                const bAngle = this.bladeAngle + (b * Math.PI);
                const bx = cx + Math.cos(bAngle) * orbitRadius;
                const by = cy + Math.sin(bAngle) * orbitRadius;

                // Curved blade crescent
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

                // Faint orbital ring trajectory
                ctx.strokeStyle = 'rgba(0, 245, 212, 0.2)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 8. Mega-Blast Charging Glow
        if (this.isCharging && this.chargeTimer > 0.1) {
            const chargeRatio = this.chargeTimer / this.maxChargeTime;
            const auraRadius = 30 + Math.min(chargeRatio, 2.0) * 18;
            const isFull = chargeRatio >= 1.0;
            const isDanger = this.chargeTimer > 2.0;
            const auraColor = isDanger ? '#ff5e62' : (this.grenadeTimer > 0 ? '#ff7b00' : (isFull ? '#ffb703' : this.primaryColor));

            ctx.save();
            ctx.shadowColor = auraColor;
            ctx.shadowBlur = isFull ? 30 : 18;
            ctx.fillStyle = isDanger ? 'rgba(255, 94, 98, 0.35)' : (isFull ? 'rgba(255, 183, 3, 0.25)' : 'rgba(0, 242, 254, 0.15)');
            ctx.beginPath();
            ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = auraColor;
            ctx.lineWidth = isFull ? 3 : 2;
            ctx.globalAlpha = 0.8;
            ctx.stroke();
            ctx.restore();
        }

        // 9. Render Local Ship Graphics
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.turretAngle);

        const currentSpeed = Math.hypot(this.vx, this.vy);
        const isThrusting = currentSpeed > 20;
        const thrustScale = Math.min(1.6, Math.max(0.4, currentSpeed / 220));
        const flicker = 0.75 + Math.random() * 0.5;

        const isFull = (this.chargeTimer / this.maxChargeTime) >= 1.0;
        const weaponAccent = this.hasTractorBeam ? '#00f5d4' :
            (this.hasEvaporationBeam ? '#c77dff' :
            (this.electricBlasterTimer > 0 ? '#00f2fe' : 
            (this.mineLayerTimer > 0 ? '#00ff88' : 
            (this.hasHeatSeeker ? '#ffb703' : 
            (this.chargeTimer > 2.0 ? '#ff5e62' : 
            (this.grenadeTimer > 0 ? '#ff7b00' : 
            (isFull ? '#ffb703' : this.primaryColor)))))));

        const isFlash = this.flashTimer > 0;

        Player.renderShip(ctx, this.chassis || this.id, this.primaryColor, this.secondaryColor, isThrusting, thrustScale, flicker, isFlash, weaponAccent, isFull);

        // Crackling Mega-Blast Electric Arcs
        if (this.isCharging && this.chargeTimer > 0.1) {
            ctx.save();
            ctx.strokeStyle = weaponAccent;
            ctx.shadowColor = weaponAccent;
            ctx.shadowBlur = 12;
            ctx.lineWidth = 1.5;

            const chargeRatio = Math.min(1.0, this.chargeTimer / this.maxChargeTime);
            const numArcs = Math.floor(chargeRatio * 3) + 1;

            for (let a = 0; a < numArcs; a++) {
                ctx.beginPath();
                const wingY = (a % 2 === 0 ? 1 : -1) * (this.id === 'P1' ? 18 : 20);
                const wingX = this.id === 'P1' ? -12 : -8;
                ctx.moveTo(wingX, wingY);
                const midX1 = (wingX + 24) * 0.35 + (Math.random() - 0.5) * 8;
                const midY1 = wingY * 0.6 + (Math.random() - 0.5) * 8;
                const midX2 = (wingX + 24) * 0.7 + (Math.random() - 0.5) * 8;
                const midY2 = wingY * 0.25 + (Math.random() - 0.5) * 6;
                ctx.lineTo(midX1, midY1);
                ctx.lineTo(midX2, midY2);
                ctx.lineTo(24, 0);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore(); // restore local translation and rotation

        // 10. AI Bot Call-Sign Banner
        if (this.isAI && this.aiName) {
            ctx.save();
            ctx.fillStyle = this.team === 'BLUE' ? 'rgba(0, 242, 254, 0.95)' : 'rgba(255, 94, 98, 0.95)';
            ctx.shadowColor = this.team === 'BLUE' ? '#00f2fe' : '#ff5e62';
            ctx.shadowBlur = 8;
            ctx.font = 'bold 11px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.aiName, cx, cy - 30);
            ctx.restore();
        }

        ctx.restore(); // restore outer ctx.save()
    }

    static renderShip(ctx, shipType, primaryColor, secondaryColor, isThrusting, thrustScale, flicker, isFlash, weaponAccent, isFull) {
        const type = (shipType || '').toUpperCase();

        if (type === 'SAUCER') {
            // ==========================================
            // SAUCER: Advanced Zero-G Disc Saucer
            // ==========================================
            if (isThrusting) {
                ctx.save();
                ctx.shadowColor = primaryColor;
                ctx.shadowBlur = 20;
                ctx.fillStyle = primaryColor;
                ctx.beginPath();
                ctx.arc(-14, 0, 8 * thrustScale * flicker, Math.PI / 2, Math.PI * 1.5);
                ctx.lineTo(-14 - 15 * thrustScale * flicker, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Outer Disc
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : primaryColor;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(0, 0, 19, 0, Math.PI * 2);

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createRadialGradient(0, 0, 3, 0, 0, 19);
                grad.addColorStop(0, '#1e293b');
                grad.addColorStop(0.65, '#0f172a');
                grad.addColorStop(1, '#020617');
                ctx.fillStyle = grad;
            }
            ctx.fill();
            ctx.strokeStyle = isFlash ? '#ffffff' : primaryColor;
            ctx.lineWidth = 2.2;
            ctx.stroke();

            // Inner Ring Nodes
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.stroke();

            // Glowing peripheral emitters
            const spin = performance.now() * 0.004;
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2 + spin;
                ctx.fillStyle = (i % 2 === 0) ? primaryColor : secondaryColor;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * 13, Math.sin(a) * 13, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Central Cockpit Dome
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fillStyle = secondaryColor;
            ctx.shadowColor = secondaryColor;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Forward Pointer Cannon
            ctx.fillStyle = weaponAccent;
            ctx.fillRect(16, -2, 7, 4);
            ctx.restore();

        } else if (type === 'PHANTOM') {
            // ==========================================
            // PHANTOM: Sleek Diamond Stealth Dart
            // ==========================================
            if (isThrusting) {
                const plumeLen = 17 * thrustScale * flicker;
                ctx.save();
                ctx.shadowColor = primaryColor;
                ctx.shadowBlur = 18;
                ctx.fillStyle = primaryColor;
                ctx.beginPath();
                ctx.moveTo(-16, -4);
                ctx.lineTo(-16 - plumeLen, 0);
                ctx.lineTo(-16, 4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Diamond forward-swept faceted body
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : primaryColor;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(26, 0);       // needle nose
            ctx.lineTo(8, 10);
            ctx.lineTo(-4, 22);      // forward swept wingtip
            ctx.lineTo(-14, 18);
            ctx.lineTo(-10, 8);
            ctx.lineTo(-18, 5);
            ctx.lineTo(-18, -5);
            ctx.lineTo(-10, -8);
            ctx.lineTo(-14, -18);
            ctx.lineTo(-4, -22);     // left wingtip
            ctx.lineTo(8, -10);
            ctx.closePath();

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createLinearGradient(-18, 0, 26, 0);
                grad.addColorStop(0, '#101726');
                grad.addColorStop(0.5, '#1e293b');
                grad.addColorStop(1, '#334155');
                ctx.fillStyle = grad;
            }
            ctx.fill();
            ctx.strokeStyle = isFlash ? '#ffffff' : primaryColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Cockpit
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(2, 4);
            ctx.lineTo(-6, 0);
            ctx.lineTo(2, -4);
            ctx.closePath();
            ctx.fillStyle = secondaryColor;
            ctx.shadowColor = secondaryColor;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Twin Blaster tips
            ctx.save();
            ctx.fillStyle = weaponAccent;
            ctx.fillRect(8, 7, 7, 2.5);
            ctx.fillRect(8, -9.5, 7, 2.5);
            ctx.restore();

        } else if (type === 'VIPER' || type === 'P1') {
            // ==========================================
            // VIPER: "AEGIS VIPER" (Needle Interceptor)
            // ==========================================
            if (isThrusting) {
                const plumeLen = 15 * thrustScale * flicker;
                const engineY = [ -6, 6 ];
                for (const ey of engineY) {
                    ctx.save();
                    ctx.shadowColor = '#00f2fe';
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = '#00f2fe';
                    ctx.beginPath();
                    ctx.moveTo(-16, ey - 3.5);
                    ctx.lineTo(-16 - plumeLen, ey);
                    ctx.lineTo(-16, ey + 3.5);
                    ctx.closePath();
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(-16, ey - 1.8);
                    ctx.lineTo(-16 - plumeLen * 0.65, ey);
                    ctx.lineTo(-16, ey + 1.8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Angular Hull Silhouette
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : primaryColor;
            ctx.shadowBlur = 16;

            ctx.beginPath();
            ctx.moveTo(25, 0);
            ctx.lineTo(13, 7);
            ctx.lineTo(8, 5);
            ctx.lineTo(-11, 21);
            ctx.lineTo(-16, 18);
            ctx.lineTo(-10, 10);
            ctx.lineTo(-17, 9);
            ctx.lineTo(-17, 3);
            ctx.lineTo(-12, 0);
            ctx.lineTo(-17, -3);
            ctx.lineTo(-17, -9);
            ctx.lineTo(-10, -10);
            ctx.lineTo(-16, -18);
            ctx.lineTo(-11, -21);
            ctx.lineTo(8, -5);
            ctx.lineTo(13, -7);
            ctx.closePath();

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createLinearGradient(-18, 0, 25, 0);
                grad.addColorStop(0, '#091322');
                grad.addColorStop(0.55, '#132847');
                grad.addColorStop(1, '#1b3b68');
                ctx.fillStyle = grad;
            }
            ctx.fill();

            ctx.strokeStyle = isFlash ? '#ffffff' : primaryColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Neon Armor Panels
            if (!isFlash) {
                ctx.save();
                ctx.strokeStyle = secondaryColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(7, 4); ctx.lineTo(-8, 16);
                ctx.moveTo(7, -4); ctx.lineTo(-8, -16);
                ctx.moveTo(14, 0); ctx.lineTo(2, 0);
                ctx.stroke();

                ctx.fillStyle = '#00f2fe';
                ctx.shadowColor = '#00f2fe';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(-11, 20, 2, 0, Math.PI * 2);
                ctx.arc(-11, -20, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Diamond Cockpit Canopy
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.lineTo(4, 4.5);
            ctx.lineTo(-1, 0);
            ctx.lineTo(4, -4.5);
            ctx.closePath();

            const canopyGrad = ctx.createLinearGradient(0, -4.5, 0, 4.5);
            canopyGrad.addColorStop(0, '#a0c4ff');
            canopyGrad.addColorStop(0.5, '#00f2fe');
            canopyGrad.addColorStop(1, '#0077b6');
            ctx.fillStyle = canopyGrad;
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = 10;
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(11, -1);
            ctx.lineTo(4, -3);
            ctx.stroke();
            ctx.restore();

            // Twin Weapon Emitters
            ctx.save();
            ctx.shadowColor = weaponAccent;
            ctx.shadowBlur = isFull ? 18 : 10;
            ctx.fillStyle = weaponAccent;
            ctx.fillRect(10, 5, 8, 2.5);
            ctx.fillRect(10, -7.5, 8, 2.5);

            ctx.beginPath();
            ctx.arc(24, 0, isFull ? 3.5 : 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

        } else if (type === 'CRUISER' || type === 'P2') {
            // ==============================================
            // CRUISER: "HEAVY CRUISER" (Battlecruiser)
            // ==============================================
            if (isThrusting) {
                const plumeLen = 18 * thrustScale * flicker;
                ctx.save();
                ctx.shadowColor = primaryColor || '#ff007f';
                ctx.shadowBlur = 20;
                ctx.fillStyle = primaryColor || '#ff007f';
                ctx.beginPath();
                ctx.moveTo(-17, -5.5);
                ctx.lineTo(-17 - plumeLen, 0);
                ctx.lineTo(-17, 5.5);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffea00';
                ctx.beginPath();
                ctx.moveTo(-17, -2.5);
                ctx.lineTo(-17 - plumeLen * 0.6, 0);
                ctx.lineTo(-17, 2.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                for (const sy of [-11, 11]) {
                    ctx.save();
                    ctx.fillStyle = secondaryColor || '#ff5e62';
                    ctx.beginPath();
                    ctx.moveTo(-14, sy - 2);
                    ctx.lineTo(-14 - plumeLen * 0.45, sy);
                    ctx.lineTo(-14, sy + 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Split-Dagger Stealth Hull
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : primaryColor;
            ctx.shadowBlur = 16;

            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(24, 4.5);
            ctx.lineTo(16, 7);
            ctx.lineTo(6, 12);
            ctx.lineTo(-7, 23);
            ctx.lineTo(-18, 16);
            ctx.lineTo(-12, 8);
            ctx.lineTo(-18, 6);
            ctx.lineTo(-18, -6);
            ctx.lineTo(-12, -8);
            ctx.lineTo(-18, -16);
            ctx.lineTo(-7, -23);
            ctx.lineTo(6, -12);
            ctx.lineTo(16, -7);
            ctx.lineTo(24, -4.5);
            ctx.closePath();

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createLinearGradient(-18, 0, 24, 0);
                grad.addColorStop(0, '#210619');
                grad.addColorStop(0.55, '#400c30');
                grad.addColorStop(1, '#5c1044');
                ctx.fillStyle = grad;
            }
            ctx.fill();

            ctx.strokeStyle = isFlash ? '#ffffff' : primaryColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Neon Insets
            if (!isFlash) {
                ctx.save();
                ctx.strokeStyle = secondaryColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(5, 9); ctx.lineTo(-7, 18);
                ctx.moveTo(5, -9); ctx.lineTo(-7, -18);
                ctx.moveTo(15, 0); ctx.lineTo(0, 0);
                ctx.stroke();

                ctx.fillStyle = primaryColor || '#ff007f';
                ctx.shadowColor = primaryColor || '#ff007f';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(-7, 21, 2, 0, Math.PI * 2);
                ctx.arc(-7, -21, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Faceted Chevron Cockpit Canopy
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(13, 0);
            ctx.lineTo(4, 5.5);
            ctx.lineTo(-2, 4);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-2, -4);
            ctx.lineTo(4, -5.5);
            ctx.closePath();

            const canopyGrad = ctx.createLinearGradient(0, -5.5, 0, 5.5);
            canopyGrad.addColorStop(0, '#ff70a6');
            canopyGrad.addColorStop(0.5, '#ff007f');
            canopyGrad.addColorStop(1, '#9b0050');
            ctx.fillStyle = canopyGrad;
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 10;
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(10, -1.5);
            ctx.lineTo(3, -4);
            ctx.stroke();
            ctx.restore();

            // Central Blaster
            ctx.save();
            ctx.shadowColor = weaponAccent;
            ctx.shadowBlur = isFull ? 18 : 10;
            ctx.fillStyle = weaponAccent;
            ctx.fillRect(14, -2, 7, 4);
            ctx.fillRect(22, 3, 3, 2);
            ctx.fillRect(22, -5, 3, 2);
            ctx.restore();

        } else if (type === 'DREADNOUGHT') {
            // ==========================================
            // DREADNOUGHT: Brutalist Twin-Pincer Warship
            // ==========================================
            if (isThrusting) {
                const plumeLen = 16 * thrustScale * flicker;
                for (const ey of [-8, 8]) {
                    ctx.save();
                    ctx.shadowColor = '#ff5e62';
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = '#ff5e62';
                    ctx.beginPath();
                    ctx.moveTo(-17, ey - 3);
                    ctx.lineTo(-17 - plumeLen, ey);
                    ctx.lineTo(-17, ey + 3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Heavy Twin-Pincer Hull
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : (primaryColor || '#ff007f');
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(12, 0);       // Central cleft between pincers
            ctx.lineTo(24, 7);       // Right pincer tip
            ctx.lineTo(20, 12);
            ctx.lineTo(6, 17);       // Side armor sponson
            ctx.lineTo(-12, 19);
            ctx.lineTo(-18, 12);
            ctx.lineTo(-18, -12);
            ctx.lineTo(-12, -19);
            ctx.lineTo(6, -17);
            ctx.lineTo(20, -12);
            ctx.lineTo(24, -7);      // Left pincer tip
            ctx.closePath();

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createLinearGradient(-18, 0, 24, 0);
                grad.addColorStop(0, '#1a1423');
                grad.addColorStop(0.5, '#372549');
                grad.addColorStop(1, '#774c60');
                ctx.fillStyle = grad;
            }
            ctx.fill();
            ctx.strokeStyle = isFlash ? '#ffffff' : (primaryColor || '#ff007f');
            ctx.lineWidth = 2.2;
            ctx.stroke();

            // Central Reactor Spine
            ctx.fillStyle = secondaryColor || '#ffea00';
            ctx.shadowColor = secondaryColor || '#ffea00';
            ctx.shadowBlur = 10;
            ctx.fillRect(-6, -2, 14, 4);

            // Heavy Pincer Gun Barrels
            ctx.fillStyle = weaponAccent;
            ctx.fillRect(24, 5.5, 6, 3);
            ctx.fillRect(24, -8.5, 6, 3);
            ctx.restore();

        } else if (type === 'CORSAIR') {
            // ==========================================
            // CORSAIR: Asymmetrical Solar-Sail Raider
            // ==========================================
            if (isThrusting) {
                const plumeLen = 17 * thrustScale * flicker;
                ctx.save();
                ctx.shadowColor = primaryColor || '#00f5d4';
                ctx.shadowBlur = 18;
                ctx.fillStyle = primaryColor || '#00f5d4';
                ctx.beginPath();
                ctx.moveTo(-16, 1);
                ctx.lineTo(-16 - plumeLen, 4);
                ctx.lineTo(-16, 7);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Asymmetrical Swept-Wing Body
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : (primaryColor || '#00f5d4');
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(25, -2);      // Main forward lance
            ctx.lineTo(14, 8);
            ctx.lineTo(0, 23);       // Extended starboard solar-sail
            ctx.lineTo(-12, 16);
            ctx.lineTo(-16, 3);
            ctx.lineTo(-16, -9);
            ctx.lineTo(-8, -18);     // Shorter port stabilizer fin
            ctx.lineTo(4, -14);
            ctx.lineTo(12, -7);
            ctx.closePath();

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createLinearGradient(-16, 0, 25, 0);
                grad.addColorStop(0, '#04292e');
                grad.addColorStop(0.6, '#0b525b');
                grad.addColorStop(1, '#14746f');
                ctx.fillStyle = grad;
            }
            ctx.fill();
            ctx.strokeStyle = isFlash ? '#ffffff' : (primaryColor || '#00f5d4');
            ctx.lineWidth = 2.0;
            ctx.stroke();

            // Outrigger Cockpit Bubble (Asymmetrical Port)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(3, -9, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = secondaryColor || '#ffd166';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Forward Laser Lance
            ctx.fillStyle = weaponAccent;
            ctx.fillRect(25, -3.5, 7, 3);
            ctx.restore();

        } else if (type === 'INTERCEPTOR') {
            // ==========================================
            // INTERCEPTOR: Razor Tri-Wing Dart Craft
            // ==========================================
            if (isThrusting) {
                const plumeLen = 20 * thrustScale * flicker;
                ctx.save();
                ctx.shadowColor = '#00b4d8';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#00b4d8';
                ctx.beginPath();
                ctx.moveTo(-18, -3.5);
                ctx.lineTo(-18 - plumeLen, 0);
                ctx.lineTo(-18, 3.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Sleek Tri-Wing Needle Silhouette
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : (primaryColor || '#0077b6');
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(28, 0);       // Ultra needle nose
            ctx.lineTo(8, 6);
            ctx.lineTo(-6, 22);      // Starboard razor winglet
            ctx.lineTo(-16, 18);
            ctx.lineTo(-10, 8);
            ctx.lineTo(-18, 0);      // Aft engine keel
            ctx.lineTo(-10, -8);
            ctx.lineTo(-16, -18);
            ctx.lineTo(-6, -22);     // Port razor winglet
            ctx.lineTo(8, -6);
            ctx.closePath();

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createLinearGradient(-18, 0, 28, 0);
                grad.addColorStop(0, '#03045e');
                grad.addColorStop(0.5, '#0077b6');
                grad.addColorStop(1, '#00b4d8');
                ctx.fillStyle = grad;
            }
            ctx.fill();
            ctx.strokeStyle = isFlash ? '#ffffff' : (primaryColor || '#0077b6');
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Crystalline Diamond Canopy
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.lineTo(4, 4);
            ctx.lineTo(-2, 0);
            ctx.lineTo(4, -4);
            ctx.closePath();
            ctx.fillStyle = '#caf0f8';
            ctx.shadowColor = '#caf0f8';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Wingtip Stabilizer Nodes
            ctx.fillStyle = secondaryColor || '#90e0ef';
            ctx.beginPath();
            ctx.arc(-6, 21, 2, 0, Math.PI * 2);
            ctx.arc(-6, -21, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

        } else if (type === 'TITAN') {
            // ==========================================
            // TITAN: Heavy Armored Diamond Citadel
            // ==========================================
            if (isThrusting) {
                const plumeLen = 14 * thrustScale * flicker;
                for (const ey of [-10, -3.5, 3.5, 10]) {
                    ctx.save();
                    ctx.fillStyle = '#ffaa00';
                    ctx.beginPath();
                    ctx.moveTo(-16, ey - 1.8);
                    ctx.lineTo(-16 - plumeLen * 0.7, ey);
                    ctx.lineTo(-16, ey + 1.8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Diamond Fortress Armored Hull
            ctx.save();
            ctx.shadowColor = isFlash ? '#ffffff' : (primaryColor || '#ff9e00');
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(22, 0);       // Reinforced prow emitter
            ctx.lineTo(12, 14);
            ctx.lineTo(0, 22);       // Heavy shoulder plate
            ctx.lineTo(-15, 14);
            ctx.lineTo(-18, 0);      // Aft transom
            ctx.lineTo(-15, -14);
            ctx.lineTo(0, -22);
            ctx.lineTo(12, -14);
            ctx.closePath();

            if (isFlash) {
                ctx.fillStyle = '#ffffff';
            } else {
                const grad = ctx.createLinearGradient(-18, 0, 22, 0);
                grad.addColorStop(0, '#2d1e00');
                grad.addColorStop(0.5, '#6a4c00');
                grad.addColorStop(1, '#ff9e00');
                ctx.fillStyle = grad;
            }
            ctx.fill();
            ctx.strokeStyle = isFlash ? '#ffffff' : (primaryColor || '#ff9e00');
            ctx.lineWidth = 2.4;
            ctx.stroke();

            // Armored Command Citadel
            ctx.fillStyle = '#100c02';
            ctx.fillRect(-4, -6, 12, 12);
            ctx.strokeStyle = secondaryColor || '#ffe6a7';
            ctx.lineWidth = 1.4;
            ctx.strokeRect(-4, -6, 12, 12);

            // Energy Core Grid Lines
            ctx.fillStyle = secondaryColor || '#ffe6a7';
            ctx.beginPath();
            ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Heavy Twin Gun Sponsons
            ctx.fillStyle = weaponAccent;
            ctx.fillRect(10, 8, 8, 3);
            ctx.fillRect(10, -11, 8, 3);
            ctx.restore();

        } else {
            // ==========================================
            // DEFAULT FALLBACK: "AEGIS VIPER"
            // ==========================================
            Player.renderShip(ctx, 'VIPER', primaryColor, secondaryColor, isThrusting, thrustScale, flicker, isFlash, weaponAccent, isFull);
        }
    }
}
