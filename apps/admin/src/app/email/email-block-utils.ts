import {
  cryptoRandomId,
  type EmailBlock,
  type EmailDocument,
  type EmailTheme,
  DEFAULT_EMAIL_THEME,
} from "@ngl/shared";

export const BLOCK_CATALOG: {
  type: EmailBlock["type"];
  label: string;
  hint: string;
}[] = [
  { type: "heading", label: "Başlık", hint: "Ana veya alt başlık" },
  { type: "paragraph", label: "Metin", hint: "Paragraf ve duyuru" },
  { type: "button", label: "Buton", hint: "Harekete geçirici link" },
  { type: "image", label: "Görsel / GIF", hint: "Banner veya ürün fotoğrafı" },
  { type: "highlight", label: "Vurgu kutusu", hint: "Önemli mesaj alanı" },
  { type: "list", label: "Madde listesi", hint: "Özellik veya fayda listesi" },
  { type: "columns", label: "İki sütun", hint: "Yan yana metin" },
  { type: "coupon", label: "Kupon kodu", hint: "Promosyon kodu alanı" },
  { type: "social", label: "Sosyal linkler", hint: "Instagram, web sitesi vb." },
  { type: "footer", label: "Alt bilgi", hint: "İletişim ve yasal metin" },
  { type: "divider", label: "Ayırıcı", hint: "İnce çizgi" },
  { type: "spacer", label: "Boşluk", hint: "Dikey boşluk" },
  { type: "quote", label: "Alıntı", hint: "Müşteri yorumu, söz" },
  { type: "product", label: "Ürün kartı", hint: "Fotoğraf, fiyat ve buton" },
  { type: "video", label: "Video", hint: "Kapak görseli ve link" },
  { type: "html", label: "HTML kodu", hint: "Hazır kodu yapıştırın" },
];

export function createBlock(type: EmailBlock["type"]): EmailBlock {
  switch (type) {
    case "quote":
      return {
        id: cryptoRandomId(),
        type: "quote",
        text: "Harika bir deneyimdi, herkese tavsiye ederim.",
        author: "Müşterimiz",
      };
    case "product":
      return {
        id: cryptoRandomId(),
        type: "product",
        imageUrl: "",
        title: "Ürün adı",
        description: "Kısa ürün açıklaması",
        price: "",
        buttonLabel: "İncele",
        url: "",
      };
    case "video":
      return {
        id: cryptoRandomId(),
        type: "video",
        thumbnailUrl: "",
        videoUrl: "",
        caption: "Videoyu izleyin",
      };
    case "html":
      return {
        id: cryptoRandomId(),
        type: "html",
        html: "<p style=\"font-family:Arial,sans-serif;font-size:16px;color:#333\">HTML kodunuzu buraya yapıştırın</p>",
      };
    case "heading":
      return { id: cryptoRandomId(), type: "heading", text: "Yeni başlık", level: 2 };
    case "paragraph":
      return { id: cryptoRandomId(), type: "paragraph", text: "Metninizi buraya yazın…" };
    case "button":
      return { id: cryptoRandomId(), type: "button", label: "Hemen keşfet", url: "" };
    case "image":
      return {
        id: cryptoRandomId(),
        type: "image",
        url: "",
        alt: "Görsel",
        align: "center",
      };
    case "highlight":
      return {
        id: cryptoRandomId(),
        type: "highlight",
        text: "Önemli duyuru veya kampanya detayı",
        variant: "brand",
      };
    case "list":
      return {
        id: cryptoRandomId(),
        type: "list",
        items: ["İlk madde", "İkinci madde", "Üçüncü madde"],
      };
    case "columns":
      return {
        id: cryptoRandomId(),
        type: "columns",
        left: "Sol sütun metni",
        right: "Sağ sütun metni",
      };
    case "coupon":
      return {
        id: cryptoRandomId(),
        type: "coupon",
        code: "SADAKAT15",
        hint: "Kasada bu kodu kullanın",
      };
    case "social":
      return {
        id: cryptoRandomId(),
        type: "social",
        links: [
          { label: "Instagram", url: "" },
          { label: "Web sitesi", url: "" },
        ],
      };
    case "footer":
      return {
        id: cryptoRandomId(),
        type: "footer",
        text: '{businessName} · Bu e-postayı sadakat üyelerimize gönderiyoruz.',
      };
    case "divider":
      return { id: cryptoRandomId(), type: "divider" };
    case "spacer":
      return { id: cryptoRandomId(), type: "spacer", size: "md" };
  }
}

export function mergeTheme(doc: EmailDocument): Required<
  Pick<
    EmailTheme,
    | "primaryColor"
    | "backgroundColor"
    | "cardBackground"
    | "textColor"
    | "headingColor"
  >
> & { logoUrl?: string } {
  return { ...DEFAULT_EMAIL_THEME, ...doc.theme };
}

export function insertBlockAfter(
  doc: EmailDocument,
  afterId: string | null,
  block: EmailBlock,
): EmailDocument {
  if (!afterId) {
    return { ...doc, blocks: [...doc.blocks, block] };
  }
  const idx = doc.blocks.findIndex((b) => b.id === afterId);
  if (idx < 0) {
    return { ...doc, blocks: [...doc.blocks, block] };
  }
  const blocks = [...doc.blocks];
  blocks.splice(idx + 1, 0, block);
  return { ...doc, blocks };
}

export function moveBlockInDocument(
  doc: EmailDocument,
  id: string,
  dir: -1 | 1,
): EmailDocument {
  const idx = doc.blocks.findIndex((b) => b.id === id);
  const next = idx + dir;
  if (idx < 0 || next < 0 || next >= doc.blocks.length) return doc;
  const blocks = [...doc.blocks];
  const [item] = blocks.splice(idx, 1);
  blocks.splice(next, 0, item);
  return { ...doc, blocks };
}

export function updateBlockInDocument(
  doc: EmailDocument,
  id: string,
  patch: Partial<EmailBlock>,
): EmailDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((b) =>
      b.id === id ? ({ ...b, ...patch } as EmailBlock) : b,
    ),
  };
}

export function removeBlockFromDocument(
  doc: EmailDocument,
  id: string,
): EmailDocument {
  return { ...doc, blocks: doc.blocks.filter((b) => b.id !== id) };
}

/** Seçili bloğun metin alanına birleştirme etiketi ekler */
export function insertMergeTokenIntoBlock(
  block: EmailBlock,
  token: string,
): EmailBlock {
  const append = (text: string) => (text ? `${text} ${token}` : token);
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'footer':
    case 'highlight':
      return { ...block, text: append(block.text) };
    case 'button':
      return { ...block, label: append(block.label) };
    case 'list':
      return {
        ...block,
        items: block.items.length
          ? block.items.map((item, i) =>
              i === 0 ? append(item) : item,
            )
          : [token],
      };
    case 'columns':
      return { ...block, left: append(block.left) };
    case 'coupon':
      return { ...block, hint: append(block.hint) };
    case 'social':
      return {
        ...block,
        links: block.links.map((l, i) =>
          i === 0 ? { ...l, label: append(l.label) } : l,
        ),
      };
    default:
      return block;
  }
}
