import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value, path);
    }
    return [path];
  });
}

describe("i18n message key parity", () => {
  it("en.json and tr.json share the same key set", () => {
    const en = JSON.parse(
      readFileSync(join(root, "messages/en.json"), "utf8"),
    );
    const tr = JSON.parse(
      readFileSync(join(root, "messages/tr.json"), "utf8"),
    );

    const enKeys = new Set(flattenKeys(en));
    const trKeys = new Set(flattenKeys(tr));
    const missingInTr = [...enKeys].filter((k) => !trKeys.has(k));
    const missingInEn = [...trKeys].filter((k) => !enKeys.has(k));

    assert.deepEqual(missingInTr, [], `missing in tr: ${missingInTr.join(", ")}`);
    assert.deepEqual(missingInEn, [], `missing in en: ${missingInEn.join(", ")}`);
  });

  it("contactPage exposes localized sector options", () => {
    const en = JSON.parse(
      readFileSync(join(root, "messages/en.json"), "utf8"),
    );
    assert.ok(en.contactPage.sectors.cafe);
    assert.ok(en.contactPage.sectors.other);
  });
});
