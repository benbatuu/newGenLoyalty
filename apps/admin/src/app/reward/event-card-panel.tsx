"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  inputClassName,
} from "../../components/ui";

export type EventCardDraft = {
  eventName: string;
  validFrom: string;
  validUntil: string;
  venueName: string;
  venueAddress: string;
  entryLimit: number;
  checkInMode: "CASHIER_SCAN" | "SELF_QR";
  autoDeactivateAfterEvent: boolean;
};

type EventProgram = {
  config: Partial<EventCardDraft> & {
    venue?: { name?: string; address?: string };
  };
  validFrom?: string | null;
  validUntil?: string | null;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(raw: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function defaultEventCardDraft(): EventCardDraft {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    eventName: "Etkinlik",
    validFrom: toLocalInput(now.toISOString()),
    validUntil: toLocalInput(week.toISOString()),
    venueName: "",
    venueAddress: "",
    entryLimit: 1,
    checkInMode: "CASHIER_SCAN",
    autoDeactivateAfterEvent: true,
  };
}

export function draftFromEventProgram(program: EventProgram): EventCardDraft {
  const c = program.config ?? {};
  const base = defaultEventCardDraft();
  return {
    eventName: c.eventName ?? base.eventName,
    validFrom: toLocalInput(
      program.validFrom ?? c.validFrom ?? fromLocalInput(base.validFrom),
    ),
    validUntil: toLocalInput(
      program.validUntil ?? c.validUntil ?? fromLocalInput(base.validUntil),
    ),
    venueName: c.venue?.name ?? c.venueName ?? "",
    venueAddress: c.venue?.address ?? c.venueAddress ?? "",
    entryLimit: c.entryLimit ?? base.entryLimit,
    checkInMode: c.checkInMode ?? base.checkInMode,
    autoDeactivateAfterEvent:
      c.autoDeactivateAfterEvent ?? base.autoDeactivateAfterEvent,
  };
}

export function eventCardConfigPayload(draft: EventCardDraft) {
  return {
    eventName: draft.eventName.trim() || "Etkinlik",
    validFrom: fromLocalInput(draft.validFrom),
    validUntil: fromLocalInput(draft.validUntil),
    venue: {
      name: draft.venueName.trim() || undefined,
      address: draft.venueAddress.trim() || undefined,
    },
    entryLimit: draft.entryLimit,
    collectFields: ["name"] as const,
    checkInMode: draft.checkInMode,
    autoDeactivateAfterEvent: draft.autoDeactivateAfterEvent,
    reminderPush: [],
  };
}

export function EventCardPanel({
  draft,
  onChange,
}: {
  draft: EventCardDraft;
  onChange: (next: EventCardDraft) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Etkinlik ayarları"
        description="Etkinliğin adı, tarihi, yeri ve kaç kişi girebileceği. Bu bilgiler müşterinin kartında görünür."
      />
      <div className="space-y-4">
        <Field label="Etkinlik adı">
          <input
            className={inputClassName()}
            value={draft.eventName}
            onChange={(e) => onChange({ ...draft, eventName: e.target.value })}
            placeholder="Örn. Kahve tadım günü"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Başlangıç">
            <input
              className={inputClassName()}
              type="datetime-local"
              value={draft.validFrom}
              onChange={(e) => onChange({ ...draft, validFrom: e.target.value })}
            />
          </Field>
          <Field label="Bitiş">
            <input
              className={inputClassName()}
              type="datetime-local"
              value={draft.validUntil}
              onChange={(e) => onChange({ ...draft, validUntil: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Yer adı">
          <input
            className={inputClassName()}
            value={draft.venueName}
            onChange={(e) => onChange({ ...draft, venueName: e.target.value })}
            placeholder="Kafe adı veya salon"
          />
        </Field>

        <Field label="Adres">
          <input
            className={inputClassName()}
            value={draft.venueAddress}
            onChange={(e) =>
              onChange({ ...draft, venueAddress: e.target.value })
            }
            placeholder="Açık adres"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kaç kişilik giriş hakkı?">
            <input
              className={inputClassName()}
              type="number"
              min={1}
              value={draft.entryLimit}
              onChange={(e) =>
                onChange({
                  ...draft,
                  entryLimit: Number(e.target.value) || 1,
                })
              }
            />
          </Field>
          <Field label="Girişte kasa nasıl çalışsın?">
            <select
              className={inputClassName()}
              value={draft.checkInMode}
              onChange={(e) =>
                onChange({
                  ...draft,
                  checkInMode: e.target
                    .value as EventCardDraft["checkInMode"],
                })
              }
            >
              <option value="CASHIER_SCAN">Kasiyer okutur</option>
              <option value="SELF_QR">Müşteri QR gösterir</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={draft.autoDeactivateAfterEvent}
            onChange={(e) =>
              onChange({
                ...draft,
                autoDeactivateAfterEvent: e.target.checked,
              })
            }
          />
          Etkinlik bitince kartı otomatik kapat
        </label>

        <SoftBox className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Önizleme
          </p>
          <p className="mt-2 font-medium">{draft.eventName || "Etkinlik"}</p>
          <p className="mt-1 text-[var(--muted)]">
            {draft.entryLimit} giriş ·{" "}
            {draft.checkInMode === "CASHIER_SCAN"
              ? "Kasiyer check-in"
              : "Self QR"}
          </p>
        </SoftBox>
      </div>
    </Panel>
  );
}
