import type { ReactNode } from "react";

/** Ayarlar alt sayfalarında yalnızca aksiyon butonları (başlık/açıklama yok) */
export function SettingsSectionHeader({
  actions,
}: {
  title?: string;
  subtitle?: string;
  help?: string;
  actions?: ReactNode;
}) {
  if (!actions) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
      {actions}
    </div>
  );
}
