import type { BarcodeFormat } from "./types";

export function BarcodePreview({ format }: { format: BarcodeFormat }) {
  if (format === "PDF417") {
    return (
      <div className="flex h-10 w-40 flex-col justify-center gap-0.5 rounded bg-white px-2 py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[2px] bg-black"
            style={{ width: `${70 + ((i * 17) % 30)}%` }}
          />
        ))}
      </div>
    );
  }
  if (format === "CODE128") {
    return (
      <div className="flex h-12 w-44 items-end justify-center gap-px rounded bg-white px-2 py-1">
        {Array.from({ length: 36 }).map((_, i) => (
          <div
            key={i}
            className="bg-black"
            style={{
              width: i % 3 === 0 ? 2 : 1,
              height: `${60 + ((i * 13) % 40)}%`,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid h-16 w-16 grid-cols-5 gap-0.5 rounded bg-white p-1">
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className={
            [0, 1, 2, 4, 5, 6, 10, 14, 18, 20, 21, 22, 24].includes(i)
              ? "bg-black"
              : "bg-white"
          }
        />
      ))}
    </div>
  );
}
