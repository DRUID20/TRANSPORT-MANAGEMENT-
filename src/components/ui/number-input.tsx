"use client";

import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";

/**
 * Numeric input that shows thousands separators as you type (e.g. 2,400,000)
 * while emitting the raw numeric string (e.g. "2400000") via onValueChange.
 *
 * Uses a text input under the hood (native number inputs can't render commas).
 * Keeps a single decimal point and any decimals intact while editing.
 */
export interface NumberInputProps
  extends Omit<InputProps, "type" | "value" | "onChange" | "inputMode"> {
  /** Raw numeric string WITHOUT commas, e.g. "24500" or "152.30". */
  value: string;
  /** Called with the raw (comma-stripped) string. */
  onValueChange: (raw: string) => void;
  /** Allow decimals (default true). */
  decimal?: boolean;
}

export function formatWithCommas(raw: string): string {
  if (raw === "" || raw === "-") return raw;
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart, ...rest] = unsigned.split(".");
  const grouped = (intPart ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = rest.length > 0 ? "." + rest.join("") : "";
  return (negative ? "-" : "") + grouped + decimals;
}

/** Strip everything except digits, one dot, leading minus. */
function sanitize(input: string, decimal: boolean): string {
  let s = input.replace(/,/g, "");
  s = s.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (decimal) {
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
      // keep only the first dot
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return s;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, decimal = true, ...props }, ref) => {
    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        value={formatWithCommas(value)}
        onChange={(e) => onValueChange(sanitize(e.currentTarget.value, decimal))}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";
