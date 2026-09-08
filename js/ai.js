/**
 * ============================================================================
 * Starship Arena - Autonomous Combat AI (AIController)
 * ============================================================================
 * Description:
 *   Autonomous starship pilot intelligence system. Operates strictly within the
 *   exact same physical constraints, angular turn rates, and 6-DOF movement
 *   capabilities (thrust, reverse, strafe left/right, rotate left/right) as human
 *   players. Prevents instantaneous snap-turns while stationary and matches
 *   human piloting mechanics at all difficulty levels.
 *
 * Responsibilities:
 *   - AI difficulty tuning across 5 presets (Novice, Casual, Balanced, Expert, Nightmare).
 *   - Human-equivalent movement inputs: virtualForward, virtualReverse,
 *     virtualStrafeLeft, virtualStrafeRight, virtualRotateLeft, virtualRotateRight.
 *   - Tactical pathing: Objective seeking in CTF (escort flag, seize enemy flag,
 *     intercept enemy carrier), power-up acquisition, hazard evasion, and combat strafing.
 *   - Aiming with smooth angular steering, aim tolerances, and weapon firing logic.
 *   - Complete input reset upon ship destruction to prevent audio looping bugs.
 * ============================================================================
 */

const AI_DIFFICULTY_PRESETS = {
    1: {
        name: 'NOVICE',
        badgeClass: 'ai-badge-novice',
        label: 'LVL 1 • NOVICE',
        desc: '40% speed, slow turn rate, wanders and hesitates frequently.',
        speedMult: 0.40,
        accelMult: 0.35,
        canStrafe: false,
        turnRate: 1.0,
        aimTolerance: 0.85,
        aimJitter: 0.30,
        burstCooldownMin: 2.2,
        burstCooldownMax: 4.0,
        burstFireDuration: 0.20,
        specialWeaponChance: 0.0,
        hesitationChance: 0.60,
        hesitationDuration: 0.75
    },
    2: {
        name: 'CASUAL',
        badgeClass: 'ai-badge-casual',
        label: 'LVL 2 • CASUAL',
        desc: '75% speed, moderate turn rate, basic lateral strafing.',
        speedMult: 0.75,
        accelMult: 0.70,
        canStrafe: true,
        turnRate: 2.1,
        aimTolerance: 0.42,
        aimJitter: 0.10,
        burstCooldownMin: 0.9,
        burstCooldownMax: 1.6,
        burstFireDuration: 0.32,
        specialWeaponChance: 0.02,
        hesitationChance: 0.20,
        hesitationDuration: 0.25
    },
    3: {
        name: 'BALANCED',
        badgeClass: 'ai-badge-balanced',
        label: 'LVL 3 • BALANCED',
        desc: 'Standard speed & acceleration. Smooth 6-DOF strafing and tactical combat.',
        speedMult: 1.0,
        accelMult: 1.0,
        canStrafe: true,
        turnRate: 2.5,
        aimTolerance: 0.30,
        aimJitter: 0.06,
        burstCooldownMin: 0.5,
        burstCooldownMax: 1.1,
        burstFireDuration: 0.42,
        specialWeaponChance: 0.04,
        hesitationChance: 0.08,
        hesitationDuration: 0.15
    },
    4: {
        name: 'EXPERT',
        badgeClass: 'ai-badge-expert',
        label: 'LVL 4 • EXPERT',
        desc: '+15% agility, rapid responsive turning, aggressive combat strafing.',
        speedMult: 1.15,
        accelMult: 1.25,
        canStrafe: true,
        turnRate: 3.1,
        aimTolerance: 0.20,
        aimJitter: 0.03,
        burstCooldownMin: 0.25,
        burstCooldownMax: 0.65,
        burstFireDuration: 0.55,
        specialWeaponChance: 0.07,
        hesitationChance: 0.0,
        hesitationDuration: 0.0
    },
    5: {
        name: 'NIGHTMARE',
        badgeClass: 'ai-badge-nightmare',
        label: 'LVL 5 • NIGHTMARE',
        desc: '+30% speed, pinpoint precision, relentless evasive maneuvers.',
        speedMult: 1.30,
        accelMult: 1.50,
        canStrafe: true,
        turnRate: 3.8,
        aimTolerance: 0.10,
        aimJitter: 0.0,
        burstCooldownMin: 0.12,
        burstCooldownMax: 0.40,
        burstFireDuration: 0.70,
        specialWeaponChance: 0.12,
        hesitationChance: 0.0,
        hesitationDuration: 0.0
    }
};

class AIController {
    constructor(player) {
        this.player = player;
        this.strafeDir = Math.random() < 0.5 ? 1 : -1;
        this.strafeTimer = 0;
        this.burstFireTimer = 0;
        this.burstCooldown = 0;
        this.hesitationTimer = 0;
        this.hesitationCheckTimer = Math.random() * 2 + 1;
    }

    resetInputs() {
        if (!this.player) return;
        this.player.virtualForward = false;
        this.player.virtualReverse = false;
        this.player.virtualStrafeLeft = false;
        this.player.virtualStrafeRight = false;
        this.player.virtualRotateLeft = false;
        this.player.virtualRotateRight = false;
        this.player.virtualFirePressed = false;
        this.player.virtualLaserPressed = false;
        this.player.virtualFreezePressed = false;
    }

    update(dt, game) {
        if (!this.player || this.player.hp <= 0) {
            this.resetInputs();
            return;
        }

        const level = (game && game.aiDifficultyLevel) ? game.aiDifficultyLevel : 3;
        const preset = AI_DIFFICULTY_PRESETS[level] || AI_DIFFICULTY_PRESETS[3];

        const humanIsClassic = (game && game.input && game.input.controlScheme === 'CLASSIC');
        const canStrafe = preset.canStrafe && !humanIsClassic;

        // Apply dynamic speed & acceleration multipliers based on capability
        this.player.maxSpeed = 500 * preset.speedMult;
        this.player.acceleration = 2860 * preset.accelMult;

        // Reset virtual inputs for this frame
        this.player.virtualForward = false;
        this.player.virtualReverse = false;
        this.player.virtualStrafeLeft = false;
        this.player.virtualStrafeRight = false;
        this.player.virtualRotateLeft = false;
        this.player.virtualRotateRight = false;
        this.player.virtualFirePressed = false;
        this.player.virtualLaserPressed = false;
        this.player.virtualFreezePressed = false;

        // Hesitation logic on lower levels
        if (preset.hesitationChance > 0) {
            if (this.hesitationTimer > 0) {
                this.hesitationTimer -= dt;
                return;
            }
            this.hesitationCheckTimer -= dt;
            if (this.hesitationCheckTimer <= 0) {
                this.hesitationCheckTimer = Math.random() * 2.5 + 1.2;
                if (Math.random() < preset.hesitationChance) {
                    this.hesitationTimer = preset.hesitationDuration;
                    return;
                }
            }
        }

        this.strafeTimer -= dt;
        if (this.strafeTimer <= 0) {
            this.strafeDir = Math.random() < 0.5 ? 1 : -1;
            this.strafeTimer = Math.random() * 2 + 1.2;
        }

        // 1. Determine Tactical Target & Objective
        let destX = this.player.x;
        let destY = this.player.y;
        let aimTargetX = destX;
        let aimTargetY = destY;
        let shouldFire = false;

        const allShips = game.getAllShips ? game.getAllShips() : [game.p1, game.p2];
        const myCx = this.player.x + this.player.width / 2;
        const myCy = this.player.y + this.player.height / 2;
        const enemies = allShips.filter(s => {
            if (!s || s.hp <= 0 || s.team === this.player.team || s.id === this.player.id) return false;
            // Concealment check: if enemy is in a stealth nebula, AI cannot target them from afar
            if (game.stealthNebulae && game.stealthNebulae.some(neb => neb.containsShip(s))) {
                const d = Math.hypot((s.x + s.width / 2) - myCx, (s.y + s.height / 2) - myCy);
                if (d > 65) return false; // Concealed from radar!
            }
            return true;
        });

        // CTF Specific Objective Logic
        if (game.gameMode === 'CTF' && game.blueFlag && game.redFlag) {
            const enemyFlag = (this.player.team === 'BLUE') ? game.redFlag : game.blueFlag;
            const myFlag = (this.player.team === 'BLUE') ? game.blueFlag : game.redFlag;

            if (enemyFlag.carrier === this.player) {
                // Escort captured enemy flag to our base!
                destX = myFlag.homeX;
                destY = myFlag.homeY;
                aimTargetX = destX;
                aimTargetY = destY;

                if (enemies.length > 0) {
                    const closestEnemy = this.getClosest(myCx, myCy, enemies);
                    if (closestEnemy) {
                        const dist = Math.hypot(closestEnemy.x - myCx, closestEnemy.y - myCy);
                        if (dist < 380) {
                            aimTargetX = closestEnemy.x + closestEnemy.width / 2;
                            aimTargetY = closestEnemy.y + closestEnemy.height / 2;
                            shouldFire = true;
                        }
                    }
                }
            } else if (myFlag.carrier && myFlag.carrier.team !== this.player.team) {
                // Intercept enemy flag thief!
                destX = myFlag.carrier.x;
                destY = myFlag.carrier.y;
                aimTargetX = destX + myFlag.carrier.width / 2;
                aimTargetY = destY + myFlag.carrier.height / 2;
                shouldFire = true;
            } else if (!enemyFlag.carrier) {
                // Seize the enemy flag!
                destX = enemyFlag.x;
                destY = enemyFlag.y;
                aimTargetX = destX;
                aimTargetY = destY;

                if (enemies.length > 0) {
                    const closestEnemy = this.getClosest(myCx, myCy, enemies);
                    if (closestEnemy && Math.hypot(closestEnemy.x - myCx, closestEnemy.y - myCy) < 320) {
                        aimTargetX = closestEnemy.x + closestEnemy.width / 2;
                        aimTargetY = closestEnemy.y + closestEnemy.height / 2;
                        shouldFire = true;
                    }
                }
            } else {
                // Escort our teammate who holds the flag!
                if (enemies.length > 0) {
                    const closestEnemy = this.getClosest(myCx, myCy, enemies);
                    if (closestEnemy) {
                        destX = closestEnemy.x;
                        destY = closestEnemy.y;
                        aimTargetX = destX + closestEnemy.width / 2;
                        aimTargetY = destY + closestEnemy.height / 2;
                        shouldFire = true;
                    }
                }
            }
        } else {
            // PVP / Team Combat Combat Mode
            if (enemies.length > 0) {
                const closestEnemy = this.getClosest(myCx, myCy, enemies);
                if (closestEnemy) {
                    const ecx = closestEnemy.x + closestEnemy.width / 2;
                    const ecy = closestEnemy.y + closestEnemy.height / 2;
                    const distToEnemy = Math.hypot(ecx - myCx, ecy - myCy);

                    // Tactical optimal combat range ~280-360px
                    const desiredDist = 320;
                    if (distToEnemy > desiredDist + 60) {
                        destX = ecx;
                        destY = ecy;
                    } else if (distToEnemy < desiredDist - 80) {
                        // Back away
                        destX = myCx - (ecx - myCx);
                        destY = myCy - (ecy - myCy);
                    } else {
                        // Hold ground and orbit/strafe
                        destX = myCx;
                        destY = myCy;
                    }

                    // Lead the target slightly on Expert/Nightmare
                    const leadFactor = (level >= 4) ? 0.18 : 0.0;
                    aimTargetX = ecx + closestEnemy.vx * leadFactor + (Math.random() - 0.5) * preset.aimJitter * 200;
                    aimTargetY = ecy + closestEnemy.vy * leadFactor + (Math.random() - 0.5) * preset.aimJitter * 200;
                    shouldFire = true;
                }
            }
        }

        // 2. Power-Up Seeking (if nearby and healthy)
        if (game.powerUps && game.powerUps.length > 0 && Math.random() < 0.25) {
            const beneficialItems = game.powerUps.filter(p => !p.isHazard);
            if (beneficialItems.length > 0) {
                const closestItem = this.getClosest(myCx, myCy, beneficialItems);
                if (closestItem && Math.hypot(closestItem.x - myCx, closestItem.y - myCy) < 350) {
                    destX = closestItem.x;
                    destY = closestItem.y;
                }
            }
        }

        // Hazard Evasion (Mines, Asteroids, Hazard Pickups, Crusher)
        if (game.mines && game.mines.length > 0) {
            for (const mine of game.mines) {
                if (mine.exploded) continue;
                const d = Math.hypot(mine.x - myCx, mine.y - myCy);
                if (d < 110) {
                    destX += (myCx - mine.x) * 2.5;
                    destY += (myCy - mine.y) * 2.5;
                }
            }
        }

        if (game.asteroids && game.asteroids.length > 0) {
            for (const ast of game.asteroids) {
                if (ast.destroyed) continue;
                const d = Math.hypot(ast.x - myCx, ast.y - myCy);
                if (d < ast.radius + 60) {
                    destX += (myCx - ast.x) * 2.0;
                    destY += (myCy - ast.y) * 2.0;
                }
            }
        }

        // 3. Human-Equivalent Steering & Rotation
        // AI rotates smoothly toward aimTarget using rotateLeft / rotateRight
        const desiredAimAngle = Math.atan2(aimTargetY - myCy, aimTargetX - myCx);
        let angleDiff = desiredAimAngle - this.player.turretAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const maxTurnThisFrame = preset.turnRate * dt;
        if (angleDiff > 0.05) {
            this.player.virtualRotateRight = true;
            this.player.turretAngle += Math.min(angleDiff, maxTurnThisFrame);
        } else if (angleDiff < -0.05) {
            this.player.virtualRotateLeft = true;
            this.player.turretAngle += Math.max(angleDiff, -maxTurnThisFrame);
        }

        // Normalize heading angle
        while (this.player.turretAngle > Math.PI) this.player.turretAngle -= Math.PI * 2;
        while (this.player.turretAngle < -Math.PI) this.player.turretAngle += Math.PI * 2;

        // 4. Human-Equivalent Thrusters & Strafing
        const moveDx = destX - myCx;
        const moveDy = destY - myCy;
        const moveDist = Math.hypot(moveDx, moveDy);

        if (moveDist > 25) {
            // Forward thrust vector relative to turret heading
            const headingX = Math.cos(this.player.turretAngle);
            const headingY = Math.sin(this.player.turretAngle);
            const normalX = -headingY; // Strafe right vector
            const normalY = headingX;

            const targetDirX = moveDx / moveDist;
            const targetDirY = moveDy / moveDist;

            // Dot products along heading and lateral axes
            const forwardDot = targetDirX * headingX + targetDirY * headingY;
            const strafeDot = targetDirX * normalX + targetDirY * normalY;

            if (forwardDot > 0.35) {
                this.player.virtualForward = true;
            } else if (forwardDot < -0.35) {
                this.player.virtualReverse = true;
            }

            if (canStrafe) {
                if (strafeDot > 0.3) {
                    this.player.virtualStrafeRight = true;
                } else if (strafeDot < -0.3) {
                    this.player.virtualStrafeLeft = true;
                }
            }
        }

        // Tactical combat strafing when aiming at enemy
        if (shouldFire && canStrafe && Math.abs(angleDiff) < preset.aimTolerance) {
            if (this.strafeDir > 0) this.player.virtualStrafeRight = true;
            else this.player.virtualStrafeLeft = true;
        }

        // 5. Firing System
        if (shouldFire && Math.abs(angleDiff) < preset.aimTolerance) {
            if (this.burstCooldown > 0) {
                this.burstCooldown -= dt;
            } else {
                this.burstFireTimer += dt;
                this.player.virtualFirePressed = true;

                if (this.burstFireTimer >= preset.burstFireDuration) {
                    this.burstFireTimer = 0;
                    this.burstCooldown = Math.random() * (preset.burstCooldownMax - preset.burstCooldownMin) + preset.burstCooldownMin;
                }
            }

            // Special Weapons (Laser Inhibitor & Immobilizer)
            if (Math.random() < preset.specialWeaponChance) {
                if (Math.random() < 0.5 && this.player.laserAmmo > 0) this.player.virtualLaserPressed = true;
                else if (this.player.immobilizerAmmo > 0) this.player.virtualFreezePressed = true;
            }
        }
    }

    getClosest(cx, cy, items) {
        let closest = null;
        let minDist = Infinity;
        for (const item of items) {
            if (!item) continue;
            const ix = item.x + (item.width ? item.width / 2 : 0);
            const iy = item.y + (item.height ? item.height / 2 : 0);
            const d = Math.hypot(ix - cx, iy - cy);
            if (d < minDist) {
                minDist = d;
                closest = item;
            }
        }
        return closest;
    }
}
