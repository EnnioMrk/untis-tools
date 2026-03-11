import type { WidgetData, WidgetType } from "@/types/widget";
import { basicPlanConfig } from "./basic";
import { premiumPlanConfig } from "./premium";
import { standardPlanConfig } from "./standard";
import {
    APP_PLANS,
    type AppPlan,
    type PaidPlan,
    type PlanConfig,
} from "./types";

export type { AppPlan, PaidPlan, PlanConfig } from "./types";

export const PLAN_ORDER: AppPlan[] = ["BASIC", "STANDARD", "PREMIUM"];

export const PLAN_CONFIGS: Record<AppPlan, PlanConfig> = {
    BASIC: basicPlanConfig,
    STANDARD: standardPlanConfig,
    PREMIUM: premiumPlanConfig,
};

export function normalizePlan(plan: string | null | undefined): AppPlan {
    if (plan === "BASIC" || plan === "STANDARD" || plan === "PREMIUM") {
        return plan;
    }

    return "BASIC";
}

export function getPlanConfig(plan: string | null | undefined): PlanConfig {
    return PLAN_CONFIGS[normalizePlan(plan)];
}

export function getAvailablePlans(): PlanConfig[] {
    return PLAN_ORDER.map((plan) => PLAN_CONFIGS[plan]);
}

export function isPlanAtLeast(
    currentPlan: string | null | undefined,
    requiredPlan: AppPlan,
): boolean {
    return (
        PLAN_ORDER.indexOf(normalizePlan(currentPlan)) >=
        PLAN_ORDER.indexOf(requiredPlan)
    );
}

export function canAccessWidget(
    plan: string | null | undefined,
    widgetType: WidgetType,
): boolean {
    return getPlanConfig(plan).features.allowedWidgetTypes.includes(widgetType);
}

export function getRequiredPlanForWidget(widgetType: WidgetType): AppPlan {
    return (
        PLAN_ORDER.find((plan) =>
            PLAN_CONFIGS[plan].features.allowedWidgetTypes.includes(widgetType),
        ) || "PREMIUM"
    );
}

export function sanitizeWidgetsForPlan(
    widgets: WidgetData[],
    plan: string | null | undefined,
): WidgetData[] {
    const planConfig = getPlanConfig(plan);
    const accessibleWidgets = widgets.filter((widget) =>
        canAccessWidget(planConfig.id, widget.type),
    );

    if (planConfig.features.maxWidgets === null) {
        return accessibleWidgets;
    }

    return accessibleWidgets.slice(0, planConfig.features.maxWidgets);
}

export function isPaidPlan(plan: string | null | undefined): plan is PaidPlan {
    return APP_PLANS.includes(normalizePlan(plan));
}
