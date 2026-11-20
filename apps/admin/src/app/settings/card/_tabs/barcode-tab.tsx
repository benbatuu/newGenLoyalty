"use client";

import { Panel, PanelHeader } from "../../../../components/ui";
import { BarcodeTypePicker } from "../../../reward/program-wallet-panel";
import type { BarcodeFormat } from "./types";

/** Kart ayarları: kasada okutulacak kod türü (tüm kartlar için) */
export function BarcodeTab({
  barcodeFormat,
  setBarcodeFormat,
}: {
  barcodeFormat: BarcodeFormat;
  setBarcodeFormat: (v: BarcodeFormat) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        step={5}
        title="Barkod"
        description="Müşterinin telefonundaki kartın altında görünen ve kasiyerin okuttuğu kod türü. Seçim önizlemeye hemen yansır."
      />
      <BarcodeTypePicker value={barcodeFormat} onChange={setBarcodeFormat} />
    </Panel>
  );
}
