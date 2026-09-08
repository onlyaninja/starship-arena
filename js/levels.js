/**
 * ============================================================================
 * Starship Arena - Level & Arena Architecture (Levels)
 * ============================================================================
 * Description:
 *   Level generation and environmental configuration engine. Constructs arena
 *   layouts, purple reflective barriers, timed pneumatic sliding blast doors,
 *   hydraulic crusher energy siphon traps, and spacetime labyrinth shifting sectors.
 *
 * Responsibilities:
 *   - PVP Duel 5 progressive stages (Open, Central Barrier, Crusher Trap,
 *     Twin Fortress Purple Perimeter, Permanent Black Hole).
 *   - Capture The Flag Operations:
 *       - Level 1: Symmetrical Outpost.
 *       - Level 2: Multi-Room Fortress with Timed Pneumatic Sliding Doors.
 *       - Level 3: Spacetime Labyrinth with Dynamic Shifting Terrain.
 *   - Team Combat arena tactical cover layout.
 * ============================================================================
 */

class LevelManager {
    static setupArena(game) {
        const cw = game.logicalWidth;
        const ch = game.logicalHeight;

        game.obstacles = [];
        game.crushers = [];
        game.slidingDoors = [];
        game.stealthNebulae = [];
        game.bases = [];
        game.labyrinthSystem = null;

        game.p1SpawnX = cw * 0.1;
        game.p1SpawnY = ch * 0.5;
        game.p2SpawnX = cw * 0.9;
        game.p2SpawnY = ch * 0.5;

        if (game.gameMode === 'CTF') {
            const ctfLevel = game.ctfLevel || 1;

            if (ctfLevel === 1) {
                // ==============================================
                // CTF LEVEL 1: SYMMETRICAL OUTPOST
                // ==============================================
                game.mapNameText.textContent = 'CTF Level 1: Symmetrical Outpost (3 Captures to Win)';
                game.obstacles.push(new Obstacle(cw * 0.5 - 20, ch * 0.15, 40, ch * 0.28));
                game.obstacles.push(new Obstacle(cw * 0.5 - 20, ch * 0.57, 40, ch * 0.28));
                game.obstacles.push(new Obstacle(cw * 0.28, ch * 0.38, 36, 90));
                game.obstacles.push(new Obstacle(cw * 0.72 - 36, ch * 0.38, 36, 90));

            } else if (ctfLevel === 2) {
                // =======================================================
                // CTF LEVEL 2: MULTI-ROOM FORTRESS & TIMED SLIDING DOORS
                // =======================================================
                game.mapNameText.textContent = 'CTF Level 2: Vault Chambers & Sliding Doors (3 Captures to Win)';

                // Central chamber walls
                game.obstacles.push(new Obstacle(cw * 0.5 - 20, 0, 40, ch * 0.32));
                game.obstacles.push(new Obstacle(cw * 0.5 - 20, ch * 0.68, 40, ch * 0.32));

                // Left room partition
                game.obstacles.push(new Obstacle(cw * 0.25, ch * 0.15, 30, ch * 0.30));
                game.obstacles.push(new Obstacle(cw * 0.25, ch * 0.55, 30, ch * 0.30));

                // Right room partition
                game.obstacles.push(new Obstacle(cw * 0.75 - 30, ch * 0.15, 30, ch * 0.30));
                game.obstacles.push(new Obstacle(cw * 0.75 - 30, ch * 0.55, 30, ch * 0.30));

                // Timed Sliding Blast Doors
                // Center corridor main sliding blast door (slides vertically)
                const centerDoor = new SlidingDoor(cw * 0.5 - 20, ch * 0.32, 40, ch * 0.36, 5.0, 3.5, false);
                game.slidingDoors.push(centerDoor);
                game.obstacles.push(centerDoor);

                // Left room door
                const leftDoor = new SlidingDoor(cw * 0.25, ch * 0.45, 30, ch * 0.10, 4.5, 4.0, false);
                game.slidingDoors.push(leftDoor);
                game.obstacles.push(leftDoor);

                // Right room door
                const rightDoor = new SlidingDoor(cw * 0.75 - 30, ch * 0.45, 30, ch * 0.10, 4.5, 4.0, false);
                game.slidingDoors.push(rightDoor);
                game.obstacles.push(rightDoor);

                // Central Hydraulic Crusher Trap in side vault
                game.crushers.push(new CrusherTrap(cw * 0.5 - 55, ch * 0.5 - 55, 110, 110));

            } else {
                // =======================================================
                // CTF LEVEL 3: SPACETIME LABYRINTH (SHIFTING TERRAIN)
                // =======================================================
                game.mapNameText.textContent = 'CTF Level 3: Spacetime Labyrinth (Shifting Sectors)';

                // Labyrinth Grid Blocks
                game.obstacles.push(new Obstacle(cw * 0.32, ch * 0.22, 60, 60));
                game.obstacles.push(new Obstacle(cw * 0.68 - 60, ch * 0.22, 60, 60));
                game.obstacles.push(new Obstacle(cw * 0.32, ch * 0.78 - 60, 60, 60));
                game.obstacles.push(new Obstacle(cw * 0.68 - 60, ch * 0.78 - 60, 60, 60));

                game.obstacles.push(new Obstacle(cw * 0.5 - 30, ch * 0.2, 60, ch * 0.22));
                game.obstacles.push(new Obstacle(cw * 0.5 - 30, ch * 0.58, 60, ch * 0.22));

                // Initialize Spacetime Disruption Manager
                game.labyrinthSystem = new SpacetimeLabyrinthSystem(cw, ch);

                // Flanking Stealth Nebulae (hidden blind zones - enlarged volumetric nebulae)
                if (typeof StealthNebula !== 'undefined') {
                    game.stealthNebulae.push(new StealthNebula(cw * 0.20, ch * 0.5, 145));
                    game.stealthNebulae.push(new StealthNebula(cw * 0.80, ch * 0.5, 145));
                }
            }

            // CTF Team Repair & Forcefield Bases
            if (typeof RepairBase !== 'undefined') {
                game.bases.push(new RepairBase(100, ch * 0.5, 80, 'BLUE', 'BLUE BASE'));
                game.bases.push(new RepairBase(cw - 100, ch * 0.5, 80, 'RED', 'RED BASE'));
            }

            return;
        }

        // Team Combat Bases
        if (game.gameMode === 'TEAM') {
            if (typeof RepairBase !== 'undefined') {
                game.bases.push(new RepairBase(cw * 0.10, ch * 0.5, 80, 'BLUE', 'BLUE BASE'));
                game.bases.push(new RepairBase(cw * 0.90, ch * 0.5, 80, 'RED', 'RED REPAIR DOCK'));
            }
        }

        // Standard PVP Duel & Team Combat Arenas
        if (game.currentRound === 1) {
            game.mapNameText.textContent = 'Round 1: Open Arena (5 HP)';
        } else if (game.currentRound === 2) {
            game.mapNameText.textContent = 'Round 2: Central Barrier & Med-Dock (10 HP)';
            game.obstacles.push(new Obstacle(cw / 2 - 20, ch * 0.22, 40, ch * 0.56));
            if (typeof RepairBase !== 'undefined') {
                game.bases.push(new RepairBase(cw * 0.5, ch * 0.10, 65, 'NEUTRAL', 'MED-DOCK'));
            }
        } else if (game.currentRound === 3) {
            // Stage 3 features the Hydraulic Crusher Trap & Siphon in center!
            game.mapNameText.textContent = 'Round 3: Hydraulic Crusher Trap & Energy Siphon (15 HP)';
            game.obstacles.push(new Obstacle(cw * 0.25, ch * 0.2, 90, 35));
            game.obstacles.push(new Obstacle(cw * 0.75 - 90, ch * 0.2, 90, 35));
            game.obstacles.push(new Obstacle(cw * 0.25, ch * 0.8 - 35, 90, 35));
            game.obstacles.push(new Obstacle(cw * 0.75 - 90, ch * 0.8 - 35, 90, 35));

            // Central Hydraulic Crusher
            game.crushers.push(new CrusherTrap(cw * 0.5 - 60, ch * 0.5 - 60, 120, 120));

            // Flanking Stealth Nebulae (enlarged volumetric nebulae)
            if (typeof StealthNebula !== 'undefined') {
                game.stealthNebulae.push(new StealthNebula(cw * 0.5, ch * 0.15, 145));
                game.stealthNebulae.push(new StealthNebula(cw * 0.5, ch * 0.85, 145));
            }

        } else if (game.currentRound === 4) {
            game.mapNameText.textContent = 'Round 4: Twin Fortress Choke (Purple Perimeter) (20 HP)';
            const wallThick = 24;
            // Purple reflective perimeter all around the edge
            game.obstacles.push(new Obstacle(0, 0, cw, wallThick)); // Top
            game.obstacles.push(new Obstacle(0, ch - wallThick, cw, wallThick)); // Bottom
            game.obstacles.push(new Obstacle(0, 0, wallThick, ch)); // Left
            game.obstacles.push(new Obstacle(cw - wallThick, 0, wallThick, ch)); // Right

            game.p1SpawnX = cw * 0.12;
            game.p2SpawnX = cw * 0.88;

            game.obstacles.push(new Obstacle(cw * 0.28, ch * 0.18, 36, ch * 0.26));
            game.obstacles.push(new Obstacle(cw * 0.28, ch * 0.56, 36, ch * 0.26));
            game.obstacles.push(new Obstacle(cw * 0.18, ch * 0.46, cw * 0.10, 36));

            game.obstacles.push(new Obstacle(cw * 0.72 - 36, ch * 0.18, 36, ch * 0.26));
            game.obstacles.push(new Obstacle(cw * 0.72 - 36, ch * 0.56, 36, ch * 0.26));
            game.obstacles.push(new Obstacle(cw * 0.72, ch * 0.46, cw * 0.10, 36));

            game.obstacles.push(new Obstacle(cw * 0.5 - 25, ch * 0.42, 50, 110));

            // Central Stealth Chamber (enlarged volumetric nebulae)
            if (typeof StealthNebula !== 'undefined') {
                game.stealthNebulae.push(new StealthNebula(cw * 0.5, ch * 0.5, 150));
            }

            // Twin Fortress Starbases
            if (typeof RepairBase !== 'undefined') {
                game.bases.push(new RepairBase(cw * 0.12, ch * 0.5, 75, 'P1', 'P1 REPAIR DOCK'));
                game.bases.push(new RepairBase(cw * 0.88, ch * 0.5, 75, 'P2', 'P2 REPAIR DOCK'));
            }

        } else if (game.currentRound === 5) {
            game.mapNameText.textContent = 'Round 5: Permanent Black Hole & Vortex Reward (25 HP)';
            game.p1SpawnX = cw * 0.10;
            game.p2SpawnX = cw * 0.90;

            game.obstacles.push(new Obstacle(cw * 0.3, ch * 0.15, cw * 0.4, 30));
            game.obstacles.push(new Obstacle(cw * 0.3, ch * 0.85 - 30, cw * 0.4, 30));
            game.obstacles.push(new Obstacle(cw * 0.15, ch * 0.3, 30, ch * 0.4));
            game.obstacles.push(new Obstacle(cw * 0.85 - 30, ch * 0.3, 30, ch * 0.4));

            game.obstacles.push(new Obstacle(cw * 0.26, ch * 0.26, 50, 50));
            game.obstacles.push(new Obstacle(cw * 0.74 - 50, ch * 0.26, 50, 50));
            game.obstacles.push(new Obstacle(cw * 0.26, ch * 0.74 - 50, 50, 50));
            game.obstacles.push(new Obstacle(cw * 0.74 - 50, ch * 0.74 - 50, 50, 50));

            // Corner Stealth Vaults (enlarged volumetric nebulae)
            if (typeof StealthNebula !== 'undefined') {
                game.stealthNebulae.push(new StealthNebula(cw * 0.15, ch * 0.15, 140));
                game.stealthNebulae.push(new StealthNebula(cw * 0.85, ch * 0.85, 140));
            }
        }
    }
}
