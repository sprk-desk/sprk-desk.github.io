// SPRK Desk — Central Application Configuration
// Safe for static GitHub Pages deployment. Never place service_role keys here.

export const APP_CONFIG = {
  appName: "SPRK Desk",
  tagline: "A Little World for Big Dreams",
  version: "1.0.0",

  // The publishable key is intended for browser use; never put a service_role key here.
  supabase: {
    url: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || "https://isrymcpzfqhtgegdkqxh.supabase.co",
    anonKey: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || "sb_publishable_tEK1u76pQSCfqcPpX9Kldw_v1lyeSnL",
    storageBuckets: {
      avatars: "avatars",
      groups: "group-assets",
      resources: "learning-resources"
    }
  },

  // GitHub Pages subpath compatibility: empty string auto-resolves relative to document.baseURI
  basePath: "",

  defaults: {
    theme: "comic",
    timeOfDay: "auto", // auto | morning | afternoon | sunset | night
    weather: "clear", // clear | rain | snow | fireflies | breeze
    lighting: {
      roomBrightness: 100,
      windowBrightness: 100,
      ambientDarkness: 12,
      lampIntensity: 70,
      warmth: 35,
      lampOn: true,
      windowBeamOn: true
    },
    focus: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      dailyGoalMinutes: 90,
      minVerifiedSeconds: 300, // 5 minutes minimum for verified SC rewards
      heartbeatIntervalSeconds: 30
    }
  },

  economy: {
    currencyName: "Study Credits",
    currencyCode: "SC",
    creditsPerBlock: 10,
    minutesPerBlock: 25,
    maxDailyFocusCredits: 120,
    dailyGoalBonusCredits: 15,
    streakBonusCredits: 20
  },

  groups: {
    maxMembersDefault: 24,
    maxSavedLayoutsFree: 2,
    maxSavedLayoutsPremium: 8
  },

  features: {
    allowVisitorPreview: true,
    enableAudioSynth: true,
    enableDragAndDrop: true
  }
};

export function isSupabaseConfigured() {
  const { url, anonKey } = APP_CONFIG.supabase;
  return Boolean(
    url &&
    anonKey &&
    url.startsWith("https://") &&
    !url.includes("YOUR_PROJECT") &&
    !anonKey.includes("YOUR_ANON")
  );
}
