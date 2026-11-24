import test from "node:test";
import assert from "node:assert/strict";
import {
  PAGE_ROUTES,
  normalizePathname,
  parsePageRoute,
  getPagePath,
  getAppModeForPage
} from "./page-routes.js";

test("normalizePathname strips trailing slashes on non-root paths", () => {
  assert.equal(normalizePathname("/"), "/");
  assert.equal(normalizePathname("/cozy-study/"), "/cozy-study");
  assert.equal(normalizePathname("/deep-focus///"), "/deep-focus");
  assert.equal(normalizePathname("/account?tab=friends#x"), "/account");
});

test("parsePageRoute resolves root, cozy-study, deep-focus, and account routes", () => {
  assert.deepEqual(parsePageRoute("/"), { page: PAGE_ROUTES.HOME, path: "/" });
  assert.deepEqual(parsePageRoute("/cozy-study"), { page: PAGE_ROUTES.COZY, path: "/cozy-study" });
  assert.deepEqual(parsePageRoute("/cozy-study/"), { page: PAGE_ROUTES.COZY, path: "/cozy-study" });
  assert.deepEqual(parsePageRoute("/deep-focus"), { page: PAGE_ROUTES.DEEPFOCUS, path: "/deep-focus" });
  assert.deepEqual(parsePageRoute("/account"), { page: PAGE_ROUTES.ACCOUNT, path: "/account" });
  assert.deepEqual(parsePageRoute("/sprk-desk/deep-focus"), { page: PAGE_ROUTES.DEEPFOCUS, path: "/deep-focus" });
  assert.deepEqual(parsePageRoute("/", "?page=account"), { page: PAGE_ROUTES.ACCOUNT, path: "/account" });
  assert.deepEqual(parsePageRoute("/unknown-page"), { page: PAGE_ROUTES.HOME, path: "/" });
});

test("getPagePath and getAppModeForPage map page routes cleanly", () => {
  assert.equal(getPagePath(PAGE_ROUTES.HOME), "/");
  assert.equal(getPagePath(PAGE_ROUTES.COZY), "/cozy-study");
  assert.equal(getPagePath(PAGE_ROUTES.DEEPFOCUS), "/deep-focus");
  assert.equal(getPagePath(PAGE_ROUTES.ACCOUNT), "/account");
  assert.equal(getAppModeForPage(PAGE_ROUTES.DEEPFOCUS, "cozy"), "deepfocus");
  assert.equal(getAppModeForPage(PAGE_ROUTES.COZY, "deepfocus"), "cozy");
  assert.equal(getAppModeForPage(PAGE_ROUTES.ACCOUNT, "deepfocus"), "deepfocus");
});
