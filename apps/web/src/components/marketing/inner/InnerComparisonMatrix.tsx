"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { fade } from "@/components/marketing/home/shared";

export type InnerMatrixRow = {
  label: string;
  values: ("yes" | "no" | "partial" | string)[];
};

export function InnerComparisonMatrix({
  columns,
  rows,
}: {
  columns: string[];
  rows: InnerMatrixRow[];
}) {
  return (
    <motion.div
      {...fade}
      className="attio-surface overflow-x-auto p-0"
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/[0.08]">
            <th className="px-5 py-4 font-medium text-muted-foreground sm:px-6">
              &nbsp;
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-4 font-display text-base tracking-tight text-foreground sm:px-5"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-foreground/[0.06] last:border-b-0"
            >
              <td className="px-5 py-3.5 font-medium text-foreground sm:px-6">
                {row.label}
              </td>
              {row.values.map((value, i) => (
                <td key={`${row.label}-${i}`} className="px-4 py-3.5 sm:px-5">
                  <MatrixCell value={value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

function MatrixCell({ value }: { value: "yes" | "no" | "partial" | string }) {
  if (value === "yes") {
    return <Check className="h-4 w-4 text-[#ff5a6e]" aria-label="Included" />;
  }
  if (value === "no") {
    return <Minus className="h-4 w-4 text-muted-foreground/50" aria-label="Not included" />;
  }
  if (value === "partial") {
    return (
      <span className="text-xs font-medium text-muted-foreground">Limited</span>
    );
  }
  return <span className="text-xs text-muted-foreground">{value}</span>;
}
