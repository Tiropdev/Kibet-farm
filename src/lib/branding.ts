import { useEffect, useState } from "react";

export interface FarmBranding {
  name: string;
  tagline: string;
  logoUrl: string;
  /** HSL hue (0-360) used to derive the primary color */
  themeHue: number;
  themeSat: number;
}

const KEY = "kfy-branding-v1";

export const DEFAULT_BRANDING: FarmBranding = {
  name: "Kibet Farm Yard",
  tagline: "Dairy manager · v1.0",
  logoUrl: "/logo.png?v=3",
  themeHue: 142,
  themeSat: 42,
};

export const THEME_PRESETS: { label: string; hue: number; sat: number }[] = [
  { label: "Sage green", hue: 142, sat: 42 },
  { label: "Ocean teal", hue: 178, sat: 55 },
  { label: "Sunrise amber", hue: 32, sat: 80 },
  { label: "Royal indigo", hue: 232, sat: 55 },
  { label: "Earth clay", hue: 14, sat: 60 },
  { label: "Charcoal", hue: 220, sat: 12 },
];

export function loadBranding(): FarmBranding {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function saveBranding(b: FarmBranding) {
  localStorage.setItem(KEY, JSON.stringify(b));
  applyTheme(b.themeHue, b.themeSat);
  window.dispatchEvent(new CustomEvent("kfy-branding-changed", { detail: b }));
}

/** Apply theme tokens dynamically by overriding CSS variables on :root. */
export function applyTheme(hue: number, sat: number) {
  const root = document.documentElement;
  root.style.setProperty("--primary", `${hue} ${sat}% 38%`);
  root.style.setProperty("--primary-soft", `${hue} ${Math.min(sat + 5, 60)}% 94%`);
  root.style.setProperty("--accent", `${hue} ${Math.min(sat + 5, 60)}% 94%`);
  root.style.setProperty("--accent-foreground", `${hue} ${sat}% 22%`);
  root.style.setProperty("--ring", `${hue} ${sat}% 38%`);
  root.style.setProperty(
    "--gradient-hero",
    `linear-gradient(135deg, hsl(${hue} ${Math.min(sat + 5, 60)}% 50%), hsl(${(hue + 18) % 360} ${sat}% 38%))`,
  );
}

export function useBranding(): FarmBranding {
  const [b, setB] = useState<FarmBranding>(() => loadBranding());
  useEffect(() => {
    applyTheme(b.themeHue, b.themeSat);
    const handler = (e: Event) => setB((e as CustomEvent).detail);
    window.addEventListener("kfy-branding-changed", handler);
    return () => window.removeEventListener("kfy-branding-changed", handler);
  }, []);
  return b;
}