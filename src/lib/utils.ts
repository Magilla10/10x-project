import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBrowserLocation(): Location | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.location;
}
