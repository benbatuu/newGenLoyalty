import {
  createEmptyEmailDocument,
  emailDocumentFromMarkdown,
  isEmailDocument,
  normalizeEmailDocument,
  type EmailDocument,
} from "@ngl/shared";

export function parseTemplateDocument(
  raw: unknown,
  bodyMd?: string,
): EmailDocument {
  if (isEmailDocument(raw)) return normalizeEmailDocument(raw);
  if (bodyMd?.trim()) return emailDocumentFromMarkdown(bodyMd);
  return createEmptyEmailDocument();
}

export function btnSecondary() {
  return "inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--surface)]";
}
