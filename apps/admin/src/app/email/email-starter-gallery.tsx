"use client";

import { useMemo, useState } from "react";
import {
  EMAIL_SECTORS,
  getEmailStarter,
  renderEmailHtml,
  type EmailSectorId,
} from "@ngl/shared";
import { btnGhost, btnPrimary } from "../../components/ui";

export type EmailStarterSummary = {
  id: string;
  sectorId: EmailSectorId;
  sectorLabel: string;
  name: string;
  subject: string;
  description: string;
};

type EmailStarterGalleryProps = {
  starters: EmailStarterSummary[];
  busy?: boolean;
  onPick: (starterId: string) => void;
};

function StarterPreview({ starterId }: { starterId: string }) {
  const starter = getEmailStarter(starterId);
  if (!starter) return null;
  const html = renderEmailHtml(starter.document, { preview: true });
  return (
    <div
      className="pointer-events-none mt-3 overflow-hidden rounded-md border border-[var(--line)] bg-[#f7f6f3]"
      style={{ height: 140 }}
    >
      <iframe
        title=""
        srcDoc={html}
        className="h-[280px] w-[200%] origin-top-left scale-50 border-0"
        sandbox=""
        tabIndex={-1}
      />
    </div>
  );
}

export function EmailStarterGallery({
  starters,
  busy,
  onPick,
}: EmailStarterGalleryProps) {
  const [sector, setSector] = useState<EmailSectorId>("kafe");

  const filtered = useMemo(
    () => starters.filter((s) => s.sectorId === sector),
    [starters, sector],
  );

  if (!starters.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EMAIL_SECTORS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={
              sector === s.id
                ? btnPrimary()
                : `${btnGhost()} border border-[var(--line)] bg-[var(--panel)]`
            }
            disabled={busy}
            onClick={() => setSector(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((starter) => (
          <article
            key={starter.id}
            className="flex flex-col rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              {starter.sectorLabel}
            </p>
            <h3 className="mt-1 font-medium text-[var(--ink)]">{starter.name}</h3>
            <p className="mt-1 flex-1 text-sm text-[var(--muted)]">
              {starter.description}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Konu: {starter.subject}
            </p>
            <StarterPreview starterId={starter.id} />
            <button
              type="button"
              className={`${btnPrimary()} mt-4 w-full`}
              disabled={busy}
              onClick={() => onPick(starter.id)}
            >
              Bu şablonu kullan
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
