// Multi-page path router (/, /cozy-study, /deep-focus, /account) + Hash sub-router for Cozy Study Room dialogs
import { bus } from "./core/event-bus.js";
import {
  PAGE_ROUTES,
  parsePageRoute,
  getPagePath,
  WORKSPACE_VISIT_STORAGE_KEY,
  parseWorkspaceVisits,
  incrementWorkspaceVisit,
  resolveMostVisitedWorkspace,
  shouldAutoRedirectHomeToWorkspace
} from "./utils/page-routes.js";

export { PAGE_ROUTES, getPagePath, shouldAutoRedirectHomeToWorkspace };

let explicitHomeStay = false;

export function isExplicitHomeStay() {
  return explicitHomeStay;
}

export function loadWorkspaceVisits() {
  try {
    return parseWorkspaceVisits(window.localStorage.getItem(WORKSPACE_VISIT_STORAGE_KEY));
  } catch {
    return parseWorkspaceVisits(null);
  }
}

export function recordWorkspaceVisit(mode) {
  if (mode !== "cozy" && mode !== "deepfocus") return loadWorkspaceVisits();
  const next = incrementWorkspaceVisit(loadWorkspaceVisits(), mode);
  try {
    window.localStorage.setItem(WORKSPACE_VISIT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}

export function getMostVisitedWorkspace(fallbackMode = "cozy") {
  return resolveMostVisitedWorkspace(loadWorkspaceVisits(), fallbackMode);
}

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
  "settings",
  "ops"
]);

export function parseCurrentPage() {
  return parsePageRoute(window.location.pathname, window.location.search);
}

export function navigateToPage(page, { replace = false, hash = "", emit = true, explicitHome } = {}) {
  if (page === PAGE_ROUTES.HOME) {
    explicitHomeStay = explicitHome !== false;
  } else {
    explicitHomeStay = false;
  }

  const targetPath = getPagePath(page);
  const nextUrl = `${targetPath}${hash || ""}`;
  const currentFull = `${window.location.pathname}${window.location.hash || ""}`;
  if (currentFull !== nextUrl) {
    if (replace) {
      window.history.replaceState({ page }, "", nextUrl);
    } else {
      window.history.pushState({ page }, "", nextUrl);
    }
  }
  if (emit) {
    bus.emit("page:changed", { page, path: targetPath });
  }
}

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

  const handlePopState = () => {
    bus.emit("page:changed", parseCurrentPage());
  };

  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("popstate", handlePopState);
  return () => {
    window.removeEventListener("hashchange", handleHashChange);
    window.removeEventListener("popstate", handlePopState);
  };
}
