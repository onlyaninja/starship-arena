/**
 * ============================================================================
 * Starship Arena - Sound Engine (SoundFX)
 * ============================================================================
 * Description:
 *   Procedural Web Audio API sound synthesizer engine. Generates all sound
 *   effects dynamically using oscillators, filters, noise buffers, and gain
 *   envelopes. Eliminates external audio assets and provides low-latency,
 *   crisp retro-futuristic arcade audio.
 *
 * Responsibilities:
 *   - Procedural synthesis for laser blasts, mega-blasts, explosions, & ricochets.
 *   - Continuous charge oscillator management for Mega-Blast with bulletproof
 *     lifecycle cleanup to prevent audio looping on ship death or respawn.
 *   - Sub-bass "whomp" resonance for heavy proximity mines and circular grenades.
 *   - Energy slicing audio for rotating blade power-up hits.
 *   - Hydraulic crusher clanking, energy siphon streams, sliding doors,
 *     spacetime labyrinth shifts, partner resurrection, and boon fanfare.
 * ============================================================================
 */

class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.chargeNodes = {};
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    updateCharge(playerId, chargeRatio, chargeTimer) {
        if (!this.enabled) {
            this.stopCharge(playerId);
            return;
        }
        this.init();
        if (!this.ctx) return;

        let nodeGroup = this.chargeNodes[playerId];
        const now = this.ctx.currentTime;

        if (!nodeGroup) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            gain.gain.setValueAtTime(0.01, now);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();

            nodeGroup = { osc, gain };
            this.chargeNodes[playerId] = nodeGroup;
        }

        const freq = 180 + Math.min(chargeRatio, 2.5) * 450;
        nodeGroup.osc.frequency.setTargetAtTime(freq, now, 0.05);

        let targetGain = 0.10 + Math.min(chargeRatio, 1.0) * 0.08;
        
        if (chargeTimer > 2.0) {
            const pulse = (Math.sin(now * 30) + 1) * 0.5;
            targetGain *= (0.5 + pulse * 0.5);
        }

        nodeGroup.gain.gain.setTargetAtTime(targetGain, now, 0.05);
    }

    stopCharge(playerId) {
        const nodeGroup = this.chargeNodes[playerId];
        if (nodeGroup) {
            delete this.chargeNodes[playerId]; // Delete key immediately to prevent race conditions
            if (this.ctx) {
                try {
                    const now = this.ctx.currentTime;
                    const curGain = Math.max(0.0001, nodeGroup.gain.gain.value || 0.0001);
                    nodeGroup.gain.gain.cancelScheduledValues(now);
                    nodeGroup.gain.gain.setValueAtTime(curGain, now);
                    nodeGroup.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
                    nodeGroup.osc.stop(now + 0.04);
                    setTimeout(() => {
                        try {
                            nodeGroup.osc.disconnect();
                            nodeGroup.gain.disconnect();
                        } catch(e) {}
                    }, 50);
                } catch(e) {
                    try {
                        nodeGroup.osc.stop();
                        nodeGroup.osc.disconnect();
                    } catch(err) {}
                }
            }
        }
    }

    stopAllCharges() {
        Object.keys(this.chargeNodes).forEach(id => this.stopCharge(id));
    }

    playShoot() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playMegaShoot() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(350, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }

    playLaser() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.22);

        gain.gain.setValueAtTime(0.20, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    }

    playRicochet() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playFreeze() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [587.33, 739.99, 880.00];
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + i * 0.05);

            gain.gain.setValueAtTime(0.12, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.3);
        });
    }

    playExplosion() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    /**
     * Sub-bass resonant "whomp" boom for proximity mines & circular grenades
     */
    playWhompExplosion() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Deep Sub-Bass Sine Thump (130Hz -> 26Hz)
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(130, now);
        bassOsc.frequency.exponentialRampToValueAtTime(26, now + 0.55);

        bassGain.gain.setValueAtTime(0.5, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.55);

        // 2. Resonant Heavy Whomp Filter Sweep
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(6.0, now);
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(now);
    }

    /**
     * Metallic energy slicing audio for the Rotating Blade powerup
     */
    playBladeSlice() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);

        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        const shimmer = this.ctx.createOscillator();
        const shimmerGain = this.ctx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(3200, now);
        shimmer.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        shimmerGain.gain.setValueAtTime(0.18, now);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.ctx.destination);
        shimmer.start(now);
        shimmer.stop(now + 0.08);
    }

    /**
     * Mechanical hydraulic clamp for the Crusher Trap
     */
    playCrusherClamp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Humming energy drain siphon
     */
    playSiphonDrain() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(520, now + 0.15);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * Pneumatic sliding door sound
     */
    playDoorSlide() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(360, now + 0.2);

        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * Cosmic spacetime disruption rumble
     */
    playLabyrinthShift() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.7);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
    }

    /**
     * Partner resurrection fanfare
     */
    playResurrect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.24, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.4);
        });
    }

    /**
     * Partner boon boost surge
     */
    playBoon() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [587.33, 739.99, 880, 1174.66];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.22, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.35);
        });
    }

    playTeleport() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playPowerUp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.15, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.18);
        });
    }

    playHazardPickup() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [320, 240, 160, 90];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0.18, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.16);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.16);
        });
    }

    playEvaporationBeam() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(140, now);
        bassOsc.frequency.exponentialRampToValueAtTime(45, now + 0.7);
        bassGain.gain.setValueAtTime(0.35, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.7);

        const beamOsc = this.ctx.createOscillator();
        const beamGain = this.ctx.createGain();
        beamOsc.type = 'sine';
        beamOsc.frequency.setValueAtTime(880, now);
        beamOsc.frequency.linearRampToValueAtTime(1400, now + 0.3);
        beamOsc.frequency.exponentialRampToValueAtTime(220, now + 0.75);
        beamGain.gain.setValueAtTime(0.25, now);
        beamGain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);
        beamOsc.connect(beamGain);
        beamGain.connect(this.ctx.destination);
        beamOsc.start(now);
        beamOsc.stop(now + 0.75);
    }

    playFrazzleHit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600 + Math.random() * 800, now);
        osc.frequency.linearRampToValueAtTime(150 + Math.random() * 200, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playTractorLaunch() { this.playLassoLaunch(); }
    playLassoLaunch() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        const sizzle = this.ctx.createOscillator();
        const sizzleGain = this.ctx.createGain();
        sizzle.type = 'triangle';
        sizzle.frequency.setValueAtTime(2400, now);
        sizzle.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        sizzleGain.gain.setValueAtTime(0.2, now);
        sizzleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        sizzle.connect(sizzleGain);
        sizzleGain.connect(this.ctx.destination);
        sizzle.start(now);
        sizzle.stop(now + 0.08);
    }

    playTractorLatch() { this.playLassoSnare(); }
    playLassoSnare() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const clamp = this.ctx.createOscillator();
        const clampGain = this.ctx.createGain();
        clamp.type = 'triangle';
        clamp.frequency.setValueAtTime(320, now);
        clamp.frequency.exponentialRampToValueAtTime(60, now + 0.22);
        clampGain.gain.setValueAtTime(0.38, now);
        clampGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        clamp.connect(clampGain);
        clampGain.connect(this.ctx.destination);
        clamp.start(now);
        clamp.stop(now + 0.22);

        const buzz = this.ctx.createOscillator();
        const buzzGain = this.ctx.createGain();
        buzz.type = 'sawtooth';
        buzz.frequency.setValueAtTime(220, now);
        buzz.frequency.linearRampToValueAtTime(280, now + 0.15);
        buzz.frequency.linearRampToValueAtTime(200, now + 0.35);
        buzzGain.gain.setValueAtTime(0.22, now);
        buzzGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        buzz.connect(buzzGain);
        buzzGain.connect(this.ctx.destination);
        buzz.start(now);
        buzz.stop(now + 0.35);
    }

    playLassoRelease() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playFlagPickup() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.22, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.2);
        });
    }

    playFlagCapture() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.50];
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.26, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.5);
        });
    }

    playFlagReturn() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [783.99, 523.25];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);
            gain.gain.setValueAtTime(0.2, now + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.25);
        });
    }

    playFlagStolen() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.linearRampToValueAtTime(540, now + 0.1);
        osc.frequency.linearRampToValueAtTime(380, now + 0.2);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    playDoppelgangerSpawn() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [360, 540, 720];
        freqs.forEach((baseFreq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, now + idx * 0.04);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + idx * 0.04 + 0.25);

            gain.gain.setValueAtTime(0.18, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.25);
        });
    }

    playDoppelgangerPop() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playHit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.20, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playBump() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playRoundWin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);

            gain.gain.setValueAtTime(0.20, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.3);
        });
    }

    playElectricZap() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.08);
    }

    playElectricReward() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [587.33, 880.00, 1174.66, 1760.00];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.20, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.25);
        });
    }

    playMinePlant() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.06);
    }

    playCountdownBeep() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playCountdownGo() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [880, 1320, 1760];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.035);

            gain.gain.setValueAtTime(0.26, now + idx * 0.035);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.035);
            osc.stop(now + idx * 0.035 + 0.45);
        });
    }

    playBoost() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.42);
    }

    playCheckpoint() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [659.25, 987.77, 1318.51]; // E5, B5, E6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);

            gain.gain.setValueAtTime(0.18, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.22);
        });
    }
}
