import type { WidgetType } from "@/types/widget";

export const APP_PLANS = ["BASIC", "STANDARD", "PREMIUM"] as const;

export type AppPlan = (typeof APP_PLANS)[number];
export type PaidPlan = AppPlan;
export type ThemeAccess = "basic" | "standard" | "premium";

export interface PlanFeatureAccess {
    maxWidgets: number | null;
    allowedWidgetTypes: WidgetType[];
    statisticsRangeDays: number | null;
    themes: ThemeAccess;
    dataExport: boolean;
    prioritySupport: boolean;
    earlyAccess: boolean;
    advancedAnalytics: boolean;
    customLayouts: boolean;
}

export interface PlanComparisonValues {
    dashboardWidgets: string;
    widgetTypes: string;
    themes: string;
    statisticsRange: string;
    dataExport: string;
    prioritySupport: string;
    earlyAccess: string;
}

export interface PlanConfig {
    id: AppPlan;
    slug: "basic" | "standard" | "premium";
    name: string;
    description: string;
    monthlyPrice: number;
    monthlyPriceLabel: string;
    ctaLabel: string;
    highlight?: "popular" | "premium";
    featureList: string[];
    features: PlanFeatureAccess;
    comparison: PlanComparisonValues;
}
