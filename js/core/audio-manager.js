// Zero-copyright Web Audio API multi-layer procedural ambient soundscape & chime engine

export const AUDIO_CHANNELS = [
  { id: "rain", label: "Soft Rain", description: "Steady rainfall against the windowpane" },
  { id: "fireplace", label: "Fireplace", description: "Warm hearth crackle and low embers" },
  { id: "forest", label: "Garden Breeze", description: "Rustling leaves and distant songbirds" },
  { id: "wind", label: "Night Wind", description: "Gentle breeze through the eaves" },
  { id: "ocean", label: "Ocean Waves", description: "Slow rolling tide and surf" },
  { id: "cafe", label: "Quiet Study Hall", description: "Soft muffled room murmur" },
  { id: "whiteNoise", label: "Warm Pink Noise", description: "Smooth focus-masking static" },
  { id: "lofi", label: "Cozy Keys", description: "Soft warm electric-piano chords" }
];

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.masterVolume = 0.65;
    this.levels = Object.fromEntries(AUDIO_CHANNELS.map((c) => [c.id, c.id === "rain" ? 0.55 : 0]));
    this.nodes = new Map();
    this.chordTimer = null;
  }

  ensureContext() {
    if (this.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isPlaying ? this.masterVolume : 0;
    this.masterGain.connect(this.ctx.destination);
    return true;
  }

  createNoiseBuffer(seconds = 3, type = "pink") {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (type === "white") {
        data[i] = white * 0.35;
      } else {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  buildChannel(id) {
    if (this.nodes.has(id)) return this.nodes.get(id);
    const gain = this.ctx.createGain();
    gain.gain.value = this.levels[id] || 0;
    gain.connect(this.masterGain);

    if (id === "lofi") {
      // Cozy chord loop handled by gentle oscillator envelopes
      const entry = { gain, stop: () => {} };
      this.nodes.set(id, entry);
      return entry;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(3, id === "whiteNoise" ? "white" : "pink");
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    if (id === "rain") {
      filter.type = "bandpass";
      filter.frequency.value = 1100;
      filter.Q.value = 0.7;
    } else if (id === "fireplace") {
      filter.type = "lowpass";
      filter.frequency.value = 340;
    } else if (id === "forest") {
      filter.type = "bandpass";
      filter.frequency.value = 720;
      filter.Q.value = 1.2;
    } else if (id === "wind") {
      filter.type = "lowpass";
      filter.frequency.value = 280;
    } else if (id === "ocean") {
      filter.type = "lowpass";
      filter.frequency.value = 460;
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.14;
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
    } else if (id === "cafe") {
      filter.type = "bandpass";
      filter.frequency.value = 540;
      filter.Q.value = 0.9;
    } else {
      filter.type = "lowpass";
      filter.frequency.value = 2400;
    }

    src.connect(filter);
    filter.connect(gain);
    src.start();
    const entry = { gain, src, filter };
    this.nodes.set(id, entry);
    return entry;
  }

  startLofiLoop() {
    if (this.chordTimer) return;
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 349.23], // Fmaj7
      [196.0, 246.94, 293.66, 392.0]   // G6
    ];
    let step = 0;
    const playChord = () => {
      if (!this.isPlaying || !this.ctx || (this.levels.lofi || 0) <= 0.01) return;
      const channel = this.nodes.get("lofi");
      if (!channel) return;
      const now = this.ctx.currentTime;
      for (const freq of chords[step % chords.length]) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(0.06, now + 0.35);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
        osc.connect(env);
        env.connect(channel.gain);
        osc.start(now);
        osc.stop(now + 3.3);
      }
      step += 1;
    };
    playChord();
    this.chordTimer = window.setInterval(playChord, 3400);
  }

  async togglePlay(forceState) {
    if (!this.ensureContext()) return false;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.isPlaying = typeof forceState === "boolean" ? forceState : !this.isPlaying;
    if (this.isPlaying) {
      for (const ch of AUDIO_CHANNELS) {
        if ((this.levels[ch.id] || 0) > 0.01) this.buildChannel(ch.id);
      }
      this.startLofiLoop();
    }
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.isPlaying ? this.masterVolume : 0,
        this.ctx.currentTime,
        0.08
      );
    }
    return this.isPlaying;
  }

  setMasterVolume(value) {
    this.masterVolume = Math.min(1, Math.max(0, Number(value) || 0));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isPlaying ? this.masterVolume : 0,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  setChannelLevel(id, value) {
    const level = Math.min(1, Math.max(0, Number(value) || 0));
    this.levels[id] = level;
    if (this.ctx && level > 0.01 && !this.nodes.has(id)) {
      this.buildChannel(id);
    }
    const entry = this.nodes.get(id);
    if (entry?.gain && this.ctx) {
      entry.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.06);
    }
  }

  playChime(kind = "complete") {
    if (!this.ensureContext()) return;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    const now = this.ctx.currentTime;
    const notes = kind === "complete" ? [523.25, 659.25, 783.99] : [440, 554.37];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.7);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.75);
    });
  }
}

export const audioManager = new AudioManager();
