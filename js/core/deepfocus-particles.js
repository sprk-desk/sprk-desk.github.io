// Full-Viewport Atmospheric Particle Engine for DeepFocus Mode

class DeepFocusParticleEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.rafId = null;
    this.lastTime = 0;
    this.config = {
      active: false,
      particleId: "ambient_drift",
      speed: 1,
      opacity: 0.72,
      density: 55,
      reducedMotion: false
    };
  }

  mount(canvas) {
    if (this.canvas === canvas && this.ctx) return;
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    this.resize();
    if (!this._boundResize) {
      this._boundResize = () => this.resize();
      window.addEventListener("resize", this._boundResize);
    }
    this.syncLoop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor((rect.width || window.innerWidth) * dpr));
    const h = Math.max(1, Math.floor((rect.height || window.innerHeight) * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.dataset.dpr = String(dpr);
    }
  }

  configure(next = {}) {
    const prevId = this.config.particleId;
    const prevDensity = this.config.density;
    const prevActive = this.config.active;
    this.config = {
      ...this.config,
      ...next
    };

    const needsRespawn =
      prevId !== this.config.particleId ||
      prevDensity !== this.config.density ||
      prevActive !== this.config.active;

    if (needsRespawn) {
      this.syncLoop();
    } else if (this.config.reducedMotion) {
      this.drawFrame(0.016);
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.particles = [];
  }

  syncLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (!this.ctx || !this.canvas || !this.config.active || this.config.particleId === "none") {
      this.stop();
      return;
    }

    this.resize();
    const targetCount = this.config.reducedMotion
      ? Math.min(20, this.config.density)
      : this.config.particleId === "rain"
        ? Math.round(this.config.density * 1.45)
        : this.config.density;

    this.particles = Array.from({ length: targetCount }, () =>
      this.spawnParticle(this.config.particleId, true)
    );
    this.drawFrame(0.016);

    if (this.config.reducedMotion) return;

    this.lastTime = performance.now();
    const tick = (now) => {
      if (!this.config.active || this.config.particleId === "none") {
        this.rafId = null;
        return;
      }
      if (document.hidden) {
        this.lastTime = now;
        this.rafId = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - this.lastTime;
      if (elapsed >= 24) {
        const dt = Math.min(0.06, elapsed / 1000);
        this.lastTime = now;
        this.drawFrame(dt);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  spawnParticle(type, randomY = false) {
    const w = this.canvas?.width || 1280;
    const h = this.canvas?.height || 720;
    const dpr = Number(this.canvas?.dataset.dpr || 1);
    const depth = 0.45 + Math.random() * 0.75;

    if (type === "rain") {
      return {
        x: Math.random() * (w + 180) - 60,
        y: randomY ? Math.random() * h : -30,
        vx: (-65 - Math.random() * 35) * dpr * depth,
        vy: (520 + Math.random() * 260) * dpr * depth,
        len: (16 + Math.random() * 18) * dpr * depth,
        size: (0.9 + Math.random() * 0.9) * dpr,
        depth,
        phase: Math.random() * Math.PI * 2
      };
    }

    if (type === "snow") {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -18,
        vx: (Math.random() - 0.5) * 18 * dpr,
        vy: (28 + Math.random() * 38) * dpr * depth,
        size: (1.6 + Math.random() * 2.8) * dpr * depth,
        depth,
        phase: Math.random() * Math.PI * 2,
        swayAmp: (12 + Math.random() * 18) * dpr
      };
    }

    if (type === "fireflies") {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 24 * dpr * depth,
        vy: (Math.random() - 0.5) * 18 * dpr * depth,
        size: (2.2 + Math.random() * 3.0) * dpr * depth,
        depth,
        phase: Math.random() * Math.PI * 2,
        twinkleRate: 1.3 + Math.random() * 1.8
      };
    }

    if (type === "breeze") {
      return {
        x: randomY ? Math.random() * w : -24,
        y: Math.random() * h,
        vx: (48 + Math.random() * 44) * dpr * depth,
        vy: (8 + Math.random() * 16) * dpr * depth,
        size: (3.2 + Math.random() * 3.4) * dpr * depth,
        depth,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI
      };
    }

    if (type === "starlight") {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 4 * dpr,
        vy: (-3 - Math.random() * 6) * dpr * depth,
        size: (1.0 + Math.random() * 2.1) * dpr * depth,
        depth,
        phase: Math.random() * Math.PI * 2,
        twinkleRate: 1.1 + Math.random() * 2.2
      };
    }

    // ambient_drift default (subtle bokeh dust motes)
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 14 * dpr * depth,
      vy: (-8 - Math.random() * 14) * dpr * depth,
      size: (1.8 + Math.random() * 2.6) * dpr * depth,
      depth,
      phase: Math.random() * Math.PI * 2,
      tint: Math.random() > 0.35 ? "125, 211, 252" : "253, 224, 178"
    };
  }

  drawFrame(dt) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const { particleId, speed, opacity } = this.config;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    if (particleId === "none") return;
    const speedFactor = Math.max(0.2, Number(speed || 1));
    const baseAlpha = Math.min(1, Math.max(0.08, Number(opacity ?? 0.72)));

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.x += p.vx * dt * speedFactor;
      p.y += p.vy * dt * speedFactor;
      p.phase += dt * (p.twinkleRate || 1.8) * speedFactor;

      if (particleId === "rain") {
        if (p.y > h + 30 || p.x < -120) {
          this.particles[i] = this.spawnParticle("rain", false);
        }
        const alpha = Math.min(0.85, baseAlpha * 0.58 * p.depth);
        ctx.strokeStyle = `rgba(196, 232, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.len * 0.16, p.y + p.len);
        ctx.stroke();
      } else if (particleId === "snow") {
        if (p.y > h + 20) {
          this.particles[i] = this.spawnParticle("snow", false);
        }
        const drawX = p.x + Math.sin(p.phase) * p.swayAmp;
        const alpha = Math.min(0.95, baseAlpha * (0.45 + 0.45 * p.depth));
        ctx.fillStyle = `rgba(241, 245, 249, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(drawX, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (particleId === "fireflies") {
        if (p.x < -30) p.x = w + 25;
        if (p.x > w + 30) p.x = -25;
        if (p.y < -30) p.y = h + 25;
        if (p.y > h + 30) p.y = -25;
        const pulse = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(p.phase));
        const alpha = Math.min(0.95, baseAlpha * pulse);
        const glowRadius = p.size * 4.2;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        grad.addColorStop(0, `rgba(254, 240, 138, ${alpha.toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(251, 191, 36, ${(alpha * 0.55).toFixed(3)})`);
        grad.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (particleId === "breeze") {
        if (p.x > w + 30 || p.y > h + 30) {
          this.particles[i] = this.spawnParticle("breeze", false);
        }
        const alpha = Math.min(0.85, baseAlpha * 0.65 * p.depth);
        ctx.fillStyle = `rgba(167, 243, 208, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(
          p.x,
          p.y + Math.sin(p.phase) * 14,
          p.size * 1.6,
          p.size * 0.68,
          p.rot + p.phase * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (particleId === "starlight") {
        if (p.y < -20) p.y = h + 15;
        if (p.x < -20) p.x = w + 15;
        if (p.x > w + 20) p.x = -15;
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.phase));
        const alpha = Math.min(0.95, baseAlpha * twinkle);
        ctx.fillStyle = `rgba(224, 242, 254, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // ambient_drift
        if (p.y < -24) p.y = h + 20;
        if (p.x < -24) p.x = w + 20;
        if (p.x > w + 24) p.x = -20;
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.phase));
        const alpha = Math.min(0.75, baseAlpha * 0.55 * pulse);
        const r = p.size * 2.4;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, `rgba(${p.tint}, ${alpha.toFixed(3)})`);
        grad.addColorStop(1, `rgba(${p.tint}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export const deepFocusParticles = new DeepFocusParticleEngine();
