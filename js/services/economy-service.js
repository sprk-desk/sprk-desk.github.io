// Server-Authoritative Study Credit Economy & Desk Shop Catalog
import { supabase } from "./supabase.js";
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { generateId } from "../utils/dom.js";

import { SHOP_CATALOG } from "../utils/shop-catalog.js";

export { SHOP_CATALOG };

export async function purchaseShopItem(itemId) {
  if (!supabase.configured || !state.user?.id) {
    return {
      ok: false,
      error: "Sign in with a configured Supabase account to mint and spend server-verified Study Credits."
    };
  }
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  const idempotencyKey = generateId("buy");
  const { data, error } = await supabase.rpc("purchase_catalog_item", {
    p_item_id: itemId,
    p_idempotency_key: idempotencyKey,
    p_price: item?.price || 0
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
