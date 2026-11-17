import type { CampaignType } from "./campaign-model";

const common = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function TypeIcon({ type }: { type: CampaignType }) {
  if (type === "MULTIPLIER") {
    // iki üst üste damga
    return (
      <svg {...common}>
        <circle cx="9" cy="12" r="5" />
        <path d="M14.5 7.5a5 5 0 1 1 0 9" />
      </svg>
    );
  }
  if (type === "WIN_BACK") {
    // geri dönüş oku
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    );
  }
  // zil
  return (
    <svg {...common}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg {...common} width={16} height={16}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...common} width={15} height={15}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...common} width={15} height={15}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
