// Object-Specific Accessible Dialog Engine
import { navigateToFeature } from "../router.js";

class DialogManager {
  constructor() {
    this.dialog = null;
    this.bodyEl = null;
    this.titleEl = null;
    this.eyebrowEl = null;
    this.iconEl = null;
    this.activeFeature = null;
    this.activeParam = null;
    this.lastTrigger = null;
    this.renderers = new Map();
    this.cleanupFn = null;
  }

  init() {
    this.dialog = document.getElementById("sprk-dialog");
    this.bodyEl = document.getElementById("sprk-dialog-body");
    this.titleEl = document.getElementById("sprk-dialog-title");
    this.eyebrowEl = document.getElementById("sprk-dialog-eyebrow");
    this.iconEl = document.getElementById("sprk-dialog-icon");

    const closeBtn = this.dialog?.querySelector(".sprk-dialog-close");
    closeBtn?.addEventListener("click", () => this.close());

    this.dialog?.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.close();
    });

    this.dialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
  }

  register(feature, renderer) {
    this.renderers.set(feature, renderer);
  }

  open(feature, triggerEl = null, param = null, { syncHash = true } = {}) {
    if (!this.dialog || !this.renderers.has(feature)) return;
    if (this.dialog.open && this.activeFeature === feature && this.activeParam === param) {
      return;
    }
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }

    this.lastTrigger = triggerEl || document.activeElement;
    this.activeFeature = feature;
    this.activeParam = param;
    const renderer = this.renderers.get(feature);

    this.dialog.dataset.dialogSkin = renderer.skin || feature;
    this.eyebrowEl.textContent = renderer.eyebrow || "";
    this.titleEl.textContent = renderer.title || "SPRK Desk";
    this.iconEl.textContent = renderer.icon || "";

    this.bodyEl.innerHTML = "";
    const maybeCleanup = renderer.render(this.bodyEl, {
      param,
      rerender: () => this.rerender(),
      close: () => this.close()
    });
    if (typeof maybeCleanup === "function") {
      this.cleanupFn = maybeCleanup;
    }

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
    if (syncHash) {
      navigateToFeature(feature, param);
    }
  }

  rerender() {
    if (!this.activeFeature || !this.dialog?.open) return;
    const renderer = this.renderers.get(this.activeFeature);
    if (!renderer) return;
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.bodyEl.innerHTML = "";
    const maybeCleanup = renderer.render(this.bodyEl, {
      param: this.activeParam,
      rerender: () => this.rerender(),
      close: () => this.close()
    });
    if (typeof maybeCleanup === "function") {
      this.cleanupFn = maybeCleanup;
    }
  }

  close({ syncHash = true } = {}) {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.activeFeature = null;
    this.activeParam = null;
    if (this.dialog?.open) {
      this.dialog.close();
    }
    if (syncHash && window.location.hash && window.location.hash !== "#/") {
      navigateToFeature("room");
    }
    if (this.lastTrigger && typeof this.lastTrigger.focus === "function" && document.contains(this.lastTrigger)) {
      this.lastTrigger.focus();
      this.lastTrigger = null;
    }
  }
}

export const dialogManager = new DialogManager();
