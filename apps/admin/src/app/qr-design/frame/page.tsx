"use client";

import { useEffect, useState } from "react";
import { MenuThemeView } from "../../../components/menu-themes/resolve-theme-view";
import type { PublicMenuPayload } from "../../../components/menu-themes/menu-theme-types";

type Incoming = {
  type: "ngl-preview";
  menu?: PublicMenuPayload | null;
  selectedId?: string | null;
  productDetail?: boolean;
  explore?: boolean;
};

/**
 * Canlı önizleme çerçevesi. Ebeveyn sayfa menüyü postMessage ile gönderir.
 * Çerçeve kendi viewport'unda çalıştığı için medya ve kapsayıcı sorguları gerçek cihaz gibi davranır.
 */
export default function QrPreviewFrame() {
  const [menu, setMenu] = useState<PublicMenuPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState(false);
  const [explore, setExplore] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const d = e.data as Incoming;
      if (!d || d.type !== "ngl-preview") return;
      if (d.menu !== undefined) setMenu(d.menu);
      if (d.selectedId !== undefined) setSelectedId(d.selectedId);
      if (d.productDetail !== undefined) setProductDetail(Boolean(d.productDetail));
      if (d.explore !== undefined) setExplore(Boolean(d.explore));
    }
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: "ngl-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%", overflow: "hidden" }}>
      {menu ? (
        <MenuThemeView
          menu={menu}
          compact
          selectedBlockId={selectedId}
          onSelectBlock={(id) => window.parent?.postMessage({ type: "ngl-preview-select", id }, window.location.origin)}
          previewProductDetail={productDetail}
          previewExplore={explore}
        />
      ) : null}
    </div>
  );
}
