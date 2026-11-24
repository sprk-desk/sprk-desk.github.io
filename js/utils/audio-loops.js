// Pure Purchasable Ambient Noise Loop Disc Definitions & Disc Partitioning Helpers

export const AMBIENT_LOOP_DISCS = Object.freeze([
  {
    id: "music_loop_rain",
    loopId: "rain",
    category: "music",
    targetObject: "audio",
    name: "Soft Rain Loop",
    description: "Pure continuous soft rain loop for calm reading and problem sets.",
    price: 15,
    rarity: "common",
    premiumOnly: false,
    icon: "🌧",
    swatch: "#5fa3b8",
    audioMix: { rain: 0.7 },
    tempoLabel: "Loop · Soft Rain"
  },
  {
    id: "music_loop_forest",
    loopId: "forest",
    category: "music",
    targetObject: "audio",
    name: "Forest Canopy Loop",
    description: "Pure garden wind and rustling canopy breeze loop.",
    price: 20,
    rarity: "common",
    premiumOnly: false,
    icon: "🌿",
    swatch: "#68a878",
    audioMix: { forest: 0.7 },
    tempoLabel: "Loop · Forest Breeze"
  },
  {
    id: "music_loop_cafe",
    loopId: "cafe",
    category: "music",
    targetObject: "audio",
    name: "Quiet Study Cafe Loop",
    description: "Warm study-hall room tone for quiet body-doubling focus.",
    price: 20,
    rarity: "common",
    premiumOnly: false,
    icon: "☕",
    swatch: "#9c7a56",
    audioMix: { cafe: 0.65 },
    tempoLabel: "Loop · Study Hall"
  },
  {
    id: "music_loop_fireplace",
    loopId: "fireplace",
    category: "music",
    targetObject: "audio",
    name: "Hearth Fireplace Loop",
    description: "Steady crackling amber hearth embers on endless loop.",
    price: 20,
    rarity: "common",
    premiumOnly: false,
    icon: "🔥",
    swatch: "#df7a50",
    audioMix: { fireplace: 0.7 },
    tempoLabel: "Loop · Hearth"
  },
  {
    id: "music_loop_ocean",
    loopId: "ocean",
    category: "music",
    targetObject: "audio",
    name: "Ocean Waves Loop",
    description: "Rhythmic coastal tide swells modulated on a calm ambient cycle.",
    price: 25,
    rarity: "rare",
    premiumOnly: false,
    icon: "🌊",
    swatch: "#4b95ad",
    audioMix: { ocean: 0.7 },
    tempoLabel: "Loop · Ocean Surf"
  },
  {
    id: "music_loop_brown",
    loopId: "brownNoise",
    category: "music",
    targetObject: "audio",
    name: "Brown Noise Focus Loop",
    description: "Deep warm low-frequency brown noise floor for zero-distraction study.",
    price: 25,
    rarity: "rare",
    premiumOnly: false,
    icon: "〰",
    swatch: "#7d6858",
    audioMix: { brownNoise: 0.65 },
    tempoLabel: "Loop · Brown Noise"
  }
]);

export function partitionMusicDiscs({
  builtinDiscs = [],
  catalogItems = [],
  ownedItemIds = []
} = {}) {
  const ownedSet = new Set(ownedItemIds || []);
  const musicCatalog = (catalogItems || []).filter((item) => item.category === "music");
  const loopIconById = new Map(AMBIENT_LOOP_DISCS.map((d) => [d.id, d.icon]));

  const ownedShopDiscs = musicCatalog
    .filter((item) => ownedSet.has(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: loopIconById.get(item.id) || "💿",
      swatch: item.swatch || "#7cd1da",
      mix: item.audioMix || {},
      tempoLabel: item.tempoLabel || "Soundscape",
      owned: true,
      price: item.price || 0
    }));

  const purchasableDiscs = musicCatalog
    .filter((item) => !ownedSet.has(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || "",
      icon: loopIconById.get(item.id) || "💿",
      swatch: item.swatch || "#7cd1da",
      mix: item.audioMix || {},
      tempoLabel: item.tempoLabel || "Purchasable Disc",
      owned: false,
      price: Number(item.price || 0)
    }));

  return {
    ownedDiscs: [...(builtinDiscs || []).map((d) => ({ ...d, owned: true, price: 0 })), ...ownedShopDiscs],
    purchasableDiscs
  };
}
