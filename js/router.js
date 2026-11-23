// Hash-based router for GitHub Pages subpath safety & browser back/forward support
import { bus } from "./core/event-bus.js";

const VALID_ROUTES = new Set([
  "room",
  "focus",
  "register",
  "calendar",
  "tasks",
  "diary",
  "audio",
  "shop",
  "customization",
  "environment",
  "profile",
  "friends",
  "community",
  "library",
  "cabinet",
  "achievements",
  "ops"
]);

export function parseHashRoute(hashStr = window.location.hash) {
  const cleaned = String(hashStr || "").replace(/^#\/?/, "").trim();
  if (!cleaned) return { feature: "room", param: null };
  const [feature, ...rest] = cleaned.split("/");
  if (!VALID_ROUTES.has(feature)) return { feature: "room", param: null };
  return { feature, param: rest.join("/") || null };
}

let pendingProgrammaticHash = null;

export function navigateToFeature(feature, param = null, { emit = false } = {}) {
  const nextHash = feature === "room" || !feature
    ? "#/"
    : param
      ? `#/${feature}/${encodeURIComponent(param)}`
      : `#/${feature}`;

  if (window.location.hash !== nextHash) {
    pendingProgrammaticHash = nextHash;
    window.location.hash = nextHash;
  } else if (emit) {
    bus.emit("route:changed", parseHashRoute(nextHash));
  }
}

export function initRouter() {
  const handleHashChange = () => {
    const current = window.location.hash || "#/";
    if (pendingProgrammaticHash !== null && current === pendingProgrammaticHash) {
      pendingProgrammaticHash = null;
      return;
    }
    pendingProgrammaticHash = null;
    bus.emit("route:changed", parseHashRoute(current));
  };
  window.addEventListener("hashchange", handleHashChange);
  return () => window.removeEventListener("hashchange", handleHashChange);
}
