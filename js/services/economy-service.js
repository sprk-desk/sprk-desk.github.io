// Server-Authoritative Study Credit Economy & Desk Shop Catalog
import { supabase } from "./supabase.js";
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { generateId } from "../utils/dom.js";

// Canonical Desk Shop catalog (mirrors supabase/seed.sql)
export const SHOP_CATALOG = [
  { id: "theme_comic", category: "theme", targetObject: "room", name: "Warm Comic Storybook", description: "Sunlit cream walls, hand-inked contours, and cozy storybook warmth.", price: 0, rarity: "common", premiumOnly: false, swatch: "#e76d50", themeId: "comic" },
  { id: "theme_modern", category: "theme", targetObject: "room", name: "Modern Cozy", description: "Crisp coastal slate glass, brushed teal metal, and clear twilight skies.", price: 0, rarity: "common", premiumOnly: false, swatch: "#47c5cd", themeId: "modern" },
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

  { id: "skin_plant_lavender", category: "skin", targetObject: "plant", name: "Lavender Terracotta", description: "Soft lavender botanical leaves in a glazed violet pot.", price: 20, rarity: "common", premiumOnly: false, swatch: "#9c83bd", skinName: "lavender" },
  { id: "skin_plant_jade", category: "skin", targetObject: "plant", name: "Jade Monstera", description: "Deep emerald leaves in a celadon ceramic planter.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#4eaa83", skinName: "jade" },
  { id: "skin_plant_sunset", category: "skin", targetObject: "plant", name: "Golden Ginkgo", description: "Sun-dappled autumn foliage in an ochre stoneware pot.", price: 25, rarity: "rare", premiumOnly: false, swatch: "#d5954c", skinName: "sunset" },
  { id: "skin_trophy_rosegold", category: "skin", targetObject: "trophy", name: "Rose Gold Chalice", description: "Brushed rose-gold award finish for your shelf.", price: 35, rarity: "rare", premiumOnly: false, swatch: "#c87968", skinName: "roseGold" },
  { id: "skin_bird_emerald", category: "skin", targetObject: "bird", name: "Emerald Finch", description: "Shining emerald wing plumage for your visiting merchant.", price: 30, rarity: "rare", premiumOnly: false, swatch: "#368b68", skinName: "emerald" },
  { id: "skin_clock_midnight", category: "skin", targetObject: "clock", name: "Midnight Brass Clock", description: "Deep slate dial with warm gilded bezel.", price: 20, rarity: "common", premiumOnly: false, swatch: "#36405a", skinName: "midnight" },
  { id: "skin_notebook_sky", category: "skin", targetObject: "notebook", name: "Skyline Linen Journal", description: "Powder-blue cloth binding with cream ruled pages.", price: 15, rarity: "common", premiumOnly: false, swatch: "#8cb8d8", skinName: "sky" },
  { id: "skin_phone_rose", category: "skin", targetObject: "phone", name: "Rosewood Case", description: "Warm dusty-rose protective shell for your desk phone.", price: 15, rarity: "common", premiumOnly: false, swatch: "#c87686", skinName: "rose" }
];

export async function purchaseShopItem(itemId) {
  if (!supabase.configured || !state.user?.id) {
    return {
      ok: false,
      error: "Sign in with a configured Supabase account to mint and spend server-verified Study Credits."
    };
  }
  const idempotencyKey = generateId("buy");
  const { data, error } = await supabase.rpc("purchase_catalog_item", {
    p_item_id: itemId,
    p_idempotency_key: idempotencyKey
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!state.ownedItemIds.includes(itemId)) {
    state.ownedItemIds = [...state.ownedItemIds, itemId];
  }
  if (typeof data?.balance === "number") {
    state.wallet = { ...state.wallet, balance: data.balance };
  }
  bus.emit("economy:updated", state.wallet);
  return { ok: true, data };
}

export async function completeServerFocusSession(sessionId) {
  if (!supabase.configured || !state.user?.id || !sessionId) {
    return { ok: false, localOnly: true };
  }
  const idempotencyKey = `focus_${sessionId}`;
  const { data, error } = await supabase.rpc("complete_focus_session", {
    p_session_id: sessionId,
    p_idempotency_key: idempotencyKey
  });
  if (error) return { ok: false, error: error.message };
  if (typeof data?.balance === "number") {
    state.wallet = { ...state.wallet, balance: data.balance };
    bus.emit("economy:updated", state.wallet);
  }
  return { ok: true, data };
}
