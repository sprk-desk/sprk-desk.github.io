// Pure Shop Catalog, Category Navigation & Preview Descriptor Rules
import { hasCustomSpritePack, resolveObjectSpriteSrc } from "./theme-sprites.js";

export const SHOP_CATEGORIES = [
  {
    id: "all",
    label: "All Wares",
    shortLabel: "All",
    icon: "🛍️",
    description: "Browse every department in the Merchant Bird's Curio Shop."
  },
  {
    id: "theme",
    label: "Room Themes",
    shortLabel: "Themes",
    icon: "🏡",
    description: "Transform your study walls, windows, woodwork, and themed sprites."
  },
  {
    id: "skin",
    label: "Object Skins",
    shortLabel: "Skins",
    icon: "🎨",
    description: "Custom finishes for your desk plant, clock, bird, notebook, and gear."
  },
  {
    id: "deco",
    label: "Room Decor",
    shortLabel: "Decor",
    icon: "🎀",
    description: "Fixed penstands, shelf accents, desk charms, and fairy lights."
  },
  {
    id: "music",
    label: "Music & Audio",
    shortLabel: "Music",
    icon: "🎵",
    description: "Curated procedural soundscapes and lo-fi mixes for deep focus."
  },
  {
    id: "ambience",
    label: "Lighting & Ambience",
    shortLabel: "Ambience",
    icon: "🌤️",
    description: "Window weather moods, sky phases, and warm study lamp presets."
  }
];

export const THEME_PALETTES = {
  comic: {
    wall: "#f7eedb", wallLight: "#fff8e9", wallShadow: "#d7c6a9", floor: "#d7c4a4",
    ink: "#342c25", wood: "#b97848", woodLight: "#e2a56d", deskTop: "#f1c78f",
    accent: "#e76d50", caseBack: "#f6ecd7", hillA: "#8ebc91", hillB: "#548b70",
    skyTop: "#89c8d8", skyBottom: "#efe6b9", windowShape: "rect"
  },
  modern: {
    wall: "#dbeaf0", wallLight: "#f1fbff", wallShadow: "#adc8d5", floor: "#9ebac7",
    ink: "#193b4b", wood: "#56899b", woodLight: "#8ec4d2", deskTop: "#b8e3e6",
    accent: "#329da5", caseBack: "#cce3ea", hillA: "#6eb3b3", hillB: "#347786",
    skyTop: "#7ac6d4", skyBottom: "#d8f2f5", windowShape: "rect"
  },
  vintage: {
    wall: "#ece0ca", wallLight: "#fbf4e6", wallShadow: "#cbb796", floor: "#b89c78",
    ink: "#332419", wood: "#7d4f30", woodLight: "#b67e51", deskTop: "#a76f43",
    accent: "#9c6334", caseBack: "#e6d3b3", hillA: "#8da677", hillB: "#556e4d",
    skyTop: "#92b8bf", skyBottom: "#efe2bc", windowShape: "rect"
  },
  japanese: {
    wall: "#f2ede2", wallLight: "#fcfaf4", wallShadow: "#d5cdbc", floor: "#d9cfad",
    ink: "#2b2c26", wood: "#b89668", woodLight: "#dfc49a", deskTop: "#e8d2ad",
    accent: "#5e8466", caseBack: "#ede6d6", hillA: "#9db897", hillB: "#5f8265",
    skyTop: "#a3cbd0", skyBottom: "#f3ecd3", windowShape: "shoji"
  },
  rainy: {
    wall: "#ced9e2", wallLight: "#eef4f8", wallShadow: "#a5b6c4", floor: "#8ea1b0",
    ink: "#1f2e3b", wood: "#5d6f7d", woodLight: "#899dac", deskTop: "#a4b5c2",
    accent: "#457294", caseBack: "#d6e0e8", hillA: "#6a8d8e", hillB: "#3d5d62",
    skyTop: "#647f94", skyBottom: "#b5c8d6", windowShape: "rect"
  },
  cottagecore: {
    wall: "#edf2e1", wallLight: "#fafcf3", wallShadow: "#c7d4b6", floor: "#c8b28e",
    ink: "#313829", wood: "#b58450", woodLight: "#ddb079", deskTop: "#e9c592",
    accent: "#689157", caseBack: "#eef3e4", hillA: "#98c78a", hillB: "#5c9059",
    skyTop: "#9bd2db", skyBottom: "#f5ecc5", windowShape: "rect"
  },
  space: {
    wall: "#1d2d44", wallLight: "#f0f6fc", wallShadow: "#121e30", floor: "#273952",
    ink: "#102033", wood: "#4c6480", woodLight: "#7c97b5", deskTop: "#98afc7",
    accent: "#3194ad", caseBack: "#2c415c", hillA: "#1c3456", hillB: "#102038",
    skyTop: "#0b1629", skyBottom: "#1f3c63", windowShape: "viewport"
  },
  autumn: {
    wall: "#f2dec8", wallLight: "#fdf6ec", wallShadow: "#cfa985", floor: "#c28e64",
    ink: "#3b2418", wood: "#a35a36", woodLight: "#d68b5d", deskTop: "#e3a776",
    accent: "#c4582c", caseBack: "#f5e2cd", hillA: "#d99c5b", hillB: "#a15538",
    skyTop: "#7e85a8", skyBottom: "#f5c284", windowShape: "rect"
  },
  winter: {
    wall: "#dfeaf2", wallLight: "#f7fbfe", wallShadow: "#b5cad9", floor: "#a5846c",
    ink: "#22303c", wood: "#845940", woodLight: "#b88a6b", deskTop: "#c99d7d",
    accent: "#4c7c9e", caseBack: "#e6eff5", hillA: "#d9e7ef", hillB: "#8ba8bc",
    skyTop: "#8cb0cc", skyBottom: "#e7f1f7", windowShape: "rect"
  },
  midnight: {
    wall: "#232842", wallLight: "#f6f4ef", wallShadow: "#15192b", floor: "#2c2430",
    ink: "#1d1f2e", wood: "#5e3f35", woodLight: "#8b6052", deskTop: "#7d5447",
    accent: "#b88432", caseBack: "#2d324f", hillA: "#3b4f66", hillB: "#223042",
    skyTop: "#0e1d38", skyBottom: "#2b4d6f", windowShape: "rect"
  },
  jungle: {
    wall: "#e6efe0", wallLight: "#f7fbf2", wallShadow: "#bdd1b3", floor: "#b9a176",
    ink: "#273624", wood: "#8c6438", woodLight: "#c2955d", deskTop: "#d9b073",
    accent: "#4c8c4a", caseBack: "#dde9d4", hillA: "#6ea962", hillB: "#356e43",
    skyTop: "#89ced1", skyBottom: "#dff0c2", windowShape: "rect"
  },
  anime: {
    wall: "#f6eefa", wallLight: "#fffafd", wallShadow: "#dbcbe6", floor: "#d9c5dd",
    ink: "#382c47", wood: "#c58ba4", woodLight: "#eabfcf", deskTop: "#f3dce6",
    accent: "#df779e", caseBack: "#f2e8f8", hillA: "#d8a7cb", hillB: "#897aa8",
    skyTop: "#b89bd1", skyBottom: "#ffe3ca", windowShape: "rect"
  },
  ocean: {
    wall: "#d6eef0", wallLight: "#f2fcfd", wallShadow: "#9ecad0", floor: "#7aaab3",
    ink: "#173a47", wood: "#4f8594", woodLight: "#89bcc7", deskTop: "#b6dee3",
    accent: "#e07a67", caseBack: "#c8e7ea", hillA: "#4f9e9e", hillB: "#286575",
    skyTop: "#74ccd4", skyBottom: "#1f5c6e", windowShape: "porthole"
  },
  alchemy: {
    wall: "#2b233d", wallLight: "#faf3fc", wallShadow: "#1b1529", floor: "#36283e",
    ink: "#1e162b", wood: "#6e4e44", woodLight: "#a67e5f", deskTop: "#825b4e",
    accent: "#c78b4b", caseBack: "#392e50", hillA: "#4f416e", hillB: "#2b2342",
    skyTop: "#1b1736", skyBottom: "#61426d", windowShape: "arch"
  }
};

export const OBJECT_SKIN_META = {
  plant: { label: "Desk Plant", renderKind: "sprite", spriteKey: "plant" },
  trophy: { label: "Shelf Trophy", renderKind: "trophy", spriteKey: "trophy" },
  bird: { label: "Merchant Bird", renderKind: "sprite", spriteKey: "bird" },
  clock: { label: "Focus Clock", renderKind: "svg", spriteKey: "clock" },
  notebook: { label: "Study Notebook", renderKind: "svg", spriteKey: "notebook" },
  phone: { label: "Desk Phone", renderKind: "svg", spriteKey: "phone" },
  headphones: { label: "Desk Headphones", renderKind: "sprite", spriteKey: "headphones" },
  mascot: { label: "Study Buddy", renderKind: "sprite", spriteKey: "buddy" }
};

export const SKIN_STYLES = {
  "plant:lavender": { filter: "hue-rotate(155deg) saturate(1.08)" },
  "plant:jade": { filter: "hue-rotate(30deg) saturate(1.25)" },
  "plant:sunset": { filter: "hue-rotate(-32deg) saturate(1.18)" },
  "bird:emerald": { filter: "hue-rotate(82deg) saturate(1.12)" },
  "headphones:violet": { filter: "hue-rotate(245deg) saturate(1.08)" },
  "mascot:coral": { filter: "hue-rotate(-140deg) saturate(1.18)" },
  "trophy:roseGold": {
    filter: "sepia(0.24) hue-rotate(-22deg) saturate(1.15)",
    vars: { "--trophy-gold": "#eeb09c", "--trophy-stem": "#d48373", "--trophy-base": "#ad5f54" }
  },
  "clock:midnight": {
    vars: { "--clock-ear": "#475478", "--clock-shell": "#323c59", "--clock-dial": "#242b42", "--clock-hand": "#f3d58c" }
  },
  "notebook:sky": {
    vars: { "--nb-spine": "#7faed4" }
  },
  "phone:rose": {
    vars: { "--phone-body": "#c97b8b" }
  }
};

export const SHOP_CATALOG = [
  // --- Room Themes (14) ---
  { id: "theme_comic", category: "theme", targetObject: "room", name: "Warm Comic Storybook", description: "Sunlit cream walls, hand-inked contours, and cozy storybook warmth.", price: 0, rarity: "common", premiumOnly: false, swatch: "#e76d50", themeId: "comic" },
  { id: "theme_modern", category: "theme", targetObject: "room", name: "Modern Cozy", description: "Crisp coastal slate glass, brushed teal metal, and clear twilight skies.", price: 25, rarity: "common", premiumOnly: false, swatch: "#47c5cd", themeId: "modern" },
  { id: "theme_vintage", category: "theme", targetObject: "room", name: "Vintage Study", description: "Polished walnut shelving, antique brass fittings, and parchment warmth.", price: 30, rarity: "rare", premiumOnly: false, swatch: "#b98642", themeId: "vintage" },
  { id: "theme_japanese", category: "theme", targetObject: "room", name: "Japanese Minimal", description: "Shoji lattice daylight, pale hinoki timber, and quiet zen calm.", price: 35, rarity: "rare", premiumOnly: false, swatch: "#688d73", themeId: "japanese" },
  { id: "theme_rainy", category: "theme", targetObject: "room", name: "Rainy Day", description: "Cool slate rain-mist light balanced by a warm amber desk lamp.", price: 25, rarity: "common", premiumOnly: false, swatch: "#5682a3", themeId: "rainy" },
  { id: "theme_cottagecore", category: "theme", targetObject: "room", name: "Cottagecore", description: "Sage wainscoting, wildflower meadow hues, and honey-oak finishes.", price: 40, rarity: "rare", premiumOnly: false, swatch: "#789d65", themeId: "cottagecore" },
  { id: "theme_space", category: "theme", targetObject: "room", name: "Space Station", description: "Orbital viewport overlooking a starfield with instrument-grade trim.", price: 60, rarity: "artisan", premiumOnly: true, swatch: "#52b2cf", themeId: "space" },
  { id: "theme_autumn", category: "theme", targetObject: "room", name: "Autumn Evening", description: "Crisp maple tones, caramel timber, and golden-hour study glow.", price: 35, rarity: "rare", premiumOnly: false, swatch: "#cf6a3c", themeId: "autumn" },
  { id: "theme_winter", category: "theme", targetObject: "room", name: "Winter Cabin", description: "Frosted window panes, cedar framing, and snug fireplace warmth.", price: 45, rarity: "rare", premiumOnly: false, swatch: "#6f9db8", themeId: "winter" },
  { id: "theme_midnight", category: "theme", targetObject: "room", name: "Midnight Library", description: "Deep indigo plaster, antique mahogany, and quiet midnight lamp light.", price: 55, rarity: "artisan", premiumOnly: false, swatch: "#d4a84f", themeId: "midnight" },
  { id: "theme_jungle", category: "theme", targetObject: "room", name: "Jungle Treehouse", description: "Bamboo canopy, capybara buddy, toucan courier, and tropical ferns.", price: 45, rarity: "rare", premiumOnly: false, swatch: "#4c8c4a", themeId: "jungle" },
  { id: "theme_anime", category: "theme", targetObject: "room", name: "Anime Lo-Fi Studio", description: "Pastel sakura bonsai, neko monitor, bunny headphones, and twilight vibe.", price: 55, rarity: "artisan", premiumOnly: false, swatch: "#df779e", themeId: "anime" },
  { id: "theme_ocean", category: "theme", targetObject: "room", name: "Coral Observatory", description: "Submarine porthole view, sea otter buddy, puffin sailor, and jellyfish lamp.", price: 50, rarity: "rare", premiumOnly: false, swatch: "#e07a67", themeId: "ocean" },
  { id: "theme_alchemy", category: "theme", targetObject: "room", name: "Starlight Apothecary", description: "Moonlit crystals, wizard cat familiar, and enchanted brass furnishings.", price: 60, rarity: "artisan", premiumOnly: false, swatch: "#c78b4b", themeId: "alchemy" },

  // --- Object Skins (10) ---
  { id: "skin_plant_lavender", category: "skin", targetObject: "plant", name: "Lavender Terracotta", description: "Soft lavender botanical leaves in a glazed violet pot.", price: 20, rarity: "common", premiumOnly: false, swatch: "#9c83bd", skinName: "lavender" },
  { id: "skin_plant_jade", category: "skin", targetObject: "plant", name: "Jade Monstera", description: "Deep emerald leaves in a celadon ceramic planter.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#4eaa83", skinName: "jade" },
  { id: "skin_plant_sunset", category: "skin", targetObject: "plant", name: "Golden Ginkgo", description: "Sun-dappled autumn foliage in an ochre stoneware pot.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#d5954c", skinName: "sunset" },
  { id: "skin_trophy_rosegold", category: "skin", targetObject: "trophy", name: "Rose Gold Chalice", description: "Brushed rose-gold award finish for your shelf.", price: 35, rarity: "rare", premiumOnly: false, swatch: "#c87968", skinName: "roseGold" },
  { id: "skin_bird_emerald", category: "skin", targetObject: "bird", name: "Emerald Finch", description: "Shining emerald wing plumage for your visiting merchant.", price: 30, rarity: "rare", premiumOnly: false, swatch: "#368b68", skinName: "emerald" },
  { id: "skin_clock_midnight", category: "skin", targetObject: "clock", name: "Midnight Brass Clock", description: "Deep slate dial with warm gilded bezel.", price: 20, rarity: "common", premiumOnly: false, swatch: "#36405a", skinName: "midnight" },
  { id: "skin_notebook_sky", category: "skin", targetObject: "notebook", name: "Skyline Linen Journal", description: "Powder-blue cloth binding with cream ruled pages.", price: 15, rarity: "common", premiumOnly: false, swatch: "#8cb8d8", skinName: "sky" },
  { id: "skin_phone_rose", category: "skin", targetObject: "phone", name: "Rosewood Case", description: "Warm dusty-rose protective shell for your desk phone.", price: 15, rarity: "common", premiumOnly: false, swatch: "#c87686", skinName: "rose" },
  { id: "skin_headphones_violet", category: "skin", targetObject: "headphones", name: "Amethyst Studio Cans", description: "Soft violet studio cushions tuned for late-night study.", price: 25, rarity: "common", premiumOnly: false, swatch: "#8f6cb8", skinName: "violet" },
  { id: "skin_mascot_coral", category: "skin", targetObject: "mascot", name: "Coral Peach Buddy", description: "Warm sunset-coral coat for your desk study companion.", price: 30, rarity: "rare", premiumOnly: false, swatch: "#e07b6c", skinName: "coral" },

  // --- Music & Soundscapes (5) ---
  {
    id: "music_rainy_vinyl",
    category: "music",
    targetObject: "audio",
    name: "Midnight Rain & Vinyl",
    description: "Gentle window rain layered with evening breeze and soft electric piano chords.",
    price: 0,
    rarity: "common",
    premiumOnly: false,
    swatch: "#5682a3",
    audioMix: { rain: 0.65, wind: 0.25, lofi: 0.35 },
    tempoLabel: "72 BPM · Lo-Fi Rain"
  },
  {
    id: "music_fireplace_study",
    category: "music",
    targetObject: "audio",
    name: "Hearthside Crackling Study",
    description: "Crackling oak embers paired with muted quiet-hall warmth.",
    price: 20,
    rarity: "common",
    premiumOnly: false,
    swatch: "#d47448",
    audioMix: { fireplace: 0.72, rain: 0.22, cafe: 0.15 },
    tempoLabel: "Warm Hearth · Cozy"
  },
  {
    id: "music_sakura_chimes",
    category: "music",
    targetObject: "audio",
    name: "Sakura Lo-Fi & Chimes",
    description: "Warm electric keys drifting over garden breeze and leaves.",
    price: 30,
    rarity: "rare",
    premiumOnly: false,
    swatch: "#df779e",
    audioMix: { lofi: 0.62, forest: 0.36, wind: 0.18 },
    tempoLabel: "68 BPM · Pastel Keys"
  },
  {
    id: "music_ocean_tide",
    category: "music",
    targetObject: "audio",
    name: "Coral Tide & Sea Breeze",
    description: "Slow rolling ocean waves balanced with soft coastal air.",
    price: 30,
    rarity: "rare",
    premiumOnly: false,
    swatch: "#47a6b5",
    audioMix: { ocean: 0.68, wind: 0.25, whiteNoise: 0.12 },
    tempoLabel: "Surf Cycle · Deep Calm"
  },
  {
    id: "music_orbital_synth",
    category: "music",
    targetObject: "audio",
    name: "Orbital Focus Pad",
    description: "Deep-focus harmonic chords with smooth pink-noise masking.",
    price: 45,
    rarity: "artisan",
    premiumOnly: false,
    swatch: "#4dc4d6",
    audioMix: { lofi: 0.52, whiteNoise: 0.28, wind: 0.18 },
    tempoLabel: "60 BPM · Ambient Synth"
  },

  // --- Lighting & Ambience Packs (4) ---
  {
    id: "ambience_golden_hour",
    category: "ambience",
    targetObject: "environment",
    name: "Golden Hour Sunbeam",
    description: "Warm sunset sky outside your window paired with a glowing amber desk lamp.",
    price: 0,
    rarity: "common",
    premiumOnly: false,
    swatch: "#e89c5e",
    ambiencePreset: {
      timeOfDay: "sunset",
      weather: "clear",
      lighting: { lampOn: true, lampIntensity: 75, warmth: 55, ambientDarkness: 16 }
    }
  },
  {
    id: "ambience_firefly_meadow",
    category: "ambience",
    targetObject: "environment",
    name: "Evening Firefly Meadow",
    description: "Starry midnight glass with drifting fireflies and snug lamp focus light.",
    price: 25,
    rarity: "rare",
    premiumOnly: false,
    swatch: "#3c527a",
    ambiencePreset: {
      timeOfDay: "night",
      weather: "fireflies",
      lighting: { lampOn: true, lampIntensity: 82, warmth: 46, ambientDarkness: 42 }
    }
  },
  {
    id: "ambience_winter_snowfall",
    category: "ambience",
    targetObject: "environment",
    name: "Soft Snowfall Window",
    description: "Crisp afternoon mist and gentle snow drifting past a warmly lit desk.",
    price: 30,
    rarity: "rare",
    premiumOnly: false,
    swatch: "#8fb6cc",
    ambiencePreset: {
      timeOfDay: "afternoon",
      weather: "snow",
      lighting: { lampOn: true, lampIntensity: 78, warmth: 42, ambientDarkness: 14 }
    }
  },
  {
    id: "ambience_spring_breeze",
    category: "ambience",
    targetObject: "environment",
    name: "Spring Breeze Canopy",
    description: "Bright morning daylight with fresh garden leaves drifting past the pane.",
    price: 20,
    rarity: "common",
    premiumOnly: false,
    swatch: "#80b885",
    ambiencePreset: {
      timeOfDay: "morning",
      weather: "breeze",
      lighting: { lampOn: false, lampIntensity: 60, warmth: 25, ambientDarkness: 4 }
    }
  },

  // --- Fixed Room Decorations (Add / Change / Remove, Locked Position) ---
  { id: "deco_penstand_classic", category: "deco", targetObject: "penstand", decoSlot: "penstand", decoStyle: "classic", name: "Classic Ceramic Penstand", description: "Warm cream pen cup holding colorful desk pencils.", price: 0, rarity: "starter", premiumOnly: false, swatch: "#fff3dc" },
  { id: "deco_penstand_mint", category: "deco", targetObject: "penstand", decoSlot: "penstand", decoStyle: "mint", name: "Mint Ribbed Penstand", description: "Pastel sage ceramic holder with highlighters and fineliners.", price: 0, rarity: "starter", premiumOnly: false, swatch: "#9fd1be" },
  { id: "deco_penstand_cat", category: "deco", targetObject: "penstand", decoSlot: "penstand", decoStyle: "cat", name: "Calico Cat Penstand", description: "Playful cat-eared tabletop cup to brighten your desk.", price: 20, rarity: "common", premiumOnly: false, swatch: "#f5c798" },
  { id: "deco_penstand_brass", category: "deco", targetObject: "penstand", decoSlot: "penstand", decoStyle: "brass", name: "Brass Studio Caddy", description: "Antique brass tumbler with fountain pen and drafting ruler.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#cfa152" },
  { id: "deco_penstand_crystal", category: "deco", targetObject: "penstand", decoSlot: "penstand", decoStyle: "crystal", name: "Amethyst Prism Cup", description: "Faceted crystal penstand with a quill for late-night notes.", price: 30, rarity: "artisan", premiumOnly: false, swatch: "#b896e0" },
  { id: "deco_candle_lantern", category: "deco", targetObject: "shelfCandle", decoSlot: "shelfCandle", decoStyle: "lantern", name: "Brass Mini Lantern", description: "Fixed cozy brass lantern perched on your second shelf.", price: 20, rarity: "common", premiumOnly: false, swatch: "#d9a24e" },
  { id: "deco_candle_jar", category: "deco", targetObject: "shelfCandle", decoSlot: "shelfCandle", decoStyle: "jar", name: "Lavender Glass Jar", description: "Frosted violet scented jar candle for calm study nights.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#b99fd8" },
  { id: "deco_bookend_cat", category: "deco", targetObject: "bookend", decoSlot: "bookend", decoStyle: "luckyCat", name: "Lucky Study Cat", description: "Good-luck charm figurine stationed by your study books.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#f5e3c8" },
  { id: "deco_bookend_globe", category: "deco", targetObject: "bookend", decoSlot: "bookend", decoStyle: "globe", name: "Mini Brass Globe", description: "Antique brass miniature globe for your bottom bookcase shelf.", price: 30, rarity: "rare", premiumOnly: false, swatch: "#6fb7c4" },
  { id: "deco_charm_terrarium", category: "deco", targetObject: "deskCharm", decoSlot: "deskCharm", decoStyle: "terrarium", name: "Moss Terrarium Orb", description: "Pocket-sized glass moss orb tucked beside your blotter.", price: 0, rarity: "starter", premiumOnly: false, swatch: "#84ba86" },
  { id: "deco_charm_washi", category: "deco", targetObject: "deskCharm", decoSlot: "deskCharm", decoStyle: "washiTray", name: "Pastel Washi Stand", description: "Wooden tape rack with pastel rolls on the back desk edge.", price: 20, rarity: "common", premiumOnly: false, swatch: "#f0a8b8" },
  { id: "deco_charm_snowglobe", category: "deco", targetObject: "deskCharm", decoSlot: "deskCharm", decoStyle: "snowglobe", name: "Moonlight Snowglobe", description: "Tiny crescent moon snowglobe anchored on your tabletop.", price: 30, rarity: "artisan", premiumOnly: false, swatch: "#7ea8d8" },
  { id: "deco_lights_warm", category: "deco", targetObject: "stringLights", decoSlot: "stringLights", decoStyle: "warmGarland", name: "Warm Fairy Lights", description: "Soft draped string bulbs along the top of your bookcase.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#ffd578" },
  { id: "deco_lights_starlight", category: "deco", targetObject: "stringLights", decoSlot: "stringLights", decoStyle: "starGarland", name: "Starlight Garland", description: "Botanical vine lights twinkling across your bookcase crown.", price: 35, rarity: "artisan", premiumOnly: false, swatch: "#9fd6b0" }
];

const VALID_CATEGORY_SET = new Set(SHOP_CATEGORIES.map((c) => c.id));

export function normalizeShopCategory(rawCategory) {
  const cleaned = String(rawCategory || "").trim().toLowerCase();
  if (VALID_CATEGORY_SET.has(cleaned)) return cleaned;
  return "all";
}

export function filterShopCatalog(catalog = SHOP_CATALOG, category = "all") {
  const normalized = normalizeShopCategory(category);
  if (normalized === "all") return [...catalog];
  return catalog.filter((item) => item.category === normalized);
}

export function getShopCategoryCounts(catalog = SHOP_CATALOG) {
  const counts = { all: catalog.length };
  for (const cat of SHOP_CATEGORIES) {
    if (cat.id !== "all") counts[cat.id] = 0;
  }
  for (const item of catalog) {
    if (Object.prototype.hasOwnProperty.call(counts, item.category)) {
      counts[item.category] += 1;
    }
  }
  return counts;
}

export function groupShopCatalogByCategory(catalog = SHOP_CATALOG) {
  return SHOP_CATEGORIES
    .filter((cat) => cat.id !== "all")
    .map((cat) => ({
      category: cat,
      items: catalog.filter((item) => item.category === cat.id)
    }))
    .filter((group) => group.items.length > 0);
}

export function getShopPreviewDescriptor(item, currentThemeId = "comic") {
  if (!item) return null;

  if (item.category === "theme") {
    const themeId = item.themeId || "comic";
    const palette = THEME_PALETTES[themeId] || THEME_PALETTES.comic;
    return {
      mode: "room",
      title: item.name,
      subtitle: "Room Theme View",
      themeId,
      palette,
      hasCustomSprites: hasCustomSpritePack(themeId),
      featuredSprite: resolveObjectSpriteSrc(themeId, "buddy")
    };
  }

  if (item.category === "skin") {
    const targetObject = item.targetObject || "plant";
    const meta = OBJECT_SKIN_META[targetObject] || { label: targetObject, renderKind: "sprite", spriteKey: targetObject };
    const styleKey = `${targetObject}:${item.skinName || "default"}`;
    const skinStyle = SKIN_STYLES[styleKey] || {};
    const spriteSrc = meta.spriteKey ? resolveObjectSpriteSrc(currentThemeId, meta.spriteKey) : null;
    return {
      mode: "object",
      title: item.name,
      subtitle: `${meta.label} Skin`,
      targetObject,
      targetLabel: meta.label,
      skinName: item.skinName || "default",
      renderKind: meta.renderKind,
      spriteSrc,
      filterCss: skinStyle.filter || "",
      cssVars: skinStyle.vars || {}
    };
  }

  if (item.category === "music") {
    return {
      mode: "audio",
      title: item.name,
      subtitle: item.tempoLabel || "Ambient Soundscape",
      audioMix: item.audioMix || {},
      swatch: item.swatch || "#5682a3"
    };
  }

  if (item.category === "ambience") {
    const preset = item.ambiencePreset || { timeOfDay: "sunset", weather: "clear", lighting: {} };
    const palette = THEME_PALETTES[currentThemeId] || THEME_PALETTES.comic;
    return {
      mode: "ambience",
      title: item.name,
      subtitle: "Window & Room Lighting View",
      themeId: currentThemeId,
      palette,
      preset
    };
  }

  if (item.category === "deco") {
    return {
      mode: "deco",
      title: item.name,
      subtitle: "Fixed Room Decoration",
      decoSlot: item.decoSlot || item.targetObject || "penstand",
      decoStyle: item.decoStyle || "classic",
      swatch: item.swatch || "#e76d50"
    };
  }

  return {
    mode: "object",
    title: item.name,
    subtitle: item.category || "Item"
  };
}
