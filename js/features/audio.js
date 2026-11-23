// Headphones -> Web Audio Ambient Soundscape & Lo-Fi Mixer
import { audioManager, AUDIO_CHANNELS } from "../core/audio-manager.js";
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml } from "../utils/dom.js";

export const audioFeature = {
  skin: "audio",
  eyebrow: "HEADPHONES · PROCEDURAL SOUNDSCAPES",
  title: "Music & Ambience Mixer",
  icon: "🎧",
  render(container, { rerender }) {
    const presets = state.localAudioPresets || {};

    container.innerHTML = `
      <div class="sprk-card" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
        <button type="button" class="sprk-btn sprk-btn-primary" id="audio-master-toggle">
          ${audioManager.isPlaying ? "Pause Ambience" : "Play Ambience"}
        </button>
        <label style="display:flex;align-items:center;gap:10px;flex:1;min-width:180px;">
          <span class="sprk-label" style="white-space:nowrap;">Master Volume</span>
          <input id="audio-master-vol" type="range" min="0" max="100" value="${Math.round(audioManager.masterVolume * 100)}" style="width:100%;" />
        </label>
      </div>

      <div class="sprk-grid-2" style="margin-bottom:14px;">
        ${AUDIO_CHANNELS.map((ch) => {
          const pct = Math.round((audioManager.levels[ch.id] || 0) * 100);
          return `
            <div class="sprk-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="font-size:13px;">${escapeHtml(ch.label)}</strong>
                <span class="tabular-nums sprk-meta" id="lvl-${ch.id}">${pct}%</span>
              </div>
              <div class="sprk-meta" style="margin-bottom:8px;">${escapeHtml(ch.description)}</div>
              <input type="range" min="0" max="100" value="${pct}" data-channel="${ch.id}" aria-label="${escapeHtml(ch.label)} volume" style="width:100%;" />
            </div>
          `;
        }).join("")}
      </div>

      <div class="sprk-card" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="sprk-btn" data-preset-mix="rainy">Rainy Study</button>
          <button type="button" class="sprk-btn" data-preset-mix="hearth">Cozy Hearth</button>
          <button type="button" class="sprk-btn" data-preset-mix="focus">Lo-Fi Keys</button>
          ${Object.keys(presets).map((name) => `<button type="button" class="sprk-btn" data-load-preset="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}
        </div>
        <button type="button" class="sprk-btn" id="audio-save-preset">Save Mix Preset</button>
      </div>
    `;

    container.querySelector("#audio-master-toggle")?.addEventListener("click", async () => {
      await audioManager.togglePlay();
      rerender();
    });

    container.querySelector("#audio-master-vol")?.addEventListener("input", (e) => {
      audioManager.setMasterVolume(Number(e.target.value) / 100);
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

    const applyMix = async (mix) => {
      for (const ch of AUDIO_CHANNELS) {
        audioManager.setChannelLevel(ch.id, mix[ch.id] || 0);
      }
      if (!audioManager.isPlaying) await audioManager.togglePlay(true);
      rerender();
    };

    container.querySelectorAll("[data-preset-mix]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.presetMix;
        if (key === "rainy") applyMix({ rain: 0.65, wind: 0.25, lofi: 0.35 });
        if (key === "hearth") applyMix({ fireplace: 0.7, rain: 0.25 });
        if (key === "focus") applyMix({ lofi: 0.6, whiteNoise: 0.2 });
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
      rerender();
    });
  }
};
