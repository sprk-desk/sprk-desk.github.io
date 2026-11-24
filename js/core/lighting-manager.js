// Layered Day/Night Lighting, Time-of-Day, and Window Weather Canvas Engine
import { state } from "../state.js";
import { bus } from "./event-bus.js";
import { computeLampLightCoords } from "../utils/lighting-math.js";
import { kelvinToLampRgb } from "../utils/study-tools.js";

export const TIME_PHASES = [
  { id: "auto", label: "Auto (Local Clock)" },
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "sunset", label: "Sunset" },
  { id: "night", label: "Night" }
];

export const WEATHER_MODES = [
  { id: "clear", label: "Clear Sky" },
  { id: "breeze", label: "Spring Breeze" },
  { id: "rain", label: "Gentle Rain" },
  { id: "snow", label: "Soft Snow" },
  { id: "fireflies", label: "Evening Fireflies" }
];

const PHASE_PROFILES = {
  morning: {
    skyTop: "#89c8d8",
    skyMid: "#cbe8df",
    skyBottom: "#f8e7b8",
    sunOpacity: 0.9,
    moonOpacity: 0,
    starsOpacity: 0,
    ambientWash: "rgba(255, 245, 214, 0.10)",
    beamOpacity: 0.34,
    defaultDarkness: 4
  },
  afternoon: {
    skyTop: "#79bfd1",
    skyMid: "#bae1dc",
    skyBottom: "#efe6b9",
    sunOpacity: 1,
    moonOpacity: 0,
    starsOpacity: 0,
    ambientWash: "rgba(255, 252, 236, 0.04)",
    beamOpacity: 0.28,
    defaultDarkness: 0
  },
  sunset: {
    skyTop: "#4f4a7d",
    skyMid: "#ce7572",
    skyBottom: "#f5b874",
    sunOpacity: 0.65,
    moonOpacity: 0.25,
    starsOpacity: 0.25,
    ambientWash: "rgba(235, 134, 82, 0.18)",
    beamOpacity: 0.24,
    defaultDarkness: 18
  },
  night: {
    skyTop: "#0e1d38",
    skyMid: "#1b345b",
    skyBottom: "#2b4d6f",
    sunOpacity: 0,
    moonOpacity: 1,
    starsOpacity: 1,
    ambientWash: "rgba(18, 28, 56, 0.42)",
    beamOpacity: 0.16,
    defaultDarkness: 42
  }
};

export function resolveEffectivePhase(timeOfDay = "auto", now = new Date()) {
  if (timeOfDay !== "auto" && PHASE_PROFILES[timeOfDay]) return timeOfDay;
  const hour = now.getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}

class LightingManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.rafId = null;
    this.lastTime = 0;
  }

  init() {
    this.canvas = document.querySelector(".weather-canvas");
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      this.resizeCanvas();
      window.addEventListener("resize", () => {
        this.resizeCanvas();
        this.updateLampOrigin();
      });
    } else {
      window.addEventListener("resize", () => this.updateLampOrigin());
    }
    bus.on("layout:changed", () => this.updateLampOrigin());
    this.apply();
    window.setInterval(() => {
      if (state.preferences.timeOfDay === "auto") this.apply();
    }, 60_000);
  }

  updateLampOrigin(overrideLampRect = null) {
    const room = document.querySelector(".room-screen");
    const desk = document.querySelector(".desk");
    const lamp = document.querySelector(".desk-lamp");
    if (!room || !lamp) return;

    const roomRect = room.getBoundingClientRect();
    const deskRect = desk ? desk.getBoundingClientRect() : null;
    const lampRect = overrideLampRect || lamp.getBoundingClientRect();
    const coords = computeLampLightCoords({ lampRect, roomRect, deskRect });

    const root = document.documentElement;
    root.style.setProperty("--lamp-x", coords.lampX);
    root.style.setProperty("--lamp-y", coords.lampY);
    root.style.setProperty("--lamp-desk-y", coords.deskY);
    root.style.setProperty("--lamp-spill-opacity", coords.spillOpacity);
    root.style.setProperty("--lamp-desk-pool-factor", coords.deskPoolFactor);
    root.dataset.lampElevated = String(coords.isElevated);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  apply() {
    const prefs = state.preferences;
    const spectating = state.spectatingRoom;
    const activeTime = spectating ? (spectating.timeOfDay || prefs.timeOfDay) : prefs.timeOfDay;
    const activeWeather = spectating ? (spectating.weather || prefs.weather) : (prefs.weather || "clear");
    const lighting = spectating && spectating.lighting && Object.keys(spectating.lighting).length
      ? spectating.lighting
      : (prefs.lighting || {});
    const phase = resolveEffectivePhase(activeTime);
    const profile = PHASE_PROFILES[phase];
    const root = document.documentElement;
    const windowBeamOn = lighting.windowBeamOn !== false;

    const hour = new Date().getHours();
    const isDuskOrNight = hour >= 18 || hour < 6;
    const autoDuskActive = Boolean(prefs.autoDuskLamp && isDuskOrNight);
    const effectiveLampOn = lighting.lampOn !== false || autoDuskActive;

    root.dataset.timePhase = phase;
    root.dataset.weather = activeWeather;
    root.dataset.lampOn = String(effectiveLampOn);
    root.dataset.windowBeamOn = String(windowBeamOn);
    root.dataset.lowPerformance = String(Boolean(prefs.lowPerformance));
    root.dataset.reducedMotion = String(Boolean(prefs.reducedMotion));

    const roomBrightness = (Number(lighting.roomBrightness ?? 100) / 100).toFixed(2);
    const windowBrightness = (Number(lighting.windowBrightness ?? 100) / 100).toFixed(2);
    const darknessPct = Math.min(72, Math.max(0, Number(lighting.ambientDarkness ?? profile.defaultDarkness)));
    const darknessAlpha = (darknessPct / 100 * 0.68).toFixed(3);
    const lampAlpha = !effectiveLampOn
      ? "0"
      : ((Number(lighting.lampIntensity ?? 70) / 100) * (phase === "night" || phase === "sunset" || autoDuskActive ? 0.55 : 0.22)).toFixed(3);
    const warmthAlpha = ((Number(lighting.warmth ?? 35) / 100) * 0.24).toFixed(3);
    const lampKelvin = autoDuskActive && !lighting.lampKelvin
      ? 2700
      : Number(lighting.lampKelvin ?? 3200);

    root.style.setProperty("--sky-top", profile.skyTop);
    root.style.setProperty("--sky-mid", profile.skyMid);
    root.style.setProperty("--sky-bottom", profile.skyBottom);
    root.style.setProperty("--sun-opacity", String(profile.sunOpacity));
    root.style.setProperty("--moon-opacity", String(profile.moonOpacity));
    root.style.setProperty("--stars-opacity", String(profile.starsOpacity));
    root.style.setProperty("--ambient-wash", profile.ambientWash);
    root.style.setProperty("--window-beam-opacity", windowBeamOn ? String(profile.beamOpacity) : "0");
    root.style.setProperty("--room-brightness", roomBrightness);
    root.style.setProperty("--window-brightness", windowBrightness);
    root.dataset.customBrightness = roomBrightness !== "1.00" ? "true" : "false";
    root.dataset.customWindowBrightness = windowBrightness !== "1.00" ? "true" : "false";
    root.style.setProperty("--ambient-darkness", darknessAlpha);
    root.style.setProperty("--lamp-glow-opacity", lampAlpha);
    root.style.setProperty("--lamp-rgb", kelvinToLampRgb(lampKelvin));
    root.style.setProperty("--warmth-overlay", warmthAlpha);

    this.updateLampOrigin();
    this.syncWeatherLoop();
  }

  syncWeatherLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const weather = state.preferences.weather || "clear";
    const reduced = Boolean(state.preferences.reducedMotion) ||
      Boolean(state.preferences.lowPerformance);

    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (weather === "clear") {
      this.particles = [];
      return;
    }

    const count = reduced ? 16 : weather === "rain" ? 42 : 26;
    this.particles = Array.from({ length: count }, () => this.spawnParticle(weather, true));
    this.drawFrame(0.016);

    if (reduced) {
      return;
    }

    this.lastTime = performance.now();
    const tick = (now) => {
      if (document.hidden) {
        this.lastTime = now;
        this.rafId = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - this.lastTime;
      if (elapsed >= 40) {
        const dt = Math.min(0.08, elapsed / 1000);
        this.lastTime = now;
        this.drawFrame(dt);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  spawnParticle(weather, randomY = false) {
    const w = this.canvas?.width || 400;
    const h = this.canvas?.height || 300;
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -10,
      vx: weather === "rain" ? -40 : weather === "breeze" ? 55 + Math.random() * 35 : (Math.random() - 0.5) * 26,
      vy: weather === "rain" ? 280 + Math.random() * 140 : weather === "snow" ? 36 + Math.random() * 28 : (Math.random() - 0.5) * 18,
      size: weather === "rain" ? 1.5 : weather === "snow" ? 2.5 + Math.random() * 2.5 : 3 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2
    };
  }

  drawFrame(dt) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const weather = state.preferences.weather;
    this.ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.phase += dt * 2.4;

      if (p.y > h + 12 || p.x < -16 || p.x > w + 16) {
        this.particles[i] = this.spawnParticle(weather, weather === "fireflies");
        if (weather === "breeze") this.particles[i].x = -8;
      }

      if (weather === "rain") {
        this.ctx.strokeStyle = "rgba(218, 242, 255, 0.65)";
        this.ctx.lineWidth = p.size;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x - 3, p.y + 12);
        this.ctx.stroke();
      } else if (weather === "snow") {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        this.ctx.beginPath();
        this.ctx.arc(p.x + Math.sin(p.phase) * 4, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (weather === "fireflies") {
        const glow = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(p.phase));
        this.ctx.fillStyle = `rgba(255, 232, 138, ${glow.toFixed(2)})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (weather === "breeze") {
        this.ctx.fillStyle = "rgba(176, 224, 152, 0.72)";
        this.ctx.beginPath();
        this.ctx.ellipse(p.x, p.y + Math.sin(p.phase) * 6, p.size * 1.4, p.size * 0.65, p.phase * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
}

export const lightingManager = new LightingManager();
