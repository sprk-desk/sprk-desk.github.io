// Pure page route parsing & canonical URL helpers for Multi-Mode SPRK Desk
// Supports /, /cozy-study, /deep-focus, and /account (plus GitHub Pages fallback restore)

export const PAGE_ROUTES = Object.freeze({
  HOME: "home",
  COZY: "cozy",
  DEEPFOCUS: "deepfocus",
  ACCOUNT: "account"
});

const PATH_TO_PAGE = new Map([
  ["/", PAGE_ROUTES.HOME],
  ["", PAGE_ROUTES.HOME],
  ["/index.html", PAGE_ROUTES.HOME],
  ["/cozy-study", PAGE_ROUTES.COZY],
  ["/deep-focus", PAGE_ROUTES.DEEPFOCUS],
  ["/account", PAGE_ROUTES.ACCOUNT]
]);

const PAGE_TO_PATH = Object.freeze({
  [PAGE_ROUTES.HOME]: "/",
  [PAGE_ROUTES.COZY]: "/cozy-study",
  [PAGE_ROUTES.DEEPFOCUS]: "/deep-focus",
  [PAGE_ROUTES.ACCOUNT]: "/account"
});

export function normalizePathname(pathname = "/") {
  const raw = String(pathname || "/").split("?")[0].split("#")[0].trim();
  if (!raw || raw === "/") return "/";
  const collapsed = raw.replace(/\/+/g, "/");
  return collapsed.length > 1 && collapsed.endsWith("/")
    ? collapsed.slice(0, -1)
    : collapsed;
}

export function parsePageRoute(pathname = "/", search = "") {
  const cleanPath = normalizePathname(pathname);

  // Explicit query ?mode= or ?page= override (useful on / fallback)
  try {
    const params = new URLSearchParams(String(search || ""));
    const paramPage = (params.get("page") || params.get("mode") || "").toLowerCase();
    if (paramPage === "cozy" || paramPage === "cozy-study") {
      return { page: PAGE_ROUTES.COZY, path: PAGE_TO_PATH[PAGE_ROUTES.COZY] };
    }
    if (paramPage === "deepfocus" || paramPage === "deep-focus") {
      return { page: PAGE_ROUTES.DEEPFOCUS, path: PAGE_TO_PATH[PAGE_ROUTES.DEEPFOCUS] };
    }
    if (paramPage === "account" || paramPage === "friends" || paramPage === "profile") {
      return { page: PAGE_ROUTES.ACCOUNT, path: PAGE_TO_PATH[PAGE_ROUTES.ACCOUNT] };
    }
  } catch {
    // ignore malformed search string
  }

  if (PATH_TO_PAGE.has(cleanPath)) {
    const page = PATH_TO_PAGE.get(cleanPath);
    return { page, path: PAGE_TO_PATH[page] };
  }

  // Handle subpath deployments (e.g. /repo/deep-focus) by matching final segment
  const segs = cleanPath.split("/").filter(Boolean);
  const last = segs[segs.length - 1] || "";
  if (last === "cozy-study") return { page: PAGE_ROUTES.COZY, path: PAGE_TO_PATH[PAGE_ROUTES.COZY] };
  if (last === "deep-focus") return { page: PAGE_ROUTES.DEEPFOCUS, path: PAGE_TO_PATH[PAGE_ROUTES.DEEPFOCUS] };
  if (last === "account") return { page: PAGE_ROUTES.ACCOUNT, path: PAGE_TO_PATH[PAGE_ROUTES.ACCOUNT] };

  return { page: PAGE_ROUTES.HOME, path: PAGE_TO_PATH[PAGE_ROUTES.HOME] };
}

export function getPagePath(page) {
  return PAGE_TO_PATH[page] || "/";
}

export function getAppModeForPage(page, fallbackMode = "cozy") {
  if (page === PAGE_ROUTES.DEEPFOCUS) return "deepfocus";
  if (page === PAGE_ROUTES.COZY) return "cozy";
  return fallbackMode === "deepfocus" ? "deepfocus" : "cozy";
}

export const WORKSPACE_VISIT_STORAGE_KEY = "sprk_workspace_visits_v1";

export function parseWorkspaceVisits(raw = null) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  const cozy = Math.max(0, Math.floor(Number(obj?.cozy) || 0));
  const deepfocus = Math.max(0, Math.floor(Number(obj?.deepfocus) || 0));
  const lastVisited = obj?.lastVisited === "deepfocus" || obj?.lastVisited === "cozy"
    ? obj.lastVisited
    : null;
  return { cozy, deepfocus, lastVisited };
}

export function incrementWorkspaceVisit(rawStats, mode) {
  const stats = parseWorkspaceVisits(rawStats);
  if (mode !== "cozy" && mode !== "deepfocus") return stats;
  return {
    cozy: stats.cozy + (mode === "cozy" ? 1 : 0),
    deepfocus: stats.deepfocus + (mode === "deepfocus" ? 1 : 0),
    lastVisited: mode
  };
}

export function resolveMostVisitedWorkspace(rawStats, fallbackMode = "cozy") {
  const stats = parseWorkspaceVisits(rawStats);
  if (stats.deepfocus > stats.cozy) return "deepfocus";
  if (stats.cozy > stats.deepfocus) return "cozy";
  if (stats.lastVisited === "deepfocus" || stats.lastVisited === "cozy") {
    return stats.lastVisited;
  }
  return fallbackMode === "deepfocus" ? "deepfocus" : "cozy";
}

export function shouldAutoRedirectHomeToWorkspace({
  isLoggedIn = false,
  currentPage = PAGE_ROUTES.HOME,
  search = "",
  explicitHomeStay = false
} = {}) {
  if (!isLoggedIn) return false;
  if (currentPage !== PAGE_ROUTES.HOME) return false;
  if (explicitHomeStay) return false;
  try {
    const params = new URLSearchParams(String(search || ""));
    const paramPage = (params.get("page") || params.get("mode") || "").toLowerCase();
    const stay = (params.get("stay") || params.get("landing") || "").toLowerCase();
    if (paramPage === "home" || stay === "1" || stay === "true" || stay === "home") {
      return false;
    }
  } catch {
    // ignore malformed search string
  }
  return true;
}
