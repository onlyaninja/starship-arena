/**
 * ============================================================================
 * Starship Arena - Input System (InputHandler)
 * ============================================================================
 * Description:
 *   Handles keyboard input, dynamic key mapping, anti-ghosting multi-key combinations,
 *   active key UI highlighting, and customizable controls with localStorage persistence.
 *
 * Responsibilities:
 *   - Supports both "MODERN" 6-DOF strafe/rotation controls (default) and "CLASSIC"
 *     controls, with instant one-click rollback.
 *   - Action mapping for Player 1 and Player 2:
 *       Forward, Reverse, Rotate Left, Rotate Right, Strafe Left, Strafe Right,
 *       Main Fire (with charging), Laser Inhibitor, Immobilizer Beam.
 *   - Full key rebinding API allowing players to customize any key via the Controls Menu.
 *   - Prevents default browser actions for game keys (arrows, space, numpad, etc.).
 *   - Persistent bindings stored in localStorage ('starship_controls_scheme', 'starship_custom_bindings').
 * ============================================================================
 */

class InputHandler {
    constructor() {
        this.activeActions = new Set();
        this.justReleasedActions = new Set();

        // Control Scheme: 'MODERN' (6-DOF rotate & strafe) or 'CLASSIC' (cardinal directions)
        this.controlScheme = localStorage.getItem('starship_controls_scheme') || 'MODERN';

        // Initialize default action mappings
        this.initDefaultMappings();

        // Load custom user overrides if present
        this.loadCustomBindings();

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        window.addEventListener('blur', () => this.reset());
    }

    initDefaultMappings() {
        if (this.controlScheme === 'MODERN') {
            this.modernDefaults = {
                // Player 1 (6-DOF: WASD + Q/E strafe, TYU firing, G self-destruct)
                'P1_FORWARD': ['KeyW', 'w', 'W'],
                'P1_REVERSE': ['KeyS', 's', 'S'],
                'P1_ROTATE_LEFT': ['KeyA', 'a', 'A'],
                'P1_ROTATE_RIGHT': ['KeyD', 'd', 'D'],
                'P1_STRAFE_LEFT': ['KeyQ', 'q', 'Q'],
                'P1_STRAFE_RIGHT': ['KeyE', 'e', 'E'],
                'P1_FIRE': ['KeyT', 't', 'T', 'Space', ' '],
                'P1_LASER': ['KeyY', 'y', 'Y', 'ControlLeft'],
                'P1_FREEZE': ['KeyU', 'u', 'U', 'ShiftLeft', 'KeyF', 'f', 'F'],
                'P1_SELF_DESTRUCT': ['KeyG', 'g', 'G', 'Backspace'],

                // Player 2 (6-DOF: Numpad 8/5/4/6 + 7/9 strafe, Arrows firing, ArrowUp self-destruct)
                'P2_FORWARD': ['Numpad8', '8', 'Digit8', 'NumpadUp'],
                'P2_REVERSE': ['Numpad5', '5', 'Digit5', 'NumpadClear', 'NumpadDown'],
                'P2_ROTATE_LEFT': ['Numpad4', '4', 'Digit4', 'NumpadLeft'],
                'P2_ROTATE_RIGHT': ['Numpad6', '6', 'Digit6', 'NumpadRight'],
                'P2_STRAFE_LEFT': ['Numpad7', '7', 'Digit7', 'Home'],
                'P2_STRAFE_RIGHT': ['Numpad9', '9', 'Digit9', 'PageUp'],
                'P2_FIRE': ['ArrowLeft', 'ShiftRight', 'Numpad0', '0', 'Insert'],
                'P2_LASER': ['ArrowDown', 'NumpadEnter', 'Enter'],
                'P2_FREEZE': ['ArrowRight', 'NumpadAdd', '+', 'KeyO', 'o', 'O'],
                'P2_SELF_DESTRUCT': ['ArrowUp', 'NumpadDecimal', 'Delete']
            };
        } else {
            this.classicDefaults = {
                // Player 1 (Classic Cardinal: WASD)
                'P1_FORWARD': ['KeyW', 'w', 'W'],
                'P1_REVERSE': ['KeyS', 's', 'S'],
                'P1_ROTATE_LEFT': ['KeyA', 'a', 'A'],
                'P1_ROTATE_RIGHT': ['KeyD', 'd', 'D'],
                'P1_STRAFE_LEFT': [],
                'P1_STRAFE_RIGHT': [],
                'P1_FIRE': ['KeyT', 't', 'T', 'Space', ' '],
                'P1_LASER': ['KeyY', 'y', 'Y', 'KeyE', 'e', 'E'],
                'P1_FREEZE': ['KeyU', 'u', 'U', 'KeyQ', 'q', 'Q', 'ShiftLeft', 'KeyF'],
                'P1_SELF_DESTRUCT': ['KeyG', 'g', 'G', 'Backspace'],

                // Player 2 (Classic Cardinal: Numpad)
                'P2_FORWARD': ['Numpad8', '8'],
                'P2_REVERSE': ['Numpad5', '5'],
                'P2_ROTATE_LEFT': ['Numpad4', '4'],
                'P2_ROTATE_RIGHT': ['Numpad6', '6'],
                'P2_STRAFE_LEFT': [],
                'P2_STRAFE_RIGHT': [],
                'P2_FIRE': ['ArrowLeft', 'ShiftRight', 'Numpad0', 'NumpadEnter'],
                'P2_LASER': ['ArrowDown', 'Numpad7', '7'],
                'P2_FREEZE': ['ArrowRight', 'Numpad9', '9'],
                'P2_SELF_DESTRUCT': ['ArrowUp', 'NumpadDecimal', 'Delete']
            };
        }

        this.rebuildActionMap();
    }

    rebuildActionMap() {
        this.actionMap = {};
        const defaults = (this.controlScheme === 'MODERN') ? this.modernDefaults : this.classicDefaults;
        const custom = (this.controlScheme === 'MODERN') ? this.customModern : this.customClassic;
        const base = { ...defaults, ...(custom || {}) };
        
        for (const [action, keys] of Object.entries(base)) {
            for (const key of keys) {
                this.actionMap[key] = action;
            }
        }
    }

    setControlScheme(scheme) {
        if (scheme !== 'MODERN' && scheme !== 'CLASSIC') return;
        this.controlScheme = scheme;
        localStorage.setItem('starship_controls_scheme', scheme);
        this.initDefaultMappings();
        this.loadCustomBindings();
    }

    loadCustomBindings() {
        try {
            const raw = localStorage.getItem('starship_custom_bindings_' + this.controlScheme);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (this.controlScheme === 'MODERN') this.customModern = parsed;
                else this.customClassic = parsed;
                this.rebuildActionMap();
            }
        } catch(e) {
            console.error('Failed loading custom bindings:', e);
        }
    }

    saveCustomBindings(newBindings) {
        if (this.controlScheme === 'MODERN') this.customModern = newBindings;
        else this.customClassic = newBindings;

        localStorage.setItem('starship_custom_bindings_' + this.controlScheme, JSON.stringify(newBindings));
        this.rebuildActionMap();
    }

    resetToDefaults() {
        localStorage.removeItem('starship_custom_bindings_' + this.controlScheme);
        if (this.controlScheme === 'MODERN') this.customModern = null;
        else this.customClassic = null;
        this.initDefaultMappings();
    }

    getCurrentBindings() {
        const defaults = (this.controlScheme === 'MODERN') ? this.modernDefaults : this.classicDefaults;
        const custom = (this.controlScheme === 'MODERN') ? this.customModern : this.customClassic;
        return { ...defaults, ...(custom || {}) };
    }

    rebindAction(action, primaryCode) {
        const bindings = { ...this.getCurrentBindings() };
        bindings[action] = [primaryCode];
        this.saveCustomBindings(bindings);
    }

    handleKeyDown(e) {
        // Prevent page scrolling on navigation/game keys
        if ([
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter',
            'Numpad8', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad0', 'Numpad7', 'Numpad9', 'NumpadEnter', 'NumpadAdd'
        ].includes(e.key) || e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code.startsWith('Numpad')) {
            e.preventDefault();
        }

        const action = this.actionMap[e.code] || this.actionMap[e.key];
        if (action) {
            this.activeActions.add(action);
        }

        this.updateKeyUI(e.code, true);
    }

    handleKeyUp(e) {
        const action = this.actionMap[e.code] || this.actionMap[e.key];
        if (action) {
            this.activeActions.delete(action);
            this.justReleasedActions.add(action);
        }

        this.updateKeyUI(e.code, false);
    }

    updateKeyUI(code, isActive) {
        const keyElements = document.querySelectorAll(`.key[data-key="${code}"]`);
        keyElements.forEach(keyElement => {
            if (isActive) keyElement.classList.add('active');
            else keyElement.classList.remove('active');
        });
    }

    isPressed(action) {
        return this.activeActions.has(action);
    }

    clearReleased() {
        this.justReleasedActions.clear();
    }

    reset() {
        this.activeActions.clear();
        this.justReleasedActions.clear();
        document.querySelectorAll('.key.active').forEach(k => k.classList.remove('active'));
    }
}
