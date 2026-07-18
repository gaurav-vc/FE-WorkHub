import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { formatDistanceToNow as fnFormatDistanceToNow, format as fnFormat } from "date-fns";

export function safeFormatDistanceToNow(dateVal: string | Date | number, options?: any) {
  try {
    if (!dateVal) return "just now";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : "just now";
    return fnFormatDistanceToNow(d, options);
  } catch (e) {
    return "just now";
  }
}

export function safeFormat(dateVal: string | Date | number, formatStr: string) {
  try {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : "";
    return fnFormat(d, formatStr);
  } catch (e) {
    return "";
  }
}
