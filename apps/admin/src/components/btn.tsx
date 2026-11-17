import type { ButtonHTMLAttributes } from "react";

/** Tutarlı buton: primary (koyu), secondary (çerçeveli), ghost (düz), danger (kırmızı metin). */
export function Btn({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-[var(--accent)] text-white hover:opacity-90 shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
    secondary: "border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:bg-[var(--surface)]",
    ghost: "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
    danger: "text-red-600 hover:bg-red-50",
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[0.8125rem] font-medium transition active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${styles[variant]} ${className}`}
    />
  );
}
