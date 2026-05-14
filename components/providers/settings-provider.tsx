"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useTheme } from "next-themes";

export type ThemeMode = "light" | "dark" | "system";
export type BaseColor = "slate" | "gray" | "zinc" | "neutral" | "stone" | "blue" | "green" | "orange" | "red" | "violet" | "rose" | "amber" | "cyan" | "emerald" | "fuchsia" | "indigo" | "lime" | "pink" | "sky" | "teal" | "yellow";
export type BackgroundColor = "neutral" | "stone" | "zinc" | "mauve" | "olive" | "mist" | "taupe";
export type ChartColor = "default" | "purple" | "blue" | "green" | "orange" | "red" | "pink" | "indigo" | "cyan" | "amber" | "lime" | "sky" | "teal";
export type BorderShadowMode = "both" | "borders" | "shadows";

export interface ThemeConfig {
   theme: ThemeMode;
   baseColor: BaseColor;
   backgroundColor: BackgroundColor;
   chartColor: ChartColor;
   radius: number;
   headingFont: string;
   bodyFont: string;
   borderShadowMode: BorderShadowMode;
 }

export interface UserSettings {
  useShortSubjectNames: boolean;
  showOnlyUnexcusedAbsences: boolean;
  theme: ThemeConfig;
}

interface SettingsContextValue {
  settings: UserSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  updateTheme: (themeUpdates: Partial<ThemeConfig>) => void;
  chartColors: string[];
}

const defaultThemeConfig: ThemeConfig = {
   theme: "system",
   baseColor: "slate",
   backgroundColor: "neutral",
   chartColor: "default",
   radius: 0.5,
   headingFont: "Geist_Sans",
   bodyFont: "Geist_Sans",
   borderShadowMode: "both",
 };

export const defaultUserSettings: UserSettings = {
  useShortSubjectNames: true,
  showOnlyUnexcusedAbsences: false,
  theme: defaultThemeConfig,
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultUserSettings,
  isLoading: false,
  updateSettings: async () => {},
  updateTheme: () => {},
  chartColors: [],
});

// Font mapping
const fontMap: Record<string, string> = {
  Geist_Sans: "var(--font-geist-sans)",
  Geist_Mono: "var(--font-geist-mono)",
  Inter: "Inter, sans-serif",
  system: "system-ui, sans-serif",
};

// Chart color schemes
const chartColorSchemes: Record<string, Record<string, string[]>> = {
  default: {
    slate: ["#64748b", "#3f4c63", "#94a3b8", "#cbd5e1", "#e2e8f0"],
    gray: ["#6b7280", "#4b5563", "#9ca3af", "#d1d5e7", "#e5e7eb"],
    zinc: ["#71717a", "#52525b", "#a1a1aa", "#d4d4d8", "#e4e4e7"],
    neutral: ["#737373", "#525252", "#a3a3a3", "#d4d4d4", "#e5e5e5"],
    stone: ["#78716c", "#57534e", "#a8a29e", "#d6d3d1", "#e7e5e4"],
    blue: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"],
    green: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
    orange: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
    red: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
    violet: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
    rose: ["#f43f5e", "#e11d48", "#fb7185", "#fda4af", "#ffe4e6"],
    amber: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
    cyan: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
    emerald: ["#10b981", "#059669", "#34d399", "#6ee7b7", "#d1fae5"],
    fuchsia: ["#d946ef", "#c026d3", "#e9d5ff", "#f3e8ff", "#fdf4ff"],
    indigo: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
    lime: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
    pink: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
    sky: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
    teal: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
    yellow: ["#eab308", "#ca8a04", "#fde047", "#fef08a", "#fefce8"],
  },
purple: {
     slate: ["#7c3aed", "#6d28d9", "#a78bfa", "#c4b5fd", "#ede9fe"],
     gray: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     zinc: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     neutral: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     stone: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     blue: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     green: ["#a855f7", "#9333ea", "#d8b4fe", "#e9d5ff", "#f3e8ff"],
     orange: ["#d946ef", "#c026d3", "#e9d5ff", "#f3e8ff", "#fdf4ff"],
     red: ["#e11d48", "#be123c", "#fda4af", "#ffe4e6", "#fff1f2"],
     violet: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     rose: ["#f43f5e", "#e11d48", "#fb7185", "#fda4af", "#ffe4e6"],
     amber: ["#a855f7", "#9333ea", "#d8b4fe", "#e9d5ff", "#f3e8ff"],
     cyan: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     emerald: ["#a855f7", "#9333ea", "#d8b4fe", "#e9d5ff", "#f3e8ff"],
     fuchsia: ["#d946ef", "#c026d3", "#e9d5ff", "#f3e8ff", "#fdf4ff"],
     indigo: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     lime: ["#a855f7", "#9333ea", "#d8b4fe", "#e9d5ff", "#f3e8ff"],
     pink: ["#d946ef", "#c026d3", "#e9d5ff", "#f3e8ff", "#fdf4ff"],
     sky: ["#8b5cf6", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
     teal: ["#a855f7", "#9333ea", "#d8b4fe", "#e9d5ff", "#f3e8ff"],
     yellow: ["#d946ef", "#c026d3", "#e9d5ff", "#f3e8ff", "#fdf4ff"],
   },
blue: {
     slate: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"],
     gray: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"],
     zinc: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"],
     neutral: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"],
     stone: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"],
     blue: ["#3b82f6", "#2563eb", "#60a5fa", "#93c5fd", "#dbeafe"],
     green: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     orange: ["#0284c7", "#0369a1", "#38bdf8", "#bae6fd", "#e0f2fe"],
     red: ["#1d4ed8", "#1e40af", "#93c5fd", "#dbeafe", "#eff6ff"],
     violet: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     rose: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     amber: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     cyan: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     emerald: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     fuchsia: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     indigo: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     lime: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     pink: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     sky: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     teal: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     yellow: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
   },
green: {
     slate: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     gray: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     zinc: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     neutral: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     stone: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     blue: ["#10b981", "#059669", "#34d399", "#a7f3d0", "#d1fae5"],
     green: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     orange: ["#84cc16", "#65a30d", "#bef264", "#ecfccb", "#f7fee7"],
     red: ["#16a34a", "#15803d", "#4ade80", "#bbf7d0", "#dcfce7"],
     violet: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     rose: ["#10b981", "#059669", "#34d399", "#a7f3d0", "#d1fae5"],
     amber: ["#84cc16", "#65a30d", "#bef264", "#ecfccb", "#f7fee7"],
     cyan: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     emerald: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     fuchsia: ["#84cc16", "#65a30d", "#bef264", "#ecfccb", "#f7fee7"],
     indigo: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     lime: ["#84cc16", "#65a30d", "#bef264", "#ecfccb", "#f7fee7"],
     pink: ["#10b981", "#059669", "#34d399", "#a7f3d0", "#d1fae5"],
     sky: ["#10b981", "#059669", "#34d399", "#a7f3d0", "#d1fae5"],
     teal: ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#dcfce7"],
     yellow: ["#84cc16", "#65a30d", "#bef264", "#ecfccb", "#f7fee7"],
   },
orange: {
     slate: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
     blue: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     green: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
     orange: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
     red: ["#ea580c", "#c2410c", "#fdba74", "#ffedd5", "#fff7ed"],
     violet: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
     rose: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     amber: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     cyan: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     emerald: ["#10b981", "#059669", "#34d399", "#6ee7b7", "#d1fae5"],
     fuchsia: ["#d946ef", "#c026d3", "#e9d5ff", "#f3e8ff", "#fdf4ff"],
     indigo: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     lime: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     pink: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     sky: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     teal: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     yellow: ["#eab308", "#ca8a04", "#fde047", "#fef08a", "#fefce8"],
     neutral: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
     stone: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
     gray: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
     zinc: ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#ffedd5"],
   },
   red: {
     slate: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     blue: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     green: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     orange: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     red: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     violet: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     rose: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     amber: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     cyan: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     emerald: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     fuchsia: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     indigo: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     lime: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     pink: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     sky: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     teal: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     yellow: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     neutral: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     stone: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     gray: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
     zinc: ["#ef4444", "#dc2626", "#f87171", "#fca5a5", "#fee2e2"],
   },
   pink: {
     slate: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     blue: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     green: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     orange: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     red: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     violet: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     rose: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     amber: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     cyan: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     emerald: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     fuchsia: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     indigo: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     lime: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     pink: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     sky: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     teal: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     yellow: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     neutral: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     stone: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     gray: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
     zinc: ["#ec4899", "#db2777", "#f9a8d4", "#fbcfe8", "#fce7f3"],
   },
   indigo: {
     slate: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     blue: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     green: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     orange: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     red: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     violet: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     rose: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     amber: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     cyan: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     emerald: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     fuchsia: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     indigo: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     lime: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     pink: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     sky: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     teal: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     yellow: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     neutral: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     stone: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     gray: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
     zinc: ["#6366f1", "#4f46e5", "#818cf8", "#a5b4fc", "#eef2ff"],
   },
   cyan: {
     slate: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     blue: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     green: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     orange: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     red: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     violet: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     rose: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     amber: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     cyan: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffcfe"],
     emerald: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     fuchsia: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     indigo: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     lime: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     pink: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     sky: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     teal: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     yellow: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     neutral: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     stone: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     gray: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
     zinc: ["#06b6d4", "#0891b2", "#2dd4bf", "#5eead4", "#cffafe"],
   },
   amber: {
     slate: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     blue: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     green: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     orange: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     red: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     violet: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     rose: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     amber: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     cyan: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     emerald: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     fuchsia: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     indigo: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     lime: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     pink: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     sky: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     teal: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     yellow: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     neutral: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     stone: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     gray: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
     zinc: ["#f59e0b", "#d97706", "#fcd34d", "#fde68a", "#fffbeb"],
   },
   lime: {
     slate: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     blue: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     green: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     orange: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     red: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     violet: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     rose: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     amber: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     cyan: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     emerald: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     fuchsia: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     indigo: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     lime: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     pink: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     sky: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     teal: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     yellow: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     neutral: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     stone: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     gray: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
     zinc: ["#84cc16", "#65a30d", "#bef264", "#d9f99f", "#ecfccb"],
   },
   sky: {
     slate: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     blue: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     green: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     orange: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     red: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     violet: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     rose: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     amber: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     cyan: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     emerald: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     fuchsia: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     indigo: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     lime: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     pink: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     sky: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     teal: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     yellow: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     neutral: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     stone: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     gray: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
     zinc: ["#0ea5e9", "#0284c7", "#7dd3fc", "#bae6fd", "#e0f2fe"],
   },
   teal: {
     slate: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     blue: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     green: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     orange: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     red: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     violet: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     rose: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     amber: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     cyan: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     emerald: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     fuchsia: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     indigo: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     lime: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     pink: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     sky: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     teal: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     yellow: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     neutral: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     stone: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     gray: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
     zinc: ["#14b8a6", "#0d9488", "#5eead4", "#99f6e4", "#ccfbf1"],
   },
};

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: UserSettings | null;
}) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (initialSettings) {
      return { ...defaultUserSettings, ...initialSettings };
    }
    // Load from localStorage as fallback
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("untis-tools-settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...defaultUserSettings, ...parsed };
        } catch {
          // fall through
        }
      }
    }
    return defaultUserSettings;
  });
  const [isLoading, setIsLoading] = useState(false);

  const { setTheme } = useTheme();

  // Compute chart colors based on theme
  const chartColors = chartColorSchemes[settings.theme.chartColor]?.[settings.theme.baseColor] ||
                      chartColorSchemes.default.slate;

  // Apply theme to document on mount and when config changes
  useEffect(() => {
    // Sync next-themes with our setting
    setTheme(settings.theme.theme);

    const root = document.documentElement;

// Apply base color
      root.classList.remove(
        "base-slate", "base-gray", "base-zinc", "base-neutral", "base-stone",
        "base-blue", "base-green", "base-orange", "base-red",
        "base-violet", "base-rose", "base-amber", "base-cyan", "base-emerald",
        "base-fuchsia", "base-indigo", "base-lime", "base-pink", "base-sky", "base-teal", "base-yellow"
      );
      root.classList.add(`base-${settings.theme.baseColor}`);

     // Apply background color
      root.classList.remove(
        "bg-neutral", "bg-stone", "bg-zinc", "bg-mauve", "bg-olive", "bg-mist", "bg-taupe"
      );
      root.classList.add(`bg-${settings.theme.backgroundColor}`);

    // Apply radius
    root.style.setProperty("--radius", `${settings.theme.radius}rem`);

    // Apply fonts
    const headingFont = fontMap[settings.theme.headingFont] || fontMap.Geist_Sans;
    const bodyFont = fontMap[settings.theme.bodyFont] || fontMap.Geist_Sans;
    root.style.setProperty("--theme-heading-font", headingFont);
    root.style.setProperty("--theme-body-font", bodyFont);

     // Apply chart colors to CSS variables
     chartColors.forEach((color, i) => {
       root.style.setProperty(`--chart-color-${i + 1}`, color);
     });

     // Apply border & shadow mode
     root.setAttribute("data-border-shadow-mode", settings.theme.borderShadowMode);

     // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("untis-tools-settings", JSON.stringify(settings));
    }
  }, [settings, setTheme, chartColors]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const updated = await response.json();
        setSettings((prev) => ({ ...prev, ...updated }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateTheme = (themeUpdates: Partial<ThemeConfig>) => {
    const newTheme = { ...settings.theme, ...themeUpdates };
    setSettings((prev) => ({ ...prev, theme: newTheme }));
    // Persist immediately for instant feedback
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {}); // fire and forget
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, updateTheme, chartColors }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}