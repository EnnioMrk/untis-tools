import { WidgetType } from "@/types/widget";
import type { PlanConfig } from "./types";

export const basicPlanConfig: PlanConfig = {
    id: "BASIC",
    slug: "basic",
    name: "Basis",
    description:
        "Wesentliche Stundenplan-Analysen mit einem kompakten Dashboard und wiederkehrender Anzeige.",
    monthlyPrice: 1.99,
    monthlyPriceLabel: "€1.99",
    yearlyPrice: 19.99,
    yearlyPriceLabel: "€19.99",
    yearlySavings: "17% sparen",
    ctaLabel: "Auf Basis upgraden",
    featureList: [
        "Bis zu 5 Dashboard-Widgets",
        "Kern-KPI- und Diagramm-Widgets",
        "Grundlegende Themes",
        "Benutzerdefinierte Dashboard-Layouts",
    ],
    features: {
        maxWidgets: 5,
        allowedWidgetTypes: [
            WidgetType.KPI_7DAYS,
            WidgetType.KPI_14DAYS,
            WidgetType.KPI_30DAYS,
            WidgetType.KPI_ALLTIME,
            WidgetType.ABSENCE_BAR,
            WidgetType.ABSENCE_TREND,
            WidgetType.SUBJECT_BREAKDOWN,
            WidgetType.TOTAL_ABSENCE_BAR,
            WidgetType.ABSENCE_RATE,
        ],
        statisticsRangeDays: 30,
        themes: "basic",
        dataExport: false,
        prioritySupport: false,
        earlyAccess: false,
        advancedAnalytics: false,
        customLayouts: true,
    },
    comparison: {
        dashboardWidgets: "Bis zu 5",
        widgetTypes: "Kern-Widgets",
        themes: "Grundlegend",
        statisticsRange: "30 Tage",
        dataExport: "Nein",
        prioritySupport: "Nein",
        earlyAccess: "Nein",
    },
};
