import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicMenuCacheKey } from "./public-menu-cache";

describe("publicMenuCacheKey", () => {
  it("separates slug, table, and branch", () => {
    assert.equal(publicMenuCacheKey({ slug: "cafe" }), "cafe||");
    assert.equal(
      publicMenuCacheKey({ slug: "cafe", branchId: "b1" }),
      "cafe||b1",
    );
    assert.equal(
      publicMenuCacheKey({ slug: "cafe", qrCode: "t1" }),
      "cafe|t1|",
    );
  });
});
