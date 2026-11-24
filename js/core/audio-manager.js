// Zero-copyright Web Audio API multi-layer procedural ambient soundscape & chime engine

import { state } from "../state.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";

const BUILTIN_MIX_BY_ID = {
  disc_rainy: { rain: 0.65, wind: 0.25, lofi: 0.35 },
  disc_hearth: { fireplace: 0.7, rain: 0.25 },
  disc_keys: { lofi: 0.6, whiteNoise: 0.2 }
};

export const AUDIO_CHANNELS = [
  { id: "rain", label: "Soft Rain", icon: "🌧", color: "#5fa3b8" },
  { id: "fireplace", label: "Fireplace", icon: "🔥", color: "#df7a50" },
  { id: "forest", label: "Garden Breeze", icon: "🌿", color: "#68a878" },
  { id: "wind", label: "Night Wind", icon: "💨", color: "#8ba6b8" },
  { id: "ocean", label: "Ocean Waves", icon: "🌊", color: "#4b95ad" },
  { id: "cafe", label: "Study Hall", icon: "☕", color: "#9c7a56" },
  { id: "whiteNoise", label: "Pink Noise", icon: "〰", color: "#a59bb8" },
  { id: "brownNoise", label: "Brown Noise", icon: "〰", color: "#7d6858" },
  { id: "lofi", label: "Cozy Keys", icon: "🎹", color: "#d99254" }
];

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterFilter = null;
    this.lowPassHz = Number(state.preferences?.lowPassHz || 18000);
    this.analyser = null;
    this.analyserData = null;
    this.isPlaying = false;
    this.masterVolume = 0.65;
    const savedId = state.preferences?.activeMusicId;
    const catalogDisc = savedId ? SHOP_CATALOG.find((i) => i.id === savedId && i.category === "music") : null;
    const initialMix = BUILTIN_MIX_BY_ID[savedId] || catalogDisc?.audioMix || { rain: 0.55 };
    this.levels = Object.fromEntries(AUDIO_CHANNELS.map((c) => [c.id, Number(initialMix[c.id] || 0)]));
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

    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = "lowpass";
    this.masterFilter.frequency.value = Math.min(20000, Math.max(400, this.lowPassHz));
    this.masterGain.connect(this.masterFilter);

    if (typeof this.ctx.createAnalyser === "function") {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
      this.masterFilter.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } else {
      this.masterFilter.connect(this.ctx.destination);
    }
    return true;
  }

  getAnalyserBins() {
    if (!this.analyser || !this.analyserData || !this.isPlaying) return null;
    this.analyser.getByteFrequencyData(this.analyserData);
    return Array.from(this.analyserData);
  }

  createNoiseBuffer(seconds = 3, type = "pink") {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (type === "white") {
        data[i] = white * 0.35;
      } else if (type === "brown") {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 2.2;
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
    const noiseType = id === "whiteNoise" ? "white" : id === "brownNoise" ? "brown" : "pink";
    src.buffer = this.createNoiseBuffer(3, noiseType);
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
    } else if (id === "brownNoise") {
      filter.type = "lowpass";
      filter.frequency.value = 620;
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

  setLowPassFilter(hz) {
    const cleanHz = Math.min(20000, Math.max(400, Math.round(Number(hz) || 18000)));
    this.lowPassHz = cleanHz;
    if (this.masterFilter && this.ctx) {
      this.masterFilter.frequency.setTargetAtTime(cleanHz, this.ctx.currentTime, 0.06);
    }
    return cleanHz;
  }

  playChime(kind = "complete") {
    if (state.preferences?.muteChimes) return;
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
