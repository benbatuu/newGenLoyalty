import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllowedBackendProxy,
  PROXY_MAX_BODY_BYTES,
  browserCacheControlForProxyPath,
} from "./backend-proxy-allowlist";

describe("isAllowedBackendProxy", () => {
  it("allows marketing public endpoints", () => {
    assert.equal(isAllowedBackendProxy("POST", ["public", "contact"]), true);
    assert.equal(isAllowedBackendProxy("POST", ["public", "signup"]), true);
    assert.equal(isAllowedBackendProxy("GET", ["public", "plans"]), true);
    assert.equal(isAllowedBackendProxy("POST", ["public", "portal"]), true);
    assert.equal(
      isAllowedBackendProxy("POST", ["public", "social", "claim"]),
      true,
    );
  });

  it("rejects portal GET (phone must not travel in query via proxy)", () => {
    assert.equal(isAllowedBackendProxy("GET", ["public", "portal"]), false);
  });

  it("rejects wrong methods and private paths", () => {
    assert.equal(isAllowedBackendProxy("DELETE", ["public", "contact"]), false);
    assert.equal(isAllowedBackendProxy("PUT", ["public", "plans"]), false);
    assert.equal(isAllowedBackendProxy("GET", ["public", "leads"]), false);
    assert.equal(isAllowedBackendProxy("POST", ["auth", "login"]), false);
    assert.equal(isAllowedBackendProxy("GET", ["tenants"]), false);
  });

  it("allows public menu media and tenant logos", () => {
    assert.equal(
      isAllowedBackendProxy("GET", [
        "uploads",
        "tenants",
        "abc",
        "logo.png",
      ]),
      true,
    );
    assert.equal(
      isAllowedBackendProxy("GET", ["media", "menu", "abc", "photo.jpg"]),
      true,
    );
    assert.equal(
      isAllowedBackendProxy("GET", ["uploads", "other", "file.png"]),
      false,
    );
  });

  it("rejects path traversal", () => {
    assert.equal(isAllowedBackendProxy("GET", ["..", "public", "plans"]), false);
    assert.equal(isAllowedBackendProxy("POST", ["public", "..", "contact"]), false);
    assert.equal(isAllowedBackendProxy("GET", [""]), false);
  });

  it("exposes a sane body size limit", () => {
    assert.equal(PROXY_MAX_BODY_BYTES, 256 * 1024);
  });

  it("does not cache public menu json in the browser", () => {
    assert.equal(
      browserCacheControlForProxyPath("public/menu/cafe"),
      "no-store",
    );
    assert.match(
      browserCacheControlForProxyPath("media/menu/x/a.jpg") ?? "",
      /max-age=86400/,
    );
    assert.equal(browserCacheControlForProxyPath("public/contact"), null);
  });
});
