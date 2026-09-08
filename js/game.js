/**
 * ============================================================================
 * Starship Arena - Core Game Coordinator (Game)
 * ============================================================================
 * Description:
 *   Central game coordinator and real-time animation loop engine.
 *   Manages rendering pipeline, physics integration, collision detection,
 *   hazard systems (asteroids, black holes, hydraulic crusher traps),
 *   tactical munitions (cone evaporation lasers, shockwave grenades, chain mines),
 *   Capture The Flag operations, multiplayer wingman mechanics, and pause state.
 *
 * Responsibilities:
 *   - Frame-rate independent game loop with delta-time clamping.
 *   - Pause state coordinator ('P' key / HUD button) with complete audio & physics suspension.
 *   - Drifting asteroid hazard simulation (Big, Medium, Small, weapon absorption, barrier phasing).
 *   - Rotating blade collision processing against hulls, bullets, and mines.
 *   - Capture The Flag continuous respawn engine with bulletproof audio cleanup on death.
 *   - Spacetime Labyrinth and sliding blast door updates.
 *   - Victory conditions, score tracking, and mode transitions (PVP, CTF, Team Combat).
 * ============================================================================
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.input = new InputHandler();
        this.soundFx = new SoundFX();

        this.p1 = null;
        this.p2 = null;
        this.projectiles = [];
        this.lasers = [];
        this.stasisBeams = [];
        this.particles = [];
        this.shockwaves = [];
        this.obstacles = [];
        this.blackHoles = [];
        this.mines = [];
        this.powerUps = [];
        this.asteroids = [];
        this.crushers = [];
        this.slidingDoors = [];
        this.stealthNebulae = [];
        this.bases = [];
        this.labyrinthSystem = null;

        this.bombSpawnTimer = 2.0;
        this.blackHoleSpawnTimer = 4.0;
        this.asteroidSpawnTimer = 2.5;

        this.p1SpawnX = 0;
        this.p1SpawnY = 0;
        this.p2SpawnX = 0;
        this.p2SpawnY = 0;

        window._currentGame = this;

        this.gameMode = 'MENU'; // 'MENU', 'PVP', 'CTF', 'TEAM'
        this.isPaused = false;
        this.playerCount = 1;
        this.aiCount = 2;
        this.blueScore = 0;
        this.redScore = 0;
        this.blueFlag = null;
        this.redFlag = null;
        this.aiBots = [];
        this.hasActiveMatch = false;
        this.ctfPilots = 1;
        this.ctfAi = 1;
        this.ctfLevel = 1; // 1: Outpost, 2: Sliding Doors, 3: Spacetime Labyrinth
        this.teamPilots = 1;
        this.teamAi = 2;

        this.currentRound = 1;
        this.p1RoundWins = 0;
        this.p2RoundWins = 0;

        this.gameOver = false;
        this.roundOver = false;
        this.bumpCooldown = 0;
        this.aiDifficultyLevel = 3;

        // UI & Audio Toggles
        this.audioToggle = document.getElementById('audioToggle');
        this.soundHeaderBtn = document.getElementById('soundHeaderBtn');
        this.soundHeaderIcon = document.getElementById('soundHeaderIcon');
        this.pauseHeaderBtn = document.getElementById('pauseHeaderBtn');

        if (this.audioToggle) this.audioToggle.addEventListener('change', () => this.toggleAudio(this.audioToggle.checked));
        if (this.soundHeaderBtn) this.soundHeaderBtn.addEventListener('click', () => this.toggleAudio(!this.soundFx.enabled));
        if (this.pauseHeaderBtn) this.pauseHeaderBtn.addEventListener('click', () => this.togglePause());
        const pauseResumeBtn = document.getElementById('pauseResumeBtn');
        if (pauseResumeBtn) pauseResumeBtn.addEventListener('click', () => this.togglePause());
        const pauseMainMenuBtn = document.getElementById('pauseMainMenuBtn');
        if (pauseMainMenuBtn) pauseMainMenuBtn.addEventListener('click', () => {
            if (this.isPaused) this.togglePause();
            this.showMainMenu();
        });

        this.trailToggle = document.getElementById('trailToggle');
        this.gridToggle = document.getElementById('gridToggle');
        this.fpsValue = document.getElementById('fpsValue');

        this.roundBadge = document.getElementById('roundBadge');
        this.scoreBadge = document.getElementById('scoreBadge');
        this.mapNameText = document.getElementById('mapNameText');

        this.mainMenuBtn = document.getElementById('mainMenuBtn');
        this.modeBadge = document.getElementById('modeBadge');
        this.mainMenuModal = document.getElementById('mainMenuModal');
        this.resumeGameBtn = document.getElementById('resumeGameBtn');
        this.startPvpBtn = document.getElementById('startPvpBtn');
        this.startCtfBtn = document.getElementById('startCtfBtn');
        this.startTeamBtn = document.getElementById('startTeamBtn');
        this.modalMenuBtn = document.getElementById('modalMenuBtn');

        this.gameOverModal = document.getElementById('gameOverModal');
        this.winnerText = document.getElementById('winnerText');
        this.winnerSubText = document.getElementById('winnerSubText');
        this.restartBtn = document.getElementById('restartBtn');

        this.evaporationBeams = [];
        this.tractorBeams = [];
        this.ghostShips = [];
        this.ringsOfFire = [];
        this.stealthNebulae = [];
        this.stars = [];

        this.restartBtn.addEventListener('click', () => this.handleModalButtonClick());
        if (this.mainMenuBtn) this.mainMenuBtn.addEventListener('click', () => this.showMainMenu());
        if (this.resumeGameBtn) this.resumeGameBtn.addEventListener('click', () => this.hideMainMenu());
        if (this.modalMenuBtn) this.modalMenuBtn.addEventListener('click', () => this.showMainMenu());

        if (this.startPvpBtn) {
            this.startPvpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startMode('PVP');
            });
        }
        if (this.startCtfBtn) {
            this.startCtfBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startMode('CTF');
            });
        }
        if (this.startTeamBtn) {
            this.startTeamBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startMode('TEAM');
            });
        }

        const modeCards = [
            { id: 'cardPvp', mode: 'PVP' },
            { id: 'cardCtf', mode: 'CTF' },
            { id: 'cardTeam', mode: 'TEAM' }
        ];
        modeCards.forEach(({ id, mode }) => {
            const card = document.getElementById(id);
            if (!card) return;
            card.addEventListener('click', (e) => {
                if (e.target.closest('.mode-controls') || e.target.closest('.mode-launch-btn')) return;
                modeCards.forEach(mc => {
                    const c = document.getElementById(mc.id);
                    if (c) c.classList.remove('active');
                });
                card.classList.add('active');
                this.startMode(mode);
            });
        });

        // CTF Level Selector
        const setupCtfLevelSelect = () => {
            const container = document.getElementById('ctfLevelSelect');
            if (!container) return;
            const btns = container.querySelectorAll('.segment-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    btns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.ctfLevel = parseInt(btn.getAttribute('data-val'), 10);
                });
            });
        };
        setupCtfLevelSelect();

        const setupSegment = (containerId, onSelect) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            const btns = container.querySelectorAll('.segment-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    btns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    onSelect(parseInt(btn.getAttribute('data-val'), 10));
                });
            });
        };
        setupSegment('ctfPlayerSelect', val => this.ctfPilots = val);
        setupSegment('ctfAiSelect', val => this.ctfAi = val);
        setupSegment('teamPlayerSelect', val => this.teamPilots = val);
        setupSegment('teamAiSelect', val => this.teamAi = val);

        // Audio Activation
        window.addEventListener('pointerdown', () => this.soundFx.init(), { once: true });
        window.addEventListener('click', () => this.soundFx.init(), { once: true });
        window.addEventListener('keydown', (e) => {
            this.soundFx.init();

            // Pause key 'P'
            if (e.key === 'p' || e.key === 'P') {
                if (this.gameMode !== 'MENU') {
                    this.togglePause();
                }
            }

            if (e.key === 'r' || e.key === 'R') {
                if (this.roundOver || this.gameOver) {
                    this.handleModalButtonClick();
                }
            }
            if (e.key === 'm' || e.key === 'M') {
                if (this.roundOver || this.gameOver) {
                    this.showMainMenu();
                }
            }
            if (e.key === 'Escape') {
                if (this.mainMenuModal && !this.mainMenuModal.classList.contains('hidden')) {
                    if (this.hasActiveMatch) this.hideMainMenu();
                } else {
                    this.showMainMenu();
                }
            }
        });

        // Initialize UI Manager
        this.ui = new UIManager(this);

        this.initResize();
        this.initStars();
        this.setupAiDifficultyControl();
        this.showMainMenu();

        this.lastTime = 0;
        this.fpsTimer = 0;
        this.frameCount = 0;

        requestAnimationFrame((ts) => this.loop(ts));
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.soundFx.stopAllCharges();
        }
        const pauseOverlay = document.getElementById('pauseModalOverlay');
        if (pauseOverlay) {
            if (this.isPaused) pauseOverlay.classList.remove('hidden');
            else pauseOverlay.classList.add('hidden');
        }
        if (this.pauseHeaderBtn) {
            this.pauseHeaderBtn.innerHTML = this.isPaused ? '▶ RESUME' : '⏸ PAUSE';
        }
    }

    toggleAudio(enable) {
        this.soundFx.enabled = enable;
        if (!enable) this.soundFx.stopAllCharges();
        if (this.audioToggle) this.audioToggle.checked = enable;
        if (this.soundHeaderBtn) {
            this.soundHeaderBtn.innerHTML = enable 
                ? '<span class="sound-icon" id="soundHeaderIcon">🔊</span> Sound ON'
                : '<span class="sound-icon" id="soundHeaderIcon">🔇</span> Sound OFF';
        }
    }

    initResize() {
        this.logicalWidth = 1200;
        this.logicalHeight = 750;

        const resize = () => {
            const wrapper = this.canvas.parentElement;
            if (!wrapper) return;
            const wWidth = wrapper.clientWidth;
            const wHeight = wrapper.clientHeight;

            const scale = Math.min(wWidth / this.logicalWidth, wHeight / this.logicalHeight);
            this.canvas.width = this.logicalWidth;
            this.canvas.height = this.logicalHeight;

            this.canvas.style.width = `${this.logicalWidth * scale}px`;
            this.canvas.style.height = `${this.logicalHeight * scale}px`;
        };

        window.addEventListener('resize', resize);
        resize();
    }

    setupAiDifficultyControl() {
        const headerSlider = document.getElementById('aiDifficultySliderHeader');
        const sidebarSlider = document.getElementById('aiDifficultySliderSidebar');
        const menuSlider = document.getElementById('aiDifficultySliderMenu');

        const headerBadge = document.getElementById('aiLevelBadgeHeader');
        const sidebarBadge = document.getElementById('aiLevelBadgeSidebar');
        const menuBadge = document.getElementById('aiLevelBadgeMenu');
        const menuDesc = document.getElementById('aiLevelDescMenu');

        const updateAll = (val) => {
            const level = parseInt(val, 10);
            this.aiDifficultyLevel = level;
            const preset = AI_DIFFICULTY_PRESETS[level] || AI_DIFFICULTY_PRESETS[3];

            [headerSlider, sidebarSlider, menuSlider].forEach(s => { if (s) s.value = level; });
            [headerBadge, sidebarBadge, menuBadge].forEach(b => {
                if (b) {
                    b.className = `ai-level-badge ${preset.badgeClass}`;
                    b.textContent = preset.label;
                }
            });
            if (menuDesc) menuDesc.textContent = preset.desc;
        };

        [headerSlider, sidebarSlider, menuSlider].forEach(slider => {
            if (slider) slider.addEventListener('input', (e) => updateAll(e.target.value));
        });

        updateAll(3);
    }

    showMainMenu(initialTab = 'missions') {
        this.soundFx.stopAllCharges();
        if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
        if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
        if (this.resumeGameBtn) {
            if (this.hasActiveMatch) this.resumeGameBtn.classList.remove('hidden');
            else this.resumeGameBtn.classList.add('hidden');
        }
        if (this.ui && typeof this.ui.switchMenuTab === 'function') {
            this.ui.switchMenuTab(initialTab);
        }
    }

    hideMainMenu() {
        if (this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
        if (this.ui && typeof this.ui.switchMenuTab === 'function') {
            this.ui.switchMenuTab('missions');
        }
    }

    startMode(mode) {
        this.gameMode = mode;
        this.hasActiveMatch = true;
        this.isPaused = false;
        const pauseOverlay = document.getElementById('pauseModalOverlay');
        if (pauseOverlay) pauseOverlay.classList.add('hidden');

        if (mode === 'PVP') {
            this.playerCount = 2;
            this.aiCount = 0;
            this.modeBadge.textContent = '⚔️ PVP DUEL';
            this.currentRound = 1;
            this.p1RoundWins = 0;
            this.p2RoundWins = 0;
            this.startRound(1);
        } else if (mode === 'CTF') {
            this.playerCount = this.ctfPilots || 1;
            this.aiCount = this.ctfAi || 1;
            this.modeBadge.textContent = `🚩 CTF L${this.ctfLevel || 1}`;
            this.startCtfMatch();
        } else if (mode === 'TEAM') {
            this.playerCount = this.teamPilots || 1;
            this.aiCount = this.teamAi || 2;
            this.modeBadge.textContent = '🛡️ TEAM SQUAD';
            this.currentRound = 1;
            this.p1RoundWins = 0;
            this.p2RoundWins = 0;
            this.startRound(1);
        }

        this.hideMainMenu();
    }

    startRound(roundNum) {
        this.currentRound = roundNum;
        if (roundNum === 1) {
            this.p1RoundWins = 0;
            this.p2RoundWins = 0;
        }
        this.gameOver = false;
        this.roundOver = false;
        this.countdownTimer = 3.2;

        this.gameOverModal.classList.add('hidden');
        this.roundBadge.textContent = `ROUND ${this.currentRound} OF 5`;
        this.scoreBadge.textContent = `SCORE: P1 (${this.p1RoundWins}) - P2 (${this.p2RoundWins})`;

        LevelManager.setupArena(this);
        this.resetPlayers();
        this.ui.update();
    }

    startCtfMatch() {
        this.blueScore = 0;
        this.redScore = 0;
        this.gameOver = false;
        this.roundOver = false;
        this.countdownTimer = 3.2;

        this.gameOverModal.classList.add('hidden');
        this.roundBadge.textContent = `CTF LEVEL ${this.ctfLevel}`;
        this.scoreBadge.textContent = 'CORE RAID';

        LevelManager.setupArena(this);
        this.resetPlayers();

        // Setup Flags
        this.blueFlag = new Flag('BLUE', 90, this.logicalHeight / 2);
        this.redFlag = new Flag('RED', this.logicalWidth - 90, this.logicalHeight / 2);

        this.ui.update();
    }

    resetPlayers() {
        this.soundFx.stopAllCharges();
        this.input.reset();

        const baseHp = 5 + (this.currentRound - 1) * 5;
        this.aiBots = [];
        this.projectiles = [];
        this.lasers = [];
        this.stasisBeams = [];
        this.evaporationBeams = [];
        this.tractorBeams = [];
        this.ghostShips = [];
        this.ringsOfFire = [];
        this.mines = [];
        this.powerUps = [];
        this.shockwaves = [];
        this.blackHoles = [];
        this.asteroids = [];

        if (this.gameMode === 'CTF') {
            // Player 1 (Blue Wing Commander)
            this.p1 = new Player('P1', 130, this.logicalHeight / 2, '#00f2fe', '#4facfe', 0, 8, false, 'BLUE');

            // Player 2 (Human Wingman or Blue Drone)
            if (this.playerCount === 2) {
                this.p2 = new Player('P2', 130, this.logicalHeight / 2 + 70, '#00f2fe', '#4facfe', 0, 8, false, 'BLUE');
            } else {
                this.p2 = null;
            }

            // Red Team AI Drone Squad
            const redX = this.logicalWidth - 130;
            for (let i = 0; i < this.aiCount; i++) {
                const yOffset = (i - (this.aiCount - 1) / 2) * 80;
                const bot = new Player(`AI_RED_${i + 1}`, redX, this.logicalHeight / 2 + yOffset, '#ff007f', '#ff5e62', Math.PI, 8, true, 'RED', `RAIDER-${i + 1}`);
                this.aiBots.push(bot);
            }

        } else if (this.gameMode === 'TEAM') {
            // Team Combat (Blue Pilots vs Red AI Drones)
            this.p1 = new Player('P1', this.p1SpawnX, this.p1SpawnY, '#00f2fe', '#4facfe', 0, baseHp, false, 'BLUE');

            if (this.playerCount === 2) {
                this.p2 = new Player('P2', this.p1SpawnX, this.p1SpawnY + 70, '#00f2fe', '#4facfe', 0, baseHp, false, 'BLUE');
            } else {
                this.p2 = null;
            }

            for (let i = 0; i < this.aiCount; i++) {
                const yOffset = (i - (this.aiCount - 1) / 2) * 75;
                const bot = new Player(`AI_RED_${i + 1}`, this.p2SpawnX, this.p2SpawnY + yOffset, '#ff007f', '#ff5e62', Math.PI, baseHp, true, 'RED', `SWARM-${i + 1}`);
                this.aiBots.push(bot);
            }

        } else {
            // Classic PVP Duel
            this.p1 = new Player('P1', this.p1SpawnX, this.p1SpawnY, '#00f2fe', '#4facfe', 0, baseHp, false, 'P1');
            this.p2 = new Player('P2', this.p2SpawnX, this.p2SpawnY, '#ff007f', '#ff5e62', Math.PI, baseHp, false, 'P2');
        }

        // Permanent Black Hole for Round 5
        if (this.currentRound === 5 && this.gameMode !== 'CTF') {
            this.blackHoles.push(new BlackHole(this.logicalWidth / 2, this.logicalHeight / 2, true));
        }

        // Seed initial drifting asteroids after ships are positioned
        this.seedAsteroids();
    }

    seedAsteroids() {
        this.asteroids = [];
        const sizes = ['BIG', 'MEDIUM', 'SMALL'];
        const spawnPoints = [
            { x: this.p1SpawnX, y: this.p1SpawnY },
            { x: this.p2SpawnX, y: this.p2SpawnY },
            { x: 130, y: this.logicalHeight / 2 },
            { x: this.logicalWidth - 130, y: this.logicalHeight / 2 }
        ];
        const allShips = this.getAllShips();
        for (const s of allShips) {
            if (s) spawnPoints.push({ x: s.x, y: s.y });
        }

        for (let i = 0; i < 3; i++) {
            const size = sizes[i % sizes.length];
            let x = 0, y = 0, safe = false;
            let attempts = 0;
            while (!safe && attempts < 50) {
                attempts++;
                x = Math.random() * (this.logicalWidth - 260) + 130;
                y = Math.random() * (this.logicalHeight - 260) + 130;
                safe = true;
                for (const sp of spawnPoints) {
                    if (Math.hypot(x - sp.x, y - sp.y) < 200) {
                        safe = false;
                        break;
                    }
                }
            }
            this.asteroids.push(new Asteroid(x, y, size));
        }
    }

    spawnAsteroidFromEdge() {
        const sizes = ['BIG', 'MEDIUM', 'SMALL'];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left

        let x = 0, y = 0;
        if (edge === 0) { x = Math.random() * this.logicalWidth; y = -30; }
        else if (edge === 1) { x = this.logicalWidth + 30; y = Math.random() * this.logicalHeight; }
        else if (edge === 2) { x = Math.random() * this.logicalWidth; y = this.logicalHeight + 30; }
        else { x = -30; y = Math.random() * this.logicalHeight; }

        const targetX = this.logicalWidth / 2 + (Math.random() - 0.5) * 400;
        const targetY = this.logicalHeight / 2 + (Math.random() - 0.5) * 300;
        const angle = Math.atan2(targetY - y, targetX - x);

        const ast = new Asteroid(x, y, size);
        ast.vx = Math.cos(angle) * ast.speed;
        ast.vy = Math.sin(angle) * ast.speed;
        this.asteroids.push(ast);
    }

    getAllShips() {
        const list = [];
        if (this.p1) list.push(this.p1);
        if (this.p2) list.push(this.p2);
        if (this.aiBots && this.aiBots.length > 0) {
            list.push(...this.aiBots);
        }
        return list;
    }

    spawnPowerUp() {
        let attempts = 0;
        let x = 0, y = 0;
        const margin = 70;

        while (attempts < 30) {
            x = Math.random() * (this.logicalWidth - margin * 2) + margin;
            y = Math.random() * (this.logicalHeight - margin * 2) + margin;

            let hitsObs = false;
            for (const obs of this.obstacles) {
                if (obs.collidesWithRect(x - 20, y - 20, 40, 40)) {
                    hitsObs = true; break;
                }
            }
            if (!hitsObs) break;
            attempts++;
        }

        const isCoop = (this.playerCount === 2);
        const roll = Math.random();
        let type = 'BOMB';

        if (roll < 0.05) type = 'HAZARD_DAMAGE';
        else if (roll < 0.10) type = 'HAZARD_SLOW';
        else if (roll < 0.17) type = 'ROTATING_BLADE'; // Rotating blade power-up!
        else if (roll < 0.24) type = 'IMMOBILIZER'; // Stasis Immobilizer
        else if (roll < 0.31) type = 'LASER_INHIBITOR'; // Continuous Laser Inhibitor
        else if (roll < 0.38) type = 'SHIELD';
        else if (roll < 0.45) type = 'HEALTH';
        else if (roll < 0.52) type = 'SPEED';
        else if (roll < 0.58) type = 'MINE';
        else if (roll < 0.64) type = 'EVAPORATION';
        else if (roll < 0.70) type = 'TRACTOR_BEAM';
        else if (roll < 0.76) type = 'DOPPELGANGER';
        else if (roll < 0.82) type = 'QUAD_GUN';
        else if (roll < 0.88) type = 'RING_OF_FIRE';
        else if (isCoop && roll < 0.94) type = 'RESURRECT_PARTNER'; // Multiplayer revive
        else if (isCoop) type = 'PARTNER_BOON'; // Multiplayer boon
        else type = 'BOMB';

        this.powerUps.push(new PowerUpItem(x, y, type));
    }

    triggerGrenadeExplosion(grenadeX, grenadeY, attackerId, isBounced = false) {
        const blastRadius = 115;
        this.soundFx.playWhompExplosion();

        // Expanding circular shockwave ring
        this.shockwaves.push(new ShockwaveRing(grenadeX, grenadeY, blastRadius, '#ff7b00', 0.48));
        this.shockwaves.push(new ShockwaveRing(grenadeX, grenadeY, blastRadius * 0.75, '#ffb703', 0.35));

        // Debris particles
        for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 400 + 80;
            this.particles.push(new Particle(
                grenadeX, grenadeY,
                Math.cos(a) * spd, Math.sin(a) * spd,
                i % 2 === 0 ? '#ff7b00' : '#ffb703',
                Math.random() * 5 + 2, 0.07
            ));
        }

        const allShips = this.getAllShips();
        const attacker = allShips.find(s => s.id === attackerId);

        for (const p of allShips) {
            if (p.hp <= 0) continue;
            if (!isBounced && attacker && p.team !== 'NONE' && p.team === attacker.team && p !== attacker) continue;

            const pcx = p.x + p.width / 2;
            const pcy = p.y + p.height / 2;
            const dist = Math.hypot(pcx - grenadeX, pcy - grenadeY);

            if (dist <= blastRadius) {
                const dmg = (dist <= 40) ? 4 : 2;
                p.takeDamage(dmg, this.particles, this.soundFx);
            }
        }

        // Damage nearby asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const ast = this.asteroids[i];
            if (ast.destroyed) continue;
            const dist = Math.hypot(ast.x - grenadeX, ast.y - grenadeY);
            if (dist <= blastRadius + ast.radius) {
                const dmg = (dist <= 40 + ast.radius) ? 3 : 1;
                ast.takeDamage(dmg, this.particles, this.soundFx, this.asteroids);
            }
        }

        this.ui.update();
        this.checkVictoryConditions();
    }

    triggerHeatSeekerExplosion(seekerX, seekerY, attackerId, isBounced = false) {
        const blastRadius = 80;
        this.soundFx.playExplosion();

        this.shockwaves.push(new ShockwaveRing(seekerX, seekerY, blastRadius, '#ff5e62', 0.4));

        for (let i = 0; i < 35; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 450 + 100;
            this.particles.push(new Particle(
                seekerX, seekerY,
                Math.cos(a) * spd, Math.sin(a) * spd,
                i % 2 === 0 ? '#ffb703' : '#ff5e62',
                Math.random() * 6 + 2, 0.07
            ));
        }

        const allShips = this.getAllShips();
        const attacker = allShips.find(s => s.id === attackerId);

        for (const p of allShips) {
            if (p.hp <= 0) continue;
            if (!isBounced && attacker && p.team !== 'NONE' && p.team === attacker.team && p !== attacker) continue;

            const pcx = p.x + p.width / 2;
            const pcy = p.y + p.height / 2;
            const dist = Math.hypot(pcx - seekerX, pcy - seekerY);

            if (dist <= blastRadius) {
                p.takeDamage(2, this.particles, this.soundFx);
            }
        }

        // Damage nearby asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const ast = this.asteroids[i];
            if (ast.destroyed) continue;
            const dist = Math.hypot(ast.x - seekerX, ast.y - seekerY);
            if (dist <= blastRadius + ast.radius) {
                ast.takeDamage(2, this.particles, this.soundFx, this.asteroids);
            }
        }

        this.ui.update();
        this.checkVictoryConditions();
    }

    loop(timestamp) {
        try {
            if (!this.lastTime) this.lastTime = timestamp;
            let dt = (timestamp - this.lastTime) / 1000;
            dt = Math.min(dt, 0.1);
            this.lastTime = timestamp;

            // FPS Counter
            this.fpsTimer += dt;
            this.frameCount++;
            if (this.fpsTimer >= 0.5) {
                const fps = Math.round(this.frameCount / this.fpsTimer);
                if (this.fpsValue) this.fpsValue.textContent = `${fps} FPS`;
                this.fpsTimer = 0;
                this.frameCount = 0;
            }

            if (!this.isPaused) {
                this.update(dt);
            }

            this.render();

        } catch(err) {
            console.error('Game loop error:', err);
        }

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
        if (this.bumpCooldown > 0) this.bumpCooldown -= dt;

        // Countdown Timer
        if (this.countdownTimer > 0) {
            const prevSec = Math.ceil(this.countdownTimer);
            this.countdownTimer -= dt;
            const currSec = Math.ceil(this.countdownTimer);

            if (currSec < prevSec) {
                if (currSec > 0) this.soundFx.playCountdownBeep();
                else this.soundFx.playCountdownGo();
            }
            return; // Pause gameplay mechanics during countdown
        }

        const allShips = this.getAllShips();

        // 1. Spacetime Labyrinth (CTF Level 3)
        if (this.labyrinthSystem) {
            this.labyrinthSystem.update(dt, this);
        }

        // 2. Sliding Blast Doors (CTF Level 2)
        for (const door of this.slidingDoors) {
            door.update(dt, this.soundFx);
        }

        // 3. Hydraulic Crusher Traps
        for (const crusher of this.crushers) {
            crusher.update(dt, this);
        }

        // 3b. Repair & Forcefield Starbases
        for (const base of this.bases) {
            base.update(dt, allShips, this.particles, this.soundFx);
        }

        // 4. Asteroid Hazards
        this.asteroidSpawnTimer -= dt;
        if (this.asteroidSpawnTimer <= 0 && this.asteroids.length < 5) {
            this.asteroidSpawnTimer = Math.random() * 3.0 + 2.5;
            this.spawnAsteroidFromEdge();
        }

        for (let a = this.asteroids.length - 1; a >= 0; a--) {
            const ast = this.asteroids[a];
            ast.update(dt);

            if (ast.isOutOfBounds(this.logicalWidth, this.logicalHeight) || ast.destroyed) {
                this.asteroids.splice(a, 1);
                continue;
            }

            // Ship vs Asteroid Bashing (incurs damage, bumps ship, phases through barriers)
            for (const ship of allShips) {
                if (ship.hp <= 0) continue;
                const scx = ship.x + ship.width / 2;
                const scy = ship.y + ship.height / 2;
                const dist = Math.hypot(scx - ast.x, scy - ast.y);

                if (dist <= ast.radius + ship.width / 2) {
                    const cd = ast.hitCooldowns.get(ship.id) || 0;
                    if (cd <= 0) {
                        ship.takeDamage(ast.damage, this.particles, this.soundFx);
                        ast.hitCooldowns.set(ship.id, 0.8);
                        this.soundFx.playBump();

                        // Kinetic knockback
                        const bAngle = Math.atan2(scy - ast.y, scx - ast.x);
                        ship.vx += Math.cos(bAngle) * 220;
                        ship.vy += Math.sin(bAngle) * 220;

                        this.ui.update();
                        this.checkVictoryConditions();
                    }
                }
            }
        }

        // 5. CTF Continuous Base Respawn System with Audio Bug Fix
        if (this.gameMode === 'CTF') {
            for (const ship of allShips) {
                if (ship.hp <= 0) {
                    // Bulletproof audio stop on death in CTF
                    this.soundFx.stopCharge(ship.id);
                    ship.virtualFirePressed = false;
                    ship.isCharging = false;
                    ship.chargeTimer = 0;

                    if (ship.capturedFlag) {
                        ship.capturedFlag.drop(ship.x + ship.width / 2, ship.y + ship.height / 2, this.soundFx);
                        ship.capturedFlag = null;
                    }
                    ship.respawnTimer -= dt;
                    if (ship.respawnTimer <= 0) {
                        const isBlue = (ship.team === 'BLUE');
                        ship.hp = ship.maxHp;
                        ship.x = isBlue ? 130 : this.logicalWidth - 130;
                        ship.y = this.logicalHeight / 2 + (Math.random() - 0.5) * 80;
                        ship.vx = 0;
                        ship.vy = 0;
                        ship.turretAngle = isBlue ? 0 : Math.PI;
                        ship.invulnerableTimer = 2.5;
                        ship.respawnTimer = 3.0;
                        ship.pushOutFromObstacles(this.obstacles);
                    }
                } else {
                    ship.respawnTimer = 3.0;
                }
            }
        }

        // 6. Update Human Ships & Projectile Firing
        const enableTrail = this.trailToggle ? this.trailToggle.checked : true;

        if (this.p1 && this.p1.hp > 0) {
            if (this.input.isPressed('P1_SELF_DESTRUCT')) {
                this.p1.triggerSelfDestruct(this);
            }
            if (this.p1.hp > 0) {
                const p1Target = this.getClosestEnemy(this.p1);
                const shot = this.p1.update(dt, this.input, this.logicalWidth, this.logicalHeight, enableTrail, this.particles, this.obstacles, this.soundFx, this.mines, this.evaporationBeams, this.tractorBeams, p1Target);
                if (shot) {
                    if (Array.isArray(shot)) this.projectiles.push(...shot);
                    else this.projectiles.push(shot);
                }

                const laser = this.p1.tryShootLaser(this.input, this.soundFx);
                if (laser) this.lasers.push(laser);

                const freeze = this.p1.tryShootFreeze(this.input, this.soundFx);
                if (freeze) this.stasisBeams.push(freeze);
            }
        }

        if (this.p2 && this.p2.hp > 0 && !this.p2.isAI) {
            if (this.input.isPressed('P2_SELF_DESTRUCT')) {
                this.p2.triggerSelfDestruct(this);
            }
            if (this.p2.hp > 0) {
                const p2Target = this.getClosestEnemy(this.p2);
                const shot = this.p2.update(dt, this.input, this.logicalWidth, this.logicalHeight, enableTrail, this.particles, this.obstacles, this.soundFx, this.mines, this.evaporationBeams, this.tractorBeams, p2Target);
                if (shot) {
                    if (Array.isArray(shot)) this.projectiles.push(...shot);
                    else this.projectiles.push(shot);
                }

                const laser = this.p2.tryShootLaser(this.input, this.soundFx);
                if (laser) this.lasers.push(laser);

                const freeze = this.p2.tryShootFreeze(this.input, this.soundFx);
                if (freeze) this.stasisBeams.push(freeze);
            }
        }

        // 7. Update AI Drones
        for (const bot of this.aiBots) {
            if (bot.hp > 0) {
                const botTarget = this.getClosestEnemy(bot);
                const shot = bot.update(dt, this.input, this.logicalWidth, this.logicalHeight, enableTrail, this.particles, this.obstacles, this.soundFx, this.mines, this.evaporationBeams, this.tractorBeams, botTarget);
                if (shot) {
                    if (Array.isArray(shot)) this.projectiles.push(...shot);
                    else this.projectiles.push(shot);
                }

                const laser = bot.tryShootLaser(this.input, this.soundFx);
                if (laser) this.lasers.push(laser);

                const freeze = bot.tryShootFreeze(this.input, this.soundFx);
                if (freeze) this.stasisBeams.push(freeze);
            }
        }

        // 8. Rotating Blade Collisions against Enemy Ships, Bullets, Mines & Asteroids
        for (const ship of allShips) {
            if (ship.hp <= 0 || ship.bladeTimer <= 0) continue;

            const scx = ship.x + ship.width / 2;
            const scy = ship.y + ship.height / 2;
            const orbitRadius = 44;

            for (let b = 0; b < 2; b++) {
                const bAngle = ship.bladeAngle + (b * Math.PI);
                const bx = scx + Math.cos(bAngle) * orbitRadius;
                const by = scy + Math.sin(bAngle) * orbitRadius;

                // Blade vs Enemy Ships
                for (const target of allShips) {
                    if (target === ship || target.hp <= 0) continue;
                    if (target.team !== 'NONE' && target.team === ship.team) continue;

                    const tcx = target.x + target.width / 2;
                    const tcy = target.y + target.height / 2;
                    if (Math.hypot(tcx - bx, tcy - by) <= target.width / 2 + 12) {
                        const cd = ship.bladeHitCooldowns.get(target.id) || 0;
                        if (cd <= 0) {
                            target.takeDamage(2, this.particles, this.soundFx);
                            ship.bladeHitCooldowns.set(target.id, 0.35);
                            this.soundFx.playBladeSlice();

                            // Slicing sparks
                            for (let k = 0; k < 12; k++) {
                                const a = Math.random() * Math.PI * 2;
                                this.particles.push(new Particle(bx, by, Math.cos(a) * 220, Math.sin(a) * 220, '#00f5d4', 3, 0.08));
                            }
                            this.ui.update();
                            this.checkVictoryConditions();
                        }
                    }
                }

                // Blade vs Asteroids
                for (let aIdx = this.asteroids.length - 1; aIdx >= 0; aIdx--) {
                    const ast = this.asteroids[aIdx];
                    if (ast.destroyed) continue;
                    if (Math.hypot(ast.x - bx, ast.y - by) <= ast.radius + 15) {
                        const cdKey = `ast_${aIdx}`;
                        const cd = ship.bladeHitCooldowns.get(cdKey) || 0;
                        if (cd <= 0) {
                            ast.takeDamage(2, this.particles, this.soundFx, this.asteroids);
                            ship.bladeHitCooldowns.set(cdKey, 0.35);
                            this.soundFx.playBladeSlice();
                            for (let k = 0; k < 8; k++) {
                                const a = Math.random() * Math.PI * 2;
                                this.particles.push(new Particle(bx, by, Math.cos(a) * 200, Math.sin(a) * 200, '#00f5d4', 3, 0.08));
                            }
                        }
                    }
                }

                // Blade vs Proximity Mines
                for (let m = this.mines.length - 1; m >= 0; m--) {
                    const mine = this.mines[m];
                    if (mine.exploded) continue;
                    if (Math.hypot(mine.x - bx, mine.y - by) <= mine.radius + 15) {
                        mine.detonate(this);
                        this.soundFx.playBladeSlice();
                    }
                }
            }
        }

        // 9. Black Hole Gravity
        for (const bh of this.blackHoles) {
            bh.update(dt, this.particles);
            for (const ship of allShips) {
                bh.applyGravityToPlayer(ship, dt, this.particles, this);
            }
            for (const proj of this.projectiles) {
                bh.applyGravityToProjectile(proj, dt);
            }
        }

        // 10. Proximity Mine Checks
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const mine = this.mines[i];
            mine.update(dt, this.particles);

            if (mine.isExpired()) {
                this.mines.splice(i, 1);
                continue;
            }

            if (mine.isArmed()) {
                for (const ship of allShips) {
                    if (ship.hp <= 0) continue;
                    const scx = ship.x + ship.width / 2;
                    const scy = ship.y + ship.height / 2;
                    if (Math.hypot(scx - mine.x, scy - mine.y) <= mine.triggerRadius + ship.width / 2) {
                        mine.detonate(this);
                        break;
                    }
                }
            }

            // Asteroids detonate mines upon collision
            if (!mine.exploded) {
                for (const ast of this.asteroids) {
                    if (ast.destroyed) continue;
                    if (Math.hypot(ast.x - mine.x, ast.y - mine.y) <= ast.radius + mine.radius) {
                        mine.detonate(this);
                        ast.takeDamage(2, this.particles, this.soundFx, this.asteroids);
                        break;
                    }
                }
            }
        }

        // 11. Projectiles Update & Asteroid Absorption
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(dt, this.particles, allShips);

            if (proj.isOutOfBounds(this.logicalWidth, this.logicalHeight)) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (proj.isGrenade && proj.exploded) {
                this.triggerGrenadeExplosion(proj.x, proj.y, proj.ownerId, proj.bounced || proj.isReflected);
                this.projectiles.splice(i, 1);
                continue;
            }

            if (proj.isHoming && proj.exploded) {
                this.triggerHeatSeekerExplosion(proj.x, proj.y, proj.ownerId, proj.bounced || proj.isReflected);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Base Forcefield Protection
            let deflected = false;
            for (const base of this.bases) {
                if (base.deflectsProjectile(proj)) {
                    this.projectiles.splice(i, 1);
                    this.soundFx.playRicochet();
                    for (let k = 0; k < 6; k++) {
                        const a = Math.random() * Math.PI * 2;
                        this.particles.push(new Particle(proj.x, proj.y, Math.cos(a) * 80, Math.sin(a) * 80, '#00f5d4', 3, 0.08));
                    }
                    deflected = true;
                    break;
                }
            }
            if (deflected) continue;

            // Projectile vs Mines (Weapons detonate mines!)
            let hitMine = false;
            for (let mIdx = this.mines.length - 1; mIdx >= 0; mIdx--) {
                const mine = this.mines[mIdx];
                if (mine.exploded) continue;
                if (Math.hypot(proj.x - mine.x, proj.y - mine.y) <= proj.radius + mine.radius) {
                    mine.detonate(this);
                    this.projectiles.splice(i, 1);
                    hitMine = true;
                    break;
                }
            }
            if (hitMine) continue;

            // Projectile vs Asteroid Collision (Asteroids absorb weapons)
            let hitAst = false;
            for (const ast of this.asteroids) {
                if (ast.destroyed) continue;
                if (Math.hypot(proj.x - ast.x, proj.y - ast.y) <= proj.radius + ast.radius) {
                    if (proj.isMega) {
                        ast.disintegrate(this.particles, this.soundFx);
                    } else {
                        ast.takeDamage(proj.damage, this.particles, this.soundFx, this.asteroids);
                    }
                    this.projectiles.splice(i, 1);
                    hitAst = true;
                    break;
                }
            }
            if (hitAst) continue;

            // Projectile vs Obstacle Reflection
            for (const obs of this.obstacles) {
                if (obs.collidesWithRect(proj.x - proj.radius, proj.y - proj.radius, proj.radius * 2, proj.radius * 2)) {
                    obs.reflectHorizontal(proj);
                    this.soundFx.playRicochet();
                    break;
                }
            }

            // Projectile vs Ships
            for (const target of allShips) {
                if (target.hp <= 0) continue;
                if (!proj.bounced && !proj.isReflected) {
                    if (target.id === proj.ownerId) continue;
                    if (proj.team !== 'NONE' && proj.team === target.team) continue;
                }

                if (this.checkBulletPlayerHit(proj, target)) {
                    const isProtected = this.bases.some(b => b.protectsShip(target));
                    if (isProtected) {
                        this.soundFx.playRicochet();
                        for (let k = 0; k < 6; k++) {
                            const a = Math.random() * Math.PI * 2;
                            this.particles.push(new Particle(proj.x, proj.y, Math.cos(a) * 60, Math.sin(a) * 60, '#00f5d4', 3, 0.08));
                        }
                    } else {
                        if (proj.isGrenade) {
                            this.triggerGrenadeExplosion(proj.x, proj.y, proj.ownerId, proj.bounced || proj.isReflected);
                        } else if (proj.isHoming) {
                            this.triggerHeatSeekerExplosion(proj.x, proj.y, proj.ownerId, proj.bounced || proj.isReflected);
                        } else {
                            target.takeDamage(proj.damage, this.particles, this.soundFx);
                        }
                    }
                    this.projectiles.splice(i, 1);
                    this.ui.update();
                    this.checkVictoryConditions();
                    break;
                }
            }
        }

        // 12. Lasers Update & Asteroid Absorption
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update(dt, this.particles);

            if (laser.isOutOfBounds(this.logicalWidth, this.logicalHeight)) {
                this.lasers.splice(i, 1);
                continue;
            }

            // Laser vs Mines
            let hitMine = false;
            for (let mIdx = this.mines.length - 1; mIdx >= 0; mIdx--) {
                const mine = this.mines[mIdx];
                if (mine.exploded) continue;
                if (Math.hypot(laser.x - mine.x, laser.y - mine.y) <= laser.radius + mine.radius) {
                    mine.detonate(this);
                    this.lasers.splice(i, 1);
                    hitMine = true;
                    break;
                }
            }
            if (hitMine) continue;

            // Laser vs Asteroids
            let hitAst = false;
            for (const ast of this.asteroids) {
                if (ast.destroyed) continue;
                if (Math.hypot(laser.x - ast.x, laser.y - ast.y) <= laser.radius + ast.radius) {
                    ast.takeDamage(2, this.particles, this.soundFx, this.asteroids);
                    this.lasers.splice(i, 1);
                    hitAst = true;
                    break;
                }
            }
            if (hitAst) continue;

            // Laser vs Obstacle Reflection
            for (const obs of this.obstacles) {
                if (obs.collidesWithRect(laser.x - laser.radius, laser.y - laser.radius, laser.radius * 2, laser.radius * 2)) {
                    obs.reflectMunition(laser);
                    this.soundFx.playRicochet();
                    break;
                }
            }

            // Laser vs Ships
            for (const target of allShips) {
                if (target.hp <= 0) continue;
                if (!laser.bounced && !laser.isReflected) {
                    if (target.id === laser.ownerId) continue;
                    if (laser.team !== 'NONE' && laser.team === target.team) continue;
                }

                if (this.checkBulletPlayerHit(laser, target)) {
                    target.weaponBlockedTimer = 3.0; // Inhibitor block
                    this.lasers.splice(i, 1);
                    this.ui.update();
                    break;
                }
            }
        }

        // 13. Stasis Immobilizer Beams
        for (let i = this.stasisBeams.length - 1; i >= 0; i--) {
            const beam = this.stasisBeams[i];
            beam.update(dt, this.particles);

            if (beam.isOutOfBounds(this.logicalWidth, this.logicalHeight)) {
                this.stasisBeams.splice(i, 1);
                continue;
            }

            // Stasis vs Mines
            let hitMine = false;
            for (let mIdx = this.mines.length - 1; mIdx >= 0; mIdx--) {
                const mine = this.mines[mIdx];
                if (mine.exploded) continue;
                if (Math.hypot(beam.x - mine.x, beam.y - mine.y) <= beam.radius + mine.radius) {
                    mine.detonate(this);
                    this.stasisBeams.splice(i, 1);
                    hitMine = true;
                    break;
                }
            }
            if (hitMine) continue;

            // Stasis Beam vs Obstacle Reflection
            for (const obs of this.obstacles) {
                if (obs.collidesWithRect(beam.x - beam.radius, beam.y - beam.radius, beam.radius * 2, beam.radius * 2)) {
                    obs.reflectMunition(beam);
                    this.soundFx.playRicochet();
                    break;
                }
            }

            for (const target of allShips) {
                if (target.hp <= 0) continue;
                if (!beam.bounced && !beam.isReflected) {
                    if (target.id === beam.ownerId) continue;
                    if (beam.team !== 'NONE' && beam.team === target.team) continue;
                }

                if (this.checkBulletPlayerHit(beam, target)) {
                    target.freezeTimer = 2.0; // Stasis lock
                    this.stasisBeams.splice(i, 1);
                    this.ui.update();
                    break;
                }
            }
        }

        // 14. Evaporation Beams (Cone shaped, reflection decay)
        for (let i = this.evaporationBeams.length - 1; i >= 0; i--) {
            const eBeam = this.evaporationBeams[i];
            eBeam.update(dt, this.obstacles, allShips, this.particles, this.soundFx, this.mines, this.asteroids);

            if (eBeam.isExpired()) {
                this.evaporationBeams.splice(i, 1);
            }
        }

        // 15. Electric Lasso Beams
        for (let i = this.tractorBeams.length - 1; i >= 0; i--) {
            const lasso = this.tractorBeams[i];
            lasso.update(dt, allShips, this.obstacles, this.particles, this.soundFx);
            if (lasso.isExpired()) {
                this.tractorBeams.splice(i, 1);
            }
        }

        // 16. Doppelganger Ghost Ships
        for (let i = this.ghostShips.length - 1; i >= 0; i--) {
            const ghost = this.ghostShips[i];
            const enemyTargets = allShips.filter(s => s.id !== ghost.ownerId && s.hp > 0 && (s.team === 'NONE' || s.team !== ghost.team));
            ghost.update(dt, this.logicalWidth, this.logicalHeight, this.obstacles, this.particles, this.soundFx, enemyTargets, this.projectiles);
            if (ghost.isExpired()) {
                this.ghostShips.splice(i, 1);
            }
        }

        // 17. Rings of Fire
        for (let i = this.ringsOfFire.length - 1; i >= 0; i--) {
            const rof = this.ringsOfFire[i];
            rof.update(dt, allShips, this.particles, this.soundFx);
            if (rof.isExpired()) {
                this.ringsOfFire.splice(i, 1);
            }
        }

        // 18. Stealth Nebulae
        for (const neb of this.stealthNebulae) {
            neb.update(dt);
        }

        // Starfield Drift
        for (const s of this.stars) {
            s.x += s.driftVx * dt;
            s.y += s.driftVy * dt;
            if (s.x < 0) s.x += this.logicalWidth;
            if (s.x > this.logicalWidth) s.x -= this.logicalWidth;
            if (s.y < 0) s.y += this.logicalHeight;
            if (s.y > this.logicalHeight) s.y -= this.logicalHeight;
        }

        // 17. Power-Up Pickups & Spawning
        this.bombSpawnTimer -= dt;
        if (this.bombSpawnTimer <= 0 && this.powerUps.length < 5) {
            this.bombSpawnTimer = Math.random() * 2.0 + 2.5;
            this.spawnPowerUp();
        }

        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const item = this.powerUps[i];
            item.update(dt, this.particles);

            if (item.isExpired()) {
                this.powerUps.splice(i, 1);
                continue;
            }

            for (const p of allShips) {
                if (p.hp <= 0) continue;
                const pcx = p.x + p.width / 2;
                const pcy = p.y + p.height / 2;

                if (Math.hypot(pcx - item.x, pcy - item.y) <= item.radius + p.width / 2) {
                    this.handlePowerUpPickup(p, item);
                    this.powerUps.splice(i, 1);
                    break;
                }
            }
        }

        // 18. Capture The Flag Objectives & Base Mechanics
        if (this.gameMode === 'CTF' && this.blueFlag && this.redFlag) {
            this.blueFlag.update(dt, this.particles, this.soundFx);
            this.redFlag.update(dt, this.particles, this.soundFx);

            for (const ship of allShips) {
                if (ship.hp <= 0) continue;
                const scx = ship.x + ship.width / 2;
                const scy = ship.y + ship.height / 2;

                const enemyFlag = (ship.team === 'BLUE') ? this.redFlag : this.blueFlag;
                const ownFlag = (ship.team === 'BLUE') ? this.blueFlag : this.redFlag;

                // Pick up enemy flag
                if (!enemyFlag.carrier && Math.hypot(scx - enemyFlag.x, scy - enemyFlag.y) <= ship.width / 2 + enemyFlag.radius) {
                    enemyFlag.pickup(ship, this.soundFx);
                    this.ui.update();
                }

                // Return own dropped flag
                if (ownFlag.isDropped && Math.hypot(scx - ownFlag.x, scy - ownFlag.y) <= ship.width / 2 + ownFlag.radius) {
                    ownFlag.returnHome(this.soundFx);
                    this.ui.update();
                }

                // Capture enemy flag at home base!
                if (enemyFlag.carrier === ship) {
                    if (Math.hypot(scx - ownFlag.homeX, scy - ownFlag.homeY) <= 65) {
                        enemyFlag.returnHome(this.soundFx);
                        ship.capturedFlag = null;

                        // Auto-return own flag if dropped in field so game never stalls
                        if (!ownFlag.isAtHome() && !ownFlag.carrier) {
                            ownFlag.returnHome(this.soundFx);
                        }

                        if (ship.team === 'BLUE') this.blueScore++;
                        else this.redScore++;

                        this.soundFx.playFlagCapture();
                        this.ui.update();

                        if (this.blueScore >= 3 || this.redScore >= 3) {
                            this.handleRoundEnd(this.blueScore >= 3 ? 'TEAM BLUE' : 'TEAM RED');
                        }
                    }
                }
            }
        }

        // 19. Particles & Shockwaves Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].isDead()) this.particles.splice(i, 1);
        }

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            this.shockwaves[i].update(dt);
            if (this.shockwaves[i].isDead()) this.shockwaves.splice(i, 1);
        }

        this.ui.update();
        this.checkVictoryConditions();
    }

    handlePowerUpPickup(player, item) {
        if (item.isHazard) {
            this.soundFx.playHazardPickup();
            if (item.type === 'HAZARD_DAMAGE') {
                player.takeDamage(1, this.particles, this.soundFx);
            } else if (item.type === 'HAZARD_SLOW') {
                player.slowTimer = 6.0;
            }
            return;
        }

        this.soundFx.playPowerUp();

        if (item.type === 'ROTATING_BLADE') {
            // Rotating Blade Power-Up!
            player.bladeTimer = 15.0;
            player.bladeAngle = 0;
            this.soundFx.playBladeSlice();

        } else if (item.type === 'RESURRECT_PARTNER') {
            // Multiplayer Wingman Resurrection
            const partner = (player.id === 'P1') ? this.p2 : this.p1;
            if (partner) {
                if (partner.hp <= 0) {
                    partner.hp = partner.maxHp;
                    partner.x = player.x + 50;
                    partner.y = player.y;
                    partner.invulnerableTimer = 3.5;
                    partner.respawnTimer = 3.0;
                    this.soundFx.playResurrect();
                } else {
                    partner.hp = partner.maxHp;
                    partner.shieldHp = 20;
                    partner.shieldTimer = 15.0;
                    this.soundFx.playPowerUp();
                }
            } else {
                player.shieldHp = 20;
                player.shieldTimer = 15.0;
            }

        } else if (item.type === 'PARTNER_BOON') {
            // Multiplayer Wingman Boon
            const partner = (player.id === 'P1') ? this.p2 : this.p1;
            if (partner && partner.hp > 0) {
                partner.speedBoostTimer = 10.0;
                partner.shieldHp = 20;
                partner.shieldTimer = 15.0;
                partner.chargeTimer = partner.maxChargeTime;
                this.soundFx.playBoon();
            } else {
                player.speedBoostTimer = 10.0;
                player.shieldHp = 20;
                player.shieldTimer = 15.0;
            }

        } else if (item.type === 'SHIELD') {
            player.shieldHp = 20;
            player.shieldTimer = 20.0;
        } else if (item.type === 'HEALTH') {
            player.hp = Math.min(player.maxHp, player.hp + 2);
        } else if (item.type === 'MAX_HP') {
            player.maxHp += 2;
            player.hp += 2;
        } else if (item.type === 'TELEPORT') {
            player.teleport(this.logicalWidth, this.logicalHeight, this.particles, this.obstacles, this.soundFx);
        } else if (item.type === 'SPEED') {
            player.speedBoostTimer = 10.0;
            player.slowTimer = 0;
        } else if (item.type === 'MINE') {
            player.mineLayerTimer = 15.0;
            player.mineDropTimer = 0.2;
        } else if (item.type === 'EVAPORATION') {
            player.hasEvaporationBeam = true;
            player.isCharging = false;
            player.chargeTimer = 0;
            player.fireCooldown = 0.2;
        } else if (item.type === 'TRACTOR_BEAM') {
            player.hasTractorBeam = true;
            player.isCharging = false;
            player.chargeTimer = 0;
            player.fireCooldown = 0.2;
        } else if (item.type === 'DOPPELGANGER') {
            this.soundFx.playDoppelgangerSpawn();
            const angles = [player.turretAngle - 0.75, player.turretAngle + 0.75];
            for (const a of angles) {
                const gx = player.x + Math.cos(a) * 45;
                const gy = player.y + Math.sin(a) * 45;
                this.ghostShips.push(new GhostShip(gx, gy, a, player.id, player.id, player.primaryColor, player.secondaryColor, player.chassis || 'VIPER'));
            }
        } else if (item.type === 'QUAD_GUN') {
            player.quadGunTimer = 10.0;
        } else if (item.type === 'RING_OF_FIRE') {
            player.hasRingOfFire = true;
            const rof = new RingOfFireEntity(player, 0, player.id, null);
            player.ringOfFire = rof;
            this.ringsOfFire.push(rof);
            this.soundFx.playWhompExplosion();
        } else if (item.type === 'IMMOBILIZER') {
            player.immobilizerAmmo = (player.immobilizerAmmo || 0) + 3;
            this.soundFx.playPowerUp();
        } else if (item.type === 'LASER_INHIBITOR') {
            player.laserAmmo = (player.laserAmmo || 0) + 5;
            this.soundFx.playPowerUp();
        } else {
            player.grenadeTimer = 10.0;
        }
    }

    getClosestEnemy(player) {
        if (!player) return null;
        const allShips = this.getAllShips();
        let closest = null;
        let minDist = Infinity;
        const pcx = player.x + player.width / 2;
        const pcy = player.y + player.height / 2;

        for (const s of allShips) {
            if (s === player || s.hp <= 0) continue;
            if (player.team !== 'NONE' && s.team === player.team) continue;
            const scx = s.x + s.width / 2;
            const scy = s.y + s.height / 2;
            const dist = Math.hypot(scx - pcx, scy - pcy);
            if (dist < minDist) {
                minDist = dist;
                closest = s;
            }
        }
        return closest;
    }

    checkBulletPlayerHit(bullet, player) {
        const r = bullet.radius;
        return (
            bullet.x + r >= player.x &&
            bullet.x - r <= player.x + player.width &&
            bullet.y + r >= player.y &&
            bullet.y - r <= player.y + player.height
        );
    }

    checkVictoryConditions() {
        if (this.roundOver || this.gameOver) return;

        if (this.gameMode === 'PVP') {
            if (this.p1.hp <= 0 && this.p2.hp <= 0) this.handleRoundEnd('DRAW');
            else if (this.p1.hp <= 0) this.handleRoundEnd('PLAYER 2');
            else if (this.p2.hp <= 0) this.handleRoundEnd('PLAYER 1');

        } else if (this.gameMode === 'TEAM') {
            const humansAlive = (this.p1 && this.p1.hp > 0) || (this.p2 && this.p2.hp > 0);
            const aiAlive = this.aiBots.some(b => b.hp > 0);

            if (!humansAlive && !aiAlive) this.handleRoundEnd('DRAW');
            else if (!humansAlive) this.handleRoundEnd('AI DRONE SWARM');
            else if (!aiAlive) this.handleRoundEnd('TEAM BLUE PILOTS');
        }
    }

    handleRoundEnd(roundWinner) {
        if (this.roundOver || this.gameOver) return;
        this.roundOver = true;

        this.soundFx.stopAllCharges();
        this.soundFx.playRoundWin();

        if (this.gameMode === 'CTF') {
            this.gameOver = true;
            this.winnerText.textContent = `${roundWinner} WINS CTF OPERATION!`;
            this.winnerSubText.textContent = `Final Core Captures: BLUE (${this.blueScore}) - RED (${this.redScore})`;
            this.restartBtn.innerHTML = 'Rematch CTF <kbd>R</kbd>';
            this.gameOverModal.classList.remove('hidden');
            return;
        }

        if (roundWinner === 'PLAYER 1' || roundWinner === 'TEAM BLUE PILOTS') this.p1RoundWins++;
        else if (roundWinner === 'PLAYER 2' || roundWinner === 'AI DRONE SWARM') this.p2RoundWins++;

        if (this.p1RoundWins >= 3 || this.p2RoundWins >= 3 || this.currentRound >= 5) {
            this.gameOver = true;
            this.hasActiveMatch = false;
            const isTeam = (this.gameMode === 'TEAM');
            let champ = '';
            if (isTeam) {
                champ = this.p1RoundWins > this.p2RoundWins ? 'TEAM BLUE PILOTS' : (this.p2RoundWins > this.p1RoundWins ? 'AI DRONE SWARM' : 'CONTEST TIED');
                this.winnerText.textContent = `${champ} WIN THE MATCH!`;
                this.winnerSubText.textContent = `Final Score: Blue (${this.p1RoundWins}) - Red Swarm (${this.p2RoundWins})`;
            } else {
                champ = this.p1RoundWins > this.p2RoundWins ? 'PLAYER 1' : (this.p2RoundWins > this.p1RoundWins ? 'PLAYER 2' : 'CONTEST TIED');
                this.winnerText.textContent = `${champ} IS THE GRAND CHAMPION!`;
                this.winnerSubText.textContent = `Final Rounds: P1 (${this.p1RoundWins}) - P2 (${this.p2RoundWins})`;
            }
            this.restartBtn.innerHTML = 'Play Again <kbd>R</kbd>';
        } else {
            this.winnerText.textContent = `${roundWinner} WINS ROUND ${this.currentRound}!`;
            this.winnerSubText.textContent = `Next: Round ${this.currentRound + 1}`;
            this.restartBtn.innerHTML = 'Proceed to Next Round <kbd>R</kbd>';
        }

        this.gameOverModal.classList.remove('hidden');
    }

    handleModalButtonClick() {
        if (this.gameOver) {
            if (this.gameMode === 'CTF') this.startCtfMatch();
            else this.startMode(this.gameMode);
        } else {
            this.startRound(this.currentRound + 1);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        // Draw Deep Space Atmosphere & Starfield
        this.drawStarfield();

        // Draw Arena Grid
        if (this.gridToggle && this.gridToggle.checked) {
            this.drawGrid();
        }

        // Draw High-Tech Tactical Boundaries
        this.drawBoundaryVisuals();

        // Draw Repair & Shield Bases
        for (const base of this.bases) {
            base.draw(this.ctx);
        }

        // Draw Spacetime Labyrinth Warning Grid
        if (this.labyrinthSystem) {
            this.labyrinthSystem.draw(this.ctx);
        }

        // Draw Obstacles & Sliding Doors
        for (const obs of this.obstacles) {
            obs.draw(this.ctx);
        }

        // Draw Hydraulic Crusher Traps
        for (const crusher of this.crushers) {
            crusher.draw(this.ctx);
        }

        // Draw CTF Flags & Pedestals
        if (this.gameMode === 'CTF') {
            if (this.blueFlag) this.blueFlag.draw(this.ctx, this.blueScore);
            if (this.redFlag) this.redFlag.draw(this.ctx, this.redScore);
        }

        // Draw Power-Up Items
        for (const item of this.powerUps) {
            item.draw(this.ctx);
        }

        // Draw Proximity Mines
        for (const mine of this.mines) {
            mine.draw(this.ctx);
        }

        // Draw Asteroids (Phases through purple barriers)
        for (const ast of this.asteroids) {
            ast.draw(this.ctx);
        }

        // Draw Rings of Fire Perimeter Traps
        for (const rof of this.ringsOfFire) {
            rof.draw(this.ctx);
        }

        // Draw Ghost Ships
        for (const ghost of this.ghostShips) {
            ghost.draw(this.ctx, ghost.ownerId === 'P1' ? this.p1 : this.p2);
        }

        // Draw Ships (Hide ships inside stealth nebulae completely from normal render)
        const allShips = this.getAllShips();
        for (const ship of allShips) {
            const inNebula = this.stealthNebulae.some(neb => neb.containsShip(ship));
            if (inNebula) continue;
            ship.draw(this.ctx);
        }

        // Draw Stealth Nebulae (conceals anything inside from outside observers)
        for (const neb of this.stealthNebulae) {
            neb.draw(this.ctx);

            // If human pilot is inside nebula, draw a faint tactical radar silhouette for their own orientation
            if (this.p1 && this.p1.hp > 0 && neb.containsShip(this.p1)) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.28;
                this.ctx.shadowColor = '#00f2fe';
                this.ctx.shadowBlur = 8;
                this.p1.draw(this.ctx);
                this.ctx.restore();
            }
            if (this.p2 && this.p2.hp > 0 && !this.p2.isAI && neb.containsShip(this.p2)) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.28;
                this.ctx.shadowColor = '#ff007f';
                this.ctx.shadowBlur = 8;
                this.p2.draw(this.ctx);
                this.ctx.restore();
            }
        }

        // Draw Projectiles
        for (const proj of this.projectiles) {
            proj.draw(this.ctx);
        }

        // Draw Lasers & Stasis Beams
        for (const laser of this.lasers) laser.draw(this.ctx);
        for (const beam of this.stasisBeams) beam.draw(this.ctx);

        // Draw Cone Evaporation Beams
        for (const eBeam of this.evaporationBeams) eBeam.draw(this.ctx);

        // Draw Tractor Lassos
        for (const lasso of this.tractorBeams) lasso.draw(this.ctx);

        // Draw Expanding Shockwave Rings (Grenades & Mines)
        for (const ring of this.shockwaves) ring.draw(this.ctx);

        // Draw Particles
        for (const p of this.particles) p.draw(this.ctx);

        // Draw Countdown Overlay
        if (this.countdownTimer > 0) {
            this.drawCountdownOverlay();
        }

        // Draw Pause Screen
        if (this.isPaused) {
            this.drawPauseOverlay();
        }
    }

    initStars() {
        this.stars = [];
        const count = 120;
        const colors = ['#ffffff', '#a0c4ff', '#b9fbc0', '#ffc6ff', '#ffd166', '#00f2fe'];
        const w = this.logicalWidth || 1200;
        const h = this.logicalHeight || 750;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 1.6 + 0.4,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 2 + 1,
                driftVx: (Math.random() - 0.5) * 6,
                driftVy: (Math.random() - 0.5) * 6
            });
        }
    }

    drawStarfield() {
        this.ctx.save();
        const now = Date.now() * 0.002;
        for (const s of this.stars) {
            const currentAlpha = s.alpha * (0.6 + 0.4 * Math.sin(now * s.twinkleSpeed));
            this.ctx.fillStyle = s.color;
            this.ctx.globalAlpha = currentAlpha;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    drawBoundaryVisuals() {
        this.ctx.save();
        // Subtle outer border
        this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.14)';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(8, 8, this.logicalWidth - 16, this.logicalHeight - 16);

        // Tech corner brackets
        const bLen = 32;
        this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
        this.ctx.lineWidth = 2.5;

        // Top-Left
        this.ctx.beginPath();
        this.ctx.moveTo(8, 8 + bLen);
        this.ctx.lineTo(8, 8);
        this.ctx.lineTo(8 + bLen, 8);
        this.ctx.stroke();

        // Top-Right
        this.ctx.beginPath();
        this.ctx.moveTo(this.logicalWidth - 8 - bLen, 8);
        this.ctx.lineTo(this.logicalWidth - 8, 8);
        this.ctx.lineTo(this.logicalWidth - 8, 8 + bLen);
        this.ctx.stroke();

        // Bottom-Left
        this.ctx.beginPath();
        this.ctx.moveTo(8, this.logicalHeight - 8 - bLen);
        this.ctx.lineTo(8, this.logicalHeight - 8);
        this.ctx.lineTo(8 + bLen, this.logicalHeight - 8);
        this.ctx.stroke();

        // Bottom-Right
        this.ctx.beginPath();
        this.ctx.moveTo(this.logicalWidth - 8 - bLen, this.logicalHeight - 8);
        this.ctx.lineTo(this.logicalWidth - 8, this.logicalHeight - 8);
        this.ctx.lineTo(this.logicalWidth - 8, this.logicalHeight - 8 - bLen);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;
        const sz = 40;
        for (let x = 0; x <= this.logicalWidth; x += sz) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.logicalHeight);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.logicalHeight; y += sz) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y); this.ctx.lineTo(this.logicalWidth, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawCountdownOverlay() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(10, 14, 23, 0.65)';
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        const sec = Math.ceil(this.countdownTimer);
        const txt = (sec <= 0) ? 'ENGAGE!' : `${sec}`;
        const color = (sec <= 0) ? '#00f2fe' : '#ffd166';

        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 30;
        this.ctx.font = '900 86px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(txt, this.logicalWidth / 2, this.logicalHeight / 2);
        this.ctx.restore();
    }

    drawPauseOverlay() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(10, 14, 23, 0.78)';
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        this.ctx.fillStyle = '#00f2fe';
        this.ctx.shadowColor = '#00f2fe';
        this.ctx.shadowBlur = 24;
        this.ctx.font = '800 64px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PAUSED', this.logicalWidth / 2, this.logicalHeight / 2 - 20);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 8;
        this.ctx.font = '400 20px Outfit, sans-serif';
        this.ctx.fillText('Press P or click RESUME to return to combat', this.logicalWidth / 2, this.logicalHeight / 2 + 40);
        this.ctx.restore();
    }
}
