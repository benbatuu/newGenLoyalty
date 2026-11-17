import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HONEYPOT_FIELD, honeypotFilled } from "./honeypot";

/**
 * Mirrors ContactForm suggestion payload shaping (no React).
 */
function buildContactPayload(
  raw: Record<string, string>,
  opts: { source: string; variant: "default" | "suggestion"; locale: string },
) {
  const isSuggestion = opts.variant === "suggestion";
  return {
    name: String(raw.name ?? ""),
    cafe: isSuggestion
      ? opts.locale === "tr"
        ? "Program önerisi"
        : "Program suggestion"
      : String(raw.cafe ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? "") || undefined,
    sector: isSuggestion ? undefined : String(raw.sector ?? "") || undefined,
    message: String(raw.message ?? ""),
    source: opts.source,
    [HONEYPOT_FIELD]: String(raw[HONEYPOT_FIELD] ?? ""),
  };
}

function signupShouldShowSuccess(body: {
  discarded?: boolean;
  tenant?: { id?: string };
}): boolean {
  if (body.discarded) return false;
  if (!body.tenant?.id || body.tenant.id === "ok") return false;
  return true;
}

describe("contact suggestion payload", () => {
  it("fills cafe placeholder and omits sector", () => {
    const payload = buildContactPayload(
      {
        name: "Ada",
        email: "ada@example.com",
        message: "Hybrid stamp + cashback",
        [HONEYPOT_FIELD]: "",
      },
      { source: "program-suggestion", variant: "suggestion", locale: "en" },
    );
    assert.equal(payload.source, "program-suggestion");
    assert.equal(payload.cafe, "Program suggestion");
    assert.equal(payload.sector, undefined);
    assert.equal(payload[HONEYPOT_FIELD], "");
  });

  it("keeps cafe/sector for default contact", () => {
    const payload = buildContactPayload(
      {
        name: "Ada",
        cafe: "Leaf",
        email: "ada@example.com",
        sector: "cafe",
        message: "Demo",
        [HONEYPOT_FIELD]: "",
      },
      { source: "contact", variant: "default", locale: "tr" },
    );
    assert.equal(payload.cafe, "Leaf");
    assert.equal(payload.sector, "cafe");
  });
});

describe("honeypot", () => {
  it("uses an obscure field name", () => {
    assert.equal(HONEYPOT_FIELD, "fax_number");
    assert.notEqual(HONEYPOT_FIELD, "website");
  });

  it("detects filled values", () => {
    assert.equal(honeypotFilled(""), false);
    assert.equal(honeypotFilled("  "), false);
    assert.equal(honeypotFilled("http://spam.test"), true);
  });
});

describe("signup discarded guard", () => {
  it("rejects honeypot / fake tenant responses", () => {
    assert.equal(signupShouldShowSuccess({ discarded: true }), false);
    assert.equal(signupShouldShowSuccess({ tenant: { id: "ok" } }), false);
    assert.equal(signupShouldShowSuccess({ tenant: {} }), false);
    assert.equal(
      signupShouldShowSuccess({ tenant: { id: "clxyz123real" } }),
      true,
    );
  });
});
