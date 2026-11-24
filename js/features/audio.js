// Headphones -> Turntable Discs, Live Visualiser Bars & Multi-Channel Mixer
import { audioManager, AUDIO_CHANNELS } from "../core/audio-manager.js";
import { dialogManager } from "../core/dialog-manager.js";
import { state, savePreferences, persistLocalCollection } from "../state.js";
import { SHOP_CATALOG } from "../utils/shop-catalog.js";
import { computeVisualizerBars } from "../utils/dialog-objects.js";
import { escapeHtml } from "../utils/dom.js";

const BUILTIN_DISCS = [
  { id: "disc_rainy", name: "Rainy Study", icon: "🌧", swatch: "#5fa3b8", mix: { rain: 0.65, wind: 0.25, lofi: 0.35 } },
  { id: "disc_hearth", name: "Cozy Hearth", icon: "🔥", swatch: "#df7a50", mix: { fireplace: 0.7, rain: 0.25 } },
  { id: "disc_keys", name: "Lo-Fi Keys", icon: "🎹", swatch: "#d99254", mix: { lofi: 0.6, whiteNoise: 0.2 } }
];

export const audioFeature = {
  skin: "audio",
  eyebrow: "",
  title: "Headphones",
  icon: "🎧",
  render(container, { rerender }) {
    let tab = "discs"; // discs | mixer | saved
    let activeDiscId = state.preferences.activeMusicId || "disc_rainy";
    let tick = 0;

    const getDiscs = () => {
      const shopDiscs = SHOP_CATALOG
        .filter((i) => i.category === "music" && state.ownedItemIds.includes(i.id))
        .map((i) => ({
          id: i.id,
          name: i.name,
          icon: "💿",
          swatch: i.swatch || "#7cd1da",
          mix: i.audioMix || {}
        }));
      return [...BUILTIN_DISCS, ...shopDiscs];
    };

    const applyMix = async (mix, discId = null) => {
      for (const ch of AUDIO_CHANNELS) {
        audioManager.setChannelLevel(ch.id, mix[ch.id] || 0);
      }
      if (discId) {
        activeDiscId = discId;
        savePreferences({ activeMusicId: discId });
      }
      if (!audioManager.isPlaying) await audioManager.togglePlay(true);
      renderView();
    };

    const updateVisualizerDom = () => {
      const barsWrap = container.querySelector("#audio-vis-bars");
      if (!barsWrap) return;
      tick += 1;
      const levels = computeVisualizerBars({
        isPlaying: audioManager.isPlaying,
        levels: audioManager.levels,
        analyserBins: audioManager.getAnalyserBins(),
        barCount: 18,
        tick
      });
      const bars = barsWrap.querySelectorAll(".sprk-vis-bar");
      bars.forEach((bar, i) => {
        const pct = Math.round((levels[i] || 0.14) * 100);
        bar.style.height = `${pct}%`;
      });
    };

    const renderView = () => {
      const presets = state.localAudioPresets || {};
      const discs = getDiscs();
      const activeDisc = discs.find((d) => d.id === activeDiscId) || discs[0];
      const initialBars = computeVisualizerBars({
        isPlaying: audioManager.isPlaying,
        levels: audioManager.levels,
        analyserBins: audioManager.getAnalyserBins(),
        barCount: 18,
        tick
      });

      const seriousMode = Boolean(state.preferences?.seriousMode);
      const lowPassHz = Math.min(20000, Math.max(400, Number(audioManager.lowPassHz || state.preferences?.lowPassHz || 18000)));
      const lowPassLabel = lowPassHz >= 1000 ? `${(lowPassHz / 1000).toFixed(1)} kHz` : `${lowPassHz} Hz`;

      container.innerHTML = `
        <div class="sprk-turntable-card ${audioManager.isPlaying ? "is-playing" : ""}">
          <div class="sprk-turntable-platter" aria-hidden="true">
            <div class="sprk-turntable-vinyl">
              <div class="sprk-turntable-label" style="background:${escapeHtml(activeDisc.swatch)};"></div>
            </div>
            <div class="sprk-turntable-arm"></div>
          </div>

          <div class="sprk-turntable-controls">
            <div class="sprk-turntable-top">
              <button type="button" class="sprk-btn sprk-btn-primary" id="audio-master-toggle" style="min-height:36px;padding:6px 14px;">
                ${audioManager.isPlaying ? (seriousMode ? "Pause" : "⏸ Pause") : (seriousMode ? "Play" : "▶ Play")}
              </button>
              <strong style="font-size:13px;color:#fff6e4;">${seriousMode ? "" : `${escapeHtml(activeDisc.icon)} `}${escapeHtml(activeDisc.name)}</strong>
              <label style="display:flex;align-items:center;gap:8px;min-width:130px;flex:1;max-width:210px;">
                <span aria-hidden="true">${seriousMode ? "Vol" : "🔊"}</span>
                <input id="audio-master-vol" type="range" min="0" max="100" value="${Math.round(audioManager.masterVolume * 100)}" aria-label="Master volume" style="width:100%;" />
              </label>
            </div>

            <div class="sprk-vis-bars" id="audio-vis-bars" aria-label="Audio visualiser">
              ${initialBars.map((val) => `
                <span class="sprk-vis-bar" style="height:${Math.round(val * 100)}%;background:linear-gradient(180deg, ${escapeHtml(activeDisc.swatch)} 0%, #9ce7ef 100%);"></span>
              `).join("")}
            </div>
          </div>
        </div>

        <nav class="sprk-tabs sprk-tabs-cassette" role="tablist" aria-label="Audio controls">
          <button type="button" class="sprk-tab ${tab === "discs" ? "is-active" : ""}" data-atab="discs">${seriousMode ? `Discs (${discs.length})` : `💿 Music Discs (${discs.length})`}</button>
          <button type="button" class="sprk-tab ${tab === "mixer" ? "is-active" : ""}" data-atab="mixer">${seriousMode ? "Mixer & Noise" : "🎚 Sound Mixer"}</button>
          <button type="button" class="sprk-tab ${tab === "saved" ? "is-active" : ""}" data-atab="saved">${seriousMode ? `Saved (${Object.keys(presets).length})` : `💾 Saved (${Object.keys(presets).length})`}</button>
        </nav>

        ${tab === "discs" ? `
          <div class="sprk-disc-grid">
            ${discs.map((disc) => {
              const isAct = disc.id === activeDiscId;
              return `
                <button type="button" class="sprk-disc-tile ${isAct ? "is-active" : ""} ${audioManager.isPlaying ? "is-playing" : ""}" data-disc-id="${escapeHtml(disc.id)}">
                  <div class="sprk-disc-vinyl" aria-hidden="true">
                    <span class="sprk-disc-core" style="background:${escapeHtml(disc.swatch)};">${seriousMode ? "" : disc.icon}</span>
                  </div>
                  <strong style="font-size:12.5px;">${escapeHtml(disc.name)}</strong>
                </button>
              `;
            }).join("")}
          </div>
        ` : tab === "mixer" ? `
          <div class="sprk-card sprk-channel-tile" style="margin-bottom:10px;">
            <div class="sprk-channel-head">
              <span class="sprk-channel-id">Low-Pass Filter (Acoustic Warmth)</span>
              <span class="tabular-nums sprk-meta" id="lbl-lowpass">${lowPassLabel}</span>
            </div>
            <input id="audio-lowpass-slider" type="range" min="400" max="20000" step="100" value="${lowPassHz}" aria-label="Low-pass filter frequency" style="width:100%;" />
          </div>

          <div class="sprk-grid-2">
            ${AUDIO_CHANNELS.map((ch) => {
              const pct = Math.round((audioManager.levels[ch.id] || 0) * 100);
              return `
                <div class="sprk-card sprk-channel-tile">
                  <div class="sprk-channel-head">
                    <span class="sprk-channel-id">
                      ${seriousMode ? "" : `<span aria-hidden="true">${ch.icon}</span>`}
                      <span>${escapeHtml(ch.label)}</span>
                    </span>
                    <span class="tabular-nums sprk-meta" id="lvl-${ch.id}">${pct}%</span>
                  </div>
                  <input type="range" min="0" max="100" value="${pct}" data-channel="${ch.id}" aria-label="${escapeHtml(ch.label)} volume" style="width:100%;" />
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="sprk-card" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;">
              <button type="button" class="sprk-btn sprk-btn-primary" id="audio-save-preset">+ Save Current Disc</button>
              <button type="button" class="sprk-btn" id="open-shop-music">${seriousMode ? "Music Catalog →" : "💿 Music Shop →"}</button>
            </div>
            ${Object.keys(presets).length === 0
              ? `<div class="sprk-meta">No custom mixes saved yet.</div>`
              : `<div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${Object.keys(presets).map((name) => `
                    <button type="button" class="sprk-btn" data-load-preset="${escapeHtml(name)}">${seriousMode ? "" : "💿 "}${escapeHtml(name)}</button>
                  `).join("")}
                </div>`}
          </div>
        `}
      `;

      container.querySelectorAll("[data-atab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.atab;
          renderView();
        });
      });

      container.querySelector("#audio-master-toggle")?.addEventListener("click", async () => {
        await audioManager.togglePlay();
        rerender();
      });

      container.querySelector("#audio-master-vol")?.addEventListener("input", (e) => {
        audioManager.setMasterVolume(Number(e.target.value) / 100);
      });

      container.querySelector("#audio-lowpass-slider")?.addEventListener("input", (e) => {
        const hz = Number(e.target.value);
        audioManager.setLowPassFilter(hz);
        savePreferences({ lowPassHz: hz });
        const lbl = container.querySelector("#lbl-lowpass");
        if (lbl) lbl.textContent = hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${hz} Hz`;
      });

      container.querySelectorAll("[data-disc-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const disc = discs.find((d) => d.id === btn.dataset.discId);
          if (disc) applyMix(disc.mix, disc.id);
        });
      });

      container.querySelectorAll("[data-channel]").forEach((slider) => {
        slider.addEventListener("input", (e) => {
          const id = slider.dataset.channel;
          const val = Number(e.target.value);
          audioManager.setChannelLevel(id, val / 100);
          const label = container.querySelector(`#lvl-${id}`);
          if (label) label.textContent = `${val}%`;
        });
      });

      container.querySelectorAll("[data-load-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mix = presets[btn.dataset.loadPreset];
          if (mix) applyMix(mix);
        });
      });

      container.querySelector("#audio-save-preset")?.addEventListener("click", () => {
        const idx = Object.keys(presets).length + 1;
        persistLocalCollection("localAudioPresets", {
          ...presets,
          [`Mix ${idx}`]: { ...audioManager.levels }
        });
        renderView();
      });

      container.querySelector("#open-shop-music")?.addEventListener("click", (e) => {
        dialogManager.open("shop", e.currentTarget, "music");
      });
    };

    renderView();

    const visTimer = window.setInterval(updateVisualizerDom, 90);
    return () => window.clearInterval(visTimer);
  }
};
