/**
 * ============================================================================
 * Starship Arena - UI & HUD Management Engine (UIManager)
 * ============================================================================
 * Description:
 *   Handles all heads-up display rendering, responsive multiplayer health card
 *   stacks (humans stacked top-left, AI bots stacked top-right), Capture The
 *   Flag visual flag accumulator scorekeeper, pause modal overlay, and
 *   the interactive custom controls remapping menu.
 *
 * Responsibilities:
 *   - Multiplayer HUD stacks: Stacks human health cards on top-left and AI
 *     drone health cards on top-right with live HP bars, pips, and status tags.
 *   - CTF Flag Accumulator: Displays illuminated glowing flag icons in a
 *     dedicated trophy scorekeeper (0/3 to 3/3).
 *   - Controls Remapping Menu: Modal allowing pilots to click and rebind any
 *     key, switch between Modern 6-DOF and Classic schemes, and reset defaults.
 *   - Pause state overlay rendering and hotkey hint updates.
 * ============================================================================
 */

class UIManager {
    constructor(game) {
        this.game = game;

        // Cache DOM elements
        this.p1HpFill = document.getElementById('p1HpFill');
        this.p1HpText = document.getElementById('p1HpText');
        this.p1PipsContainer = document.getElementById('p1HpPips');
        this.p1RegenText = document.getElementById('p1RegenText');
        this.p1ChargeFill = document.getElementById('p1ChargeFill');

        this.p1ShieldBadge = document.getElementById('p1ShieldBadge');
        this.p1PowerupBadge = document.getElementById('p1PowerupBadge');
        this.p1SlowBadge = document.getElementById('p1SlowBadge');
        this.p1SpeedBadge = document.getElementById('p1SpeedBadge');
        this.p1BlockedBadge = document.getElementById('p1BlockedBadge');
        this.p1FrozenBadge = document.getElementById('p1FrozenBadge');
        this.p1ElectricBadge = document.getElementById('p1ElectricBadge');
        this.p1MineBadge = document.getElementById('p1MineBadge');
        this.p1SeekerBadge = document.getElementById('p1SeekerBadge');
        this.p1LaserBadge = document.getElementById('p1LaserBadge');
        this.p1StasisBadge = document.getElementById('p1StasisBadge');
        this.p1EvaporationBadge = document.getElementById('p1EvaporationBadge');
        this.p1TractorBadge = document.getElementById('p1TractorBadge');
        this.p1DoppelgangerBadge = document.getElementById('p1DoppelgangerBadge');
        this.p1QuadBadge = document.getElementById('p1QuadBadge');
        this.p1RingBadge = document.getElementById('p1RingBadge');
        this.p1FlagBadge = document.getElementById('p1FlagBadge');

        this.p2HudCard = document.getElementById('p2HudCard');
        this.p2HpFill = document.getElementById('p2HpFill');
        this.p2HpText = document.getElementById('p2HpText');
        this.p2PipsContainer = document.getElementById('p2HpPips');
        this.p2RegenText = document.getElementById('p2RegenText');
        this.p2ChargeFill = document.getElementById('p2ChargeFill');

        this.p2ShieldBadge = document.getElementById('p2ShieldBadge');
        this.p2PowerupBadge = document.getElementById('p2PowerupBadge');
        this.p2SlowBadge = document.getElementById('p2SlowBadge');
        this.p2SpeedBadge = document.getElementById('p2SpeedBadge');
        this.p2BlockedBadge = document.getElementById('p2BlockedBadge');
        this.p2FrozenBadge = document.getElementById('p2FrozenBadge');
        this.p2ElectricBadge = document.getElementById('p2ElectricBadge');
        this.p2MineBadge = document.getElementById('p2MineBadge');
        this.p2SeekerBadge = document.getElementById('p2SeekerBadge');
        this.p2LaserBadge = document.getElementById('p2LaserBadge');
        this.p2StasisBadge = document.getElementById('p2StasisBadge');
        this.p2EvaporationBadge = document.getElementById('p2EvaporationBadge');
        this.p2TractorBadge = document.getElementById('p2TractorBadge');
        this.p2DoppelgangerBadge = document.getElementById('p2DoppelgangerBadge');
        this.p2QuadBadge = document.getElementById('p2QuadBadge');
        this.p2RingBadge = document.getElementById('p2RingBadge');
        this.p2FlagBadge = document.getElementById('p2FlagBadge');

        // Containers for multiplayer stacks
        this.aiHudStack = document.getElementById('aiHudStack');
        this.humanHudStack = document.getElementById('humanHudStack');
        this.rightHudContainer = document.getElementById('rightHudContainer');

        // CTF Score Elements
        this.ctfScoreRow = document.getElementById('ctfScoreRow');
        this.blueFlagCount = document.getElementById('blueFlagCount');
        this.redFlagCount = document.getElementById('redFlagCount');
        this.blueFlagSlots = document.getElementById('blueFlagSlots');
        this.redFlagSlots = document.getElementById('redFlagSlots');

        // Race Score Elements
        this.raceScoreRow = document.getElementById('raceScoreRow');
        this.raceStageBadge = document.getElementById('raceStageBadge');
        this.raceLapBadge = document.getElementById('raceLapBadge');
        this.racePositionsMini = document.getElementById('racePositionsMini');

        // Main Menu Tab & Controls Elements
        this.tabMissionsBtn = document.getElementById('tabMissionsBtn');
        this.tabControlsBtn = document.getElementById('tabControlsBtn');
        this.backToMissionsBtn = document.getElementById('backToMissionsBtn');
        this.menuTabMissions = document.getElementById('menuTabMissions');
        this.menuTabControls = document.getElementById('menuTabControls');
        this.rebindTargetAction = null;
        this.initControlsModal();
        this.initChassisSelect();
    }

    renderPips(container, currentHp, maxHp) {
        if (!container) return;
        container.innerHTML = '';
        const totalPips = Math.min(maxHp, 25);
        for (let i = 0; i < totalPips; i++) {
            const pip = document.createElement('div');
            pip.className = 'hp-pip';
            if (i < currentHp) pip.classList.add('active');
            container.appendChild(pip);
        }
    }

    update() {
        const game = this.game;
        const isMultiplayer = (game.gameMode === 'TEAM' || (game.gameMode === 'CTF' && game.aiBots && game.aiBots.length > 0));

        // 1. Player 1 HUD Card
        if (game.p1) {
            const p1Pct = Math.min(100, (game.p1.hp / game.p1.maxHp) * 100);
            if (this.p1HpFill) this.p1HpFill.style.width = `${p1Pct}%`;
            if (this.p1HpText) this.p1HpText.textContent = `${game.p1.hp} / ${game.p1.maxHp} HP`;
            this.renderPips(this.p1PipsContainer, game.p1.hp, game.p1.maxHp);

            if (this.p1RegenText) {
                if (game.p1.hp < game.p1.maxHp && game.p1.hp > 0) {
                    const secLeft = Math.ceil(game.p1.regenInterval - game.p1.regenTimer);
                    this.p1RegenText.textContent = `+1 HP in ${secLeft}s`;
                } else {
                    this.p1RegenText.textContent = 'MAX HP';
                }
            }

            // Status Badges
            this.updatePlayerBadges(game.p1, {
                shield: this.p1ShieldBadge,
                slow: this.p1SlowBadge,
                speed: this.p1SpeedBadge,
                grenade: this.p1PowerupBadge,
                blocked: this.p1BlockedBadge,
                frozen: this.p1FrozenBadge,
                electric: this.p1ElectricBadge,
                mine: this.p1MineBadge,
                seeker: this.p1SeekerBadge,
                laser: this.p1LaserBadge,
                stasis: this.p1StasisBadge,
                evaporation: this.p1EvaporationBadge,
                tractor: this.p1TractorBadge,
                doppelganger: this.p1DoppelgangerBadge,
                quad: this.p1QuadBadge,
                ring: this.p1RingBadge,
                flag: this.p1FlagBadge
            });

            // Charge Meter
            if (this.p1ChargeFill) {
                const p1ChargePct = Math.min(100, (game.p1.chargeTimer / game.p1.maxChargeTime) * 100);
                this.p1ChargeFill.style.width = `${p1ChargePct}%`;
                if (p1ChargePct >= 100) this.p1ChargeFill.classList.add('ready');
                else this.p1ChargeFill.classList.remove('ready');
            }
        }

        // 2. Player 2 HUD Card (when human wingman active)
        if (game.p2 && !game.p2.isAI) {
            if (this.p2HudCard) this.p2HudCard.classList.remove('hidden');

            // Reparent to human stack in co-op multiplayer (Team / CTF), or right container in PVP
            if (isMultiplayer && this.humanHudStack && this.p2HudCard && this.p2HudCard.parentElement !== this.humanHudStack) {
                this.humanHudStack.appendChild(this.p2HudCard);
            } else if (!isMultiplayer && this.rightHudContainer && this.p2HudCard && this.p2HudCard.parentElement !== this.rightHudContainer) {
                this.rightHudContainer.appendChild(this.p2HudCard);
            }

            const p2Pct = Math.min(100, (game.p2.hp / game.p2.maxHp) * 100);
            if (this.p2HpFill) this.p2HpFill.style.width = `${p2Pct}%`;
            if (this.p2HpText) this.p2HpText.textContent = `${game.p2.hp} / ${game.p2.maxHp} HP`;
            this.renderPips(this.p2PipsContainer, game.p2.hp, game.p2.maxHp);

            if (this.p2RegenText) {
                if (game.p2.hp < game.p2.maxHp && game.p2.hp > 0) {
                    const secLeft = Math.ceil(game.p2.regenInterval - game.p2.regenTimer);
                    this.p2RegenText.textContent = `+1 HP in ${secLeft}s`;
                } else {
                    this.p2RegenText.textContent = 'MAX HP';
                }
            }

            this.updatePlayerBadges(game.p2, {
                shield: this.p2ShieldBadge,
                slow: this.p2SlowBadge,
                speed: this.p2SpeedBadge,
                grenade: this.p2PowerupBadge,
                blocked: this.p2BlockedBadge,
                frozen: this.p2FrozenBadge,
                electric: this.p2ElectricBadge,
                mine: this.p2MineBadge,
                seeker: this.p2SeekerBadge,
                laser: this.p2LaserBadge,
                stasis: this.p2StasisBadge,
                evaporation: this.p2EvaporationBadge,
                tractor: this.p2TractorBadge,
                doppelganger: this.p2DoppelgangerBadge,
                quad: this.p2QuadBadge,
                ring: this.p2RingBadge,
                flag: this.p2FlagBadge
            });

            if (this.p2ChargeFill) {
                const p2ChargePct = Math.min(100, (game.p2.chargeTimer / game.p2.maxChargeTime) * 100);
                this.p2ChargeFill.style.width = `${p2ChargePct}%`;
                if (p2ChargePct >= 100) this.p2ChargeFill.classList.add('ready');
                else this.p2ChargeFill.classList.remove('ready');
            }
        } else if (!isMultiplayer && game.p2 && game.p2.isAI) {
            // Classic 1v1 PVP with AI
            if (this.rightHudContainer && this.p2HudCard && this.p2HudCard.parentElement !== this.rightHudContainer) {
                this.rightHudContainer.appendChild(this.p2HudCard);
            }
            if (this.p2HudCard) this.p2HudCard.classList.remove('hidden');
            const p2Pct = Math.min(100, (game.p2.hp / game.p2.maxHp) * 100);
            if (this.p2HpFill) this.p2HpFill.style.width = `${p2Pct}%`;
            if (this.p2HpText) this.p2HpText.textContent = `${game.p2.hp} / ${game.p2.maxHp} HP`;
            this.renderPips(this.p2PipsContainer, game.p2.hp, game.p2.maxHp);
        } else if (this.p2HudCard && (game.playerCount === 1 || isMultiplayer)) {
            // Hide standard P2 card in multiplayer if AI bots will be in stack
            if (isMultiplayer && (!game.p2 || game.p2.isAI)) {
                this.p2HudCard.classList.add('hidden');
            }
        }

        // 3. Multiplayer Mode Health Stack for AI Drones (Top-Right)
        this.updateAiHudStack(game);

        // 4. CTF Flag Accumulator Scorekeeper
        if (game.gameMode === 'CTF') {
            if (this.ctfScoreRow) this.ctfScoreRow.classList.remove('hidden');
            if (this.blueFlagCount) this.blueFlagCount.textContent = game.blueScore;
            if (this.redFlagCount) this.redFlagCount.textContent = game.redScore;
            this.renderFlagAccumulator(game.blueScore, game.redScore);
        } else if (this.ctfScoreRow) {
            this.ctfScoreRow.classList.add('hidden');
        }

        // 5. Hyper Grand Prix Race Scorekeeper
        if (game.gameMode === 'RACE') {
            if (this.raceScoreRow) this.raceScoreRow.classList.remove('hidden');
            this.updateRaceScore(game);
        } else if (this.raceScoreRow) {
            this.raceScoreRow.classList.add('hidden');
        }
    }

    updateRaceScore(game) {
        if (!game.raceTrack) return;
        if (this.raceStageBadge) {
            const stageNames = ['Neon Speedway', 'Pneumatic Gauntlet', 'Nebula Drift', 'Laser Sector', 'Hyper-Labyrinth'];
            const stageName = stageNames[(game.raceStage || 1) - 1] || `Stage ${game.raceStage}`;
            this.raceStageBadge.textContent = `STAGE ${game.raceStage || 1}: ${stageName.toUpperCase()}`;
        }
        if (this.raceLapBadge && game.p1) {
            const currentLap = Math.min(game.p1.raceLap || 1, 3);
            this.raceLapBadge.textContent = `LAP ${currentLap}/3`;
        }
        if (this.racePositionsMini) {
            const standings = game.raceTrack.getStandings(game);
            this.racePositionsMini.innerHTML = '';
            standings.forEach((racer, idx) => {
                const pill = document.createElement('span');
                pill.className = `race-pos-pill pos-${idx + 1}`;
                const name = racer.customName || racer.id;
                pill.textContent = `${idx + 1}. ${name}`;
                this.racePositionsMini.appendChild(pill);
            });
        }
    }

    updatePlayerBadges(player, badges) {
        if (!player) return;

        if (badges.shield) {
            if (player.shieldHp > 0) {
                badges.shield.classList.remove('hidden');
                badges.shield.textContent = `🛡️ SHIELD: ${player.shieldHp} (${Math.ceil(player.shieldTimer)}s)`;
            } else badges.shield.classList.add('hidden');
        }

        if (badges.slow) {
            if (player.slowTimer > 0) {
                badges.slow.classList.remove('hidden');
                badges.slow.textContent = `🐌 SLOW (${Math.ceil(player.slowTimer)}s)`;
            } else badges.slow.classList.add('hidden');
        }

        if (badges.speed) {
            if (player.speedBoostTimer > 0) {
                badges.speed.classList.remove('hidden');
                badges.speed.textContent = `⚡ SPEED (${Math.ceil(player.speedBoostTimer)}s)`;
            } else badges.speed.classList.add('hidden');
        }

        if (badges.grenade) {
            if (player.grenadeTimer > 0) {
                badges.grenade.classList.remove('hidden');
                badges.grenade.textContent = `💣 GRENADES (${Math.ceil(player.grenadeTimer)}s)`;
            } else badges.grenade.classList.add('hidden');
        }

        if (badges.blocked) {
            if (player.weaponBlockedTimer > 0) badges.blocked.classList.remove('hidden');
            else badges.blocked.classList.add('hidden');
        }

        if (badges.frozen) {
            if (player.freezeTimer > 0) badges.frozen.classList.remove('hidden');
            else badges.frozen.classList.add('hidden');
        }

        if (badges.electric) {
            if (player.electricBlasterTimer > 0) badges.electric.classList.remove('hidden');
            else badges.electric.classList.add('hidden');
        }

        if (badges.mine) {
            if (player.mineLayerTimer > 0) badges.mine.classList.remove('hidden');
            else badges.mine.classList.add('hidden');
        }

        if (badges.seeker) {
            if (player.hasHeatSeeker) badges.seeker.classList.remove('hidden');
            else badges.seeker.classList.add('hidden');
        }

        if (badges.laser) {
            if ((player.laserAmmo || 0) > 0) {
                badges.laser.classList.remove('hidden');
                badges.laser.textContent = `⚡ LASER: ${player.laserAmmo}`;
            } else badges.laser.classList.add('hidden');
        }

        if (badges.stasis) {
            if ((player.immobilizerAmmo || 0) > 0) {
                badges.stasis.classList.remove('hidden');
                badges.stasis.textContent = `❄️ STASIS: ${player.immobilizerAmmo}`;
            } else badges.stasis.classList.add('hidden');
        }

        if (badges.evaporation) {
            if (player.hasEvaporationBeam) badges.evaporation.classList.remove('hidden');
            else badges.evaporation.classList.add('hidden');
        }

        if (badges.tractor) {
            if (player.hasTractorBeam) badges.tractor.classList.remove('hidden');
            else badges.tractor.classList.add('hidden');
        }

        if (badges.flag) {
            if (player.capturedFlag) badges.flag.classList.remove('hidden');
            else badges.flag.classList.add('hidden');
        }

        if (badges.quad) {
            if (player.quadGunTimer > 0) {
                badges.quad.classList.remove('hidden');
                badges.quad.textContent = `⚡ QUAD-GUN (${Math.ceil(player.quadGunTimer)}s)`;
            } else badges.quad.classList.add('hidden');
        }

        if (badges.ring) {
            if (player.hasRingOfFire) {
                badges.ring.classList.remove('hidden');
                badges.ring.textContent = '🔥 RING OF FIRE';
            } else badges.ring.classList.add('hidden');
        }
    }

    /**
     * Renders vertical stack of AI Bot Health Cards on the Top Right in Multiplayer mode
     */
    updateAiHudStack(game) {
        if (!this.aiHudStack) return;

        const isMultiplayer = (game.gameMode === 'TEAM' || (game.gameMode === 'CTF' && game.aiBots && game.aiBots.length > 0));
        if (!isMultiplayer || !game.aiBots || game.aiBots.length === 0) {
            this.aiHudStack.classList.add('hidden');
            this.aiHudStack.innerHTML = '';
            return;
        }

        this.aiHudStack.classList.remove('hidden');

        // Render or update each AI bot card
        game.aiBots.forEach((bot, idx) => {
            let card = document.getElementById(`aiBotCard_${idx}`);
            if (!card) {
                card = document.createElement('div');
                card.id = `aiBotCard_${idx}`;
                card.className = 'hud-card ai-stack-card';
                card.innerHTML = `
                    <div class="ai-card-header">
                        <span class="ai-indicator" style="background: ${bot.primaryColor};"></span>
                        <span class="ai-name">${bot.aiName || `DRONE ${idx + 1}`}</span>
                        <span class="ai-status-badge" id="aiStatus_${idx}">ALIVE</span>
                    </div>
                    <div class="hp-bar-container">
                        <div class="hp-bar-fill" id="aiHpFill_${idx}" style="background: ${bot.primaryColor}; width: 100%;"></div>
                    </div>
                    <div class="ai-card-stats">
                        <span id="aiHpText_${idx}">5 / 5 HP</span>
                    </div>
                `;
                this.aiHudStack.appendChild(card);
            }

            // Update stats
            const fill = document.getElementById(`aiHpFill_${idx}`);
            const text = document.getElementById(`aiHpText_${idx}`);
            const status = document.getElementById(`aiStatus_${idx}`);

            if (fill) {
                const pct = Math.max(0, Math.min(100, (bot.hp / bot.maxHp) * 100));
                fill.style.width = `${pct}%`;
            }
            if (text) {
                text.textContent = bot.hp > 0 ? `${bot.hp} / ${bot.maxHp} HP` : 'DESTROYED';
            }
            if (status) {
                if (bot.hp <= 0) {
                    status.textContent = (game.gameMode === 'CTF') ? `RESPAWNING (${Math.ceil(bot.respawnTimer)}s)` : 'OFFLINE';
                    status.className = 'ai-status-badge offline';
                } else if (bot.capturedFlag) {
                    status.textContent = 'FLAG CARRIER';
                    status.className = 'ai-status-badge flag';
                } else {
                    status.textContent = 'HOSTILE';
                    status.className = 'ai-status-badge alive';
                }
            }
        });
    }

    /**
     * Renders clearly visible accumulating flags in the CTF score keeper
     */
    renderFlagAccumulator(blueScore, redScore) {
        if (!this.blueFlagSlots || !this.redFlagSlots) return;

        // Render Blue Flag Sockets
        this.blueFlagSlots.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const slot = document.createElement('span');
            slot.className = 'flag-slot' + (i < blueScore ? ' active blue' : '');
            slot.textContent = i < blueScore ? '🚩' : '🏳️';
            this.blueFlagSlots.appendChild(slot);
        }

        // Render Red Flag Sockets
        this.redFlagSlots.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const slot = document.createElement('span');
            slot.className = 'flag-slot' + (i < redScore ? ' active red' : '');
            slot.textContent = i < redScore ? '🚩' : '🏳️';
            this.redFlagSlots.appendChild(slot);
        }
    }

    /**
     * Controls Remapping and Main Menu Tabs Management
     */
    initControlsModal() {
        const openBtn = document.getElementById('openControlsModalBtn');
        const resetModernBtn = document.getElementById('resetModernControlsBtn');
        const resetClassicBtn = document.getElementById('resetClassicControlsBtn');
        const schemeSelect = document.getElementById('controlsSchemeSelect');

        if (this.tabMissionsBtn) {
            this.tabMissionsBtn.addEventListener('click', () => this.switchMenuTab('missions'));
        }
        if (this.tabControlsBtn) {
            this.tabControlsBtn.addEventListener('click', () => this.switchMenuTab('controls'));
        }
        if (this.backToMissionsBtn) {
            this.backToMissionsBtn.addEventListener('click', () => this.switchMenuTab('missions'));
        }

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                this.game.showMainMenu('controls');
            });
        }

        if (schemeSelect) {
            schemeSelect.value = this.game.input.controlScheme;
            schemeSelect.addEventListener('change', (e) => {
                this.game.input.setControlScheme(e.target.value);
                this.renderControlsTable();
                this.updateSidebarControlsGuide();
            });
        }

        if (resetModernBtn) {
            resetModernBtn.addEventListener('click', () => {
                this.game.input.setControlScheme('MODERN');
                this.game.input.resetToDefaults();
                if (schemeSelect) schemeSelect.value = 'MODERN';
                this.renderControlsTable();
                this.updateSidebarControlsGuide();
            });
        }

        if (resetClassicBtn) {
            resetClassicBtn.addEventListener('click', () => {
                this.game.input.setControlScheme('CLASSIC');
                this.game.input.resetToDefaults();
                if (schemeSelect) schemeSelect.value = 'CLASSIC';
                this.renderControlsTable();
                this.updateSidebarControlsGuide();
            });
        }

        // Listen for key rebinding when controls tab is active
        window.addEventListener('keydown', (e) => {
            if (this.rebindTargetAction && this.menuTabControls && !this.menuTabControls.classList.contains('hidden')) {
                e.preventDefault();
                e.stopPropagation();

                this.game.input.rebindAction(this.rebindTargetAction, e.code);
                this.rebindTargetAction = null;
                this.renderControlsTable();
                this.updateSidebarControlsGuide();
            }
        });

        // Pre-render controls table on load so it's always ready immediately
        this.renderControlsTable();
    }

    switchMenuTab(tab) {
        if (tab === 'controls') {
            if (this.tabControlsBtn) this.tabControlsBtn.classList.add('active');
            if (this.tabMissionsBtn) this.tabMissionsBtn.classList.remove('active');
            if (this.menuTabControls) this.menuTabControls.classList.remove('hidden');
            if (this.menuTabMissions) this.menuTabMissions.classList.add('hidden');
            this.renderControlsTable();
        } else {
            if (this.tabMissionsBtn) this.tabMissionsBtn.classList.add('active');
            if (this.tabControlsBtn) this.tabControlsBtn.classList.remove('active');
            if (this.menuTabMissions) this.menuTabMissions.classList.remove('hidden');
            if (this.menuTabControls) this.menuTabControls.classList.add('hidden');
        }
    }

    renderControlsTable() {
        const tableBody = document.getElementById('controlsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        const bindings = this.game.input.getCurrentBindings();

        const actionLabels = {
            'P1_FORWARD': 'P1 Forwards',
            'P1_REVERSE': 'P1 Reverse Thrusters',
            'P1_ROTATE_LEFT': 'P1 Rotate Left',
            'P1_ROTATE_RIGHT': 'P1 Rotate Right',
            'P1_STRAFE_LEFT': 'P1 Strafe Left',
            'P1_STRAFE_RIGHT': 'P1 Strafe Right',
            'P1_FIRE': 'P1 Main Fire / Charge',
            'P1_LASER': 'P1 Laser Inhibitor',
            'P1_FREEZE': 'P1 Immobilizer',
            'P1_SELF_DESTRUCT': 'P1 Self-Destruct',

            'P2_FORWARD': 'P2 Forwards',
            'P2_REVERSE': 'P2 Reverse Thrusters',
            'P2_ROTATE_LEFT': 'P2 Rotate Left',
            'P2_ROTATE_RIGHT': 'P2 Rotate Right',
            'P2_STRAFE_LEFT': 'P2 Strafe Left',
            'P2_STRAFE_RIGHT': 'P2 Strafe Right',
            'P2_FIRE': 'P2 Main Fire / Charge',
            'P2_LASER': 'P2 Laser Inhibitor',
            'P2_FREEZE': 'P2 Immobilizer',
            'P2_SELF_DESTRUCT': 'P2 Self-Destruct'
        };

        for (const [action, keys] of Object.entries(bindings)) {
            const tr = document.createElement('tr');
            const primaryKey = keys && keys.length > 0 ? keys[0] : 'None';
            const isRebinding = (this.rebindTargetAction === action);

            tr.innerHTML = `
                <td class="action-col">${actionLabels[action] || action}</td>
                <td class="key-col">
                    <button class="rebind-key-btn ${isRebinding ? 'rebinding' : ''}" data-action="${action}">
                        ${isRebinding ? 'Press any key...' : primaryKey.replace('Key', '').replace('Numpad', 'Num ')}
                    </button>
                </td>
            `;

            const btn = tr.querySelector('.rebind-key-btn');
            btn.addEventListener('click', () => {
                this.rebindTargetAction = action;
                this.renderControlsTable();
            });

            tableBody.appendChild(tr);
        }
    }

    initChassisSelect() {
        const setupChassis = (containerId, playerKey, labelId) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            const label = document.getElementById(labelId);
            const defaultChassis = (playerKey === 'p1') ? 'VIPER' : 'CRUISER';
            const storageKey = `starship_${playerKey}_chassis`;
            const currentChassis = (typeof localStorage !== 'undefined' && (localStorage.getItem(storageKey) || localStorage.getItem(`${playerKey}_chassis`))) || defaultChassis;

            const primaryColor = (playerKey === 'p1') ? '#00f2fe' : '#ff007f';
            const secondaryColor = (playerKey === 'p1') ? '#4facfe' : '#ff5e62';

            const btns = container.querySelectorAll('.chassis-card-btn, .segment-btn');
            btns.forEach(btn => {
                const cVal = btn.getAttribute('data-chassis');
                if (cVal === currentChassis) {
                    btn.classList.add('active');
                    if (label) label.textContent = cVal;
                } else {
                    btn.classList.remove('active');
                }

                // Render live preview canvas
                const canvas = btn.querySelector('.chassis-preview-canvas');
                if (canvas && typeof Player !== 'undefined' && typeof Player.renderShip === 'function') {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(0.80, 0.80);
                    // Draw ship facing right with active engine thruster
                    Player.renderShip(ctx, cVal, primaryColor, secondaryColor, true, 0.85, 1.0, false, primaryColor, false);
                    ctx.restore();
                }

                btn.addEventListener('click', () => {
                    btns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (label) label.textContent = cVal;

                    const targetPlayer = (playerKey === 'p1') ? this.game.p1 : this.game.p2;
                    if (targetPlayer) targetPlayer.setChassis(cVal);
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(storageKey, cVal);
                        localStorage.setItem(`${playerKey}_chassis`, cVal);
                    }
                });
            });
        };

        setupChassis('p1ChassisSelect', 'p1', 'p1SelectedChassisLabel');
        setupChassis('p2ChassisSelect', 'p2', 'p2SelectedChassisLabel');
    }

    updateSidebarControlsGuide() {
        // Reflect current key bindings into sidebar guide
        const bindings = this.game.input.getCurrentBindings();
        const setKeyText = (dataKey, action) => {
            const el = document.querySelector(`.controls-panel .key[data-action="${action}"]`);
            if (el && bindings[action] && bindings[action][0]) {
                el.textContent = bindings[action][0].replace('Key', '').replace('Numpad', 'Num ');
            }
        };

        setKeyText('KeyW', 'P1_FORWARD');
        setKeyText('KeyS', 'P1_REVERSE');
        setKeyText('KeyA', 'P1_ROTATE_LEFT');
        setKeyText('KeyD', 'P1_ROTATE_RIGHT');
        setKeyText('KeyQ', 'P1_STRAFE_LEFT');
        setKeyText('KeyE', 'P1_STRAFE_RIGHT');
    }
}
