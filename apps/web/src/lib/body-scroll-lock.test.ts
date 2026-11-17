import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Mirrors reference-counted lock semantics without touching document.
 */
function createLockCounter() {
  let lockCount = 0;
  let previous = "";
  let current = "";

  return {
    lock() {
      if (lockCount === 0) {
        previous = current;
        current = "hidden";
      }
      lockCount += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
          current = previous;
          previous = "";
        }
      };
    },
    get overflow() {
      return current;
    },
    get count() {
      return lockCount;
    },
  };
}

describe("body scroll lock stack", () => {
  it("keeps overflow hidden until the last unlock", () => {
    const body = createLockCounter();
    body.overflow; // baseline ""
    const a = body.lock();
    const b = body.lock();
    assert.equal(body.overflow, "hidden");
    assert.equal(body.count, 2);
    a();
    assert.equal(body.overflow, "hidden");
    assert.equal(body.count, 1);
    b();
    assert.equal(body.overflow, "");
    assert.equal(body.count, 0);
  });

  it("is idempotent per unlock handle", () => {
    const body = createLockCounter();
    const unlock = body.lock();
    unlock();
    unlock();
    assert.equal(body.count, 0);
    assert.equal(body.overflow, "");
  });
});
