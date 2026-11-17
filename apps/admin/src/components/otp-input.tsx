"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/** 6 haneli tek kullanımlık kod girişi. Yapıştırma ve otomatik ilerleme destekler. */
export function OtpInput({
  value,
  onChange,
  disabled,
  length = 6,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setAt(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").replace(/\s/g, ""));
  }

  function onKey(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Doğrulama kodu">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, char);
            if (char && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          aria-label={`Kod ${i + 1}. hane`}
          className="h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] text-center font-mono text-xl text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-60"
        />
      ))}
    </div>
  );
}
