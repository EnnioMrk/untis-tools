import type { Plan, PlanSource } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isPlanAtLeast, type PaidPlan } from "./plans";
import type { AccessState } from "./access-engine";
import { refreshGrants } from "./access-engine";

export function addMonths(date: Date, months: number): Date {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
}

export function formatPlanName(plan: Plan): string {
    if (plan === "PREMIUM") {
        return "Premium";
    }

    if (plan === "STANDARD") {
        return "Standard";
    }

    return "Basic";
}

export function formatPlanSource(source: string): string {
    switch (source) {
        case "SUBSCRIPTION":
            return "subscription";
        case "TRIAL":
            return "trial";
        case "ADMIN":
            return "admin grant";
        case "REFERRAL":
        case "COUPON":
        case "BONUS":
            return "bonus month";
        default:
            return "inactive";
    }
}

export async function getUserAccessState(
    userId: string,
): Promise<AccessState> {
    return refreshGrants(userId);
}

export async function getUserAccessSnapshot(userId: string) {
    const access = await refreshGrants(userId);
    return {
        id: userId,
        plan: access.effectivePlan,
        planSource: access.source as PlanSource,
        hasAccess: access.hasAccess,
        expiresAt: access.expiresAt,
    };
}

export async function ensureActiveSubscriptionAccess(userId: string) {
    const accessState = await refreshGrants(userId);

    if (!accessState.hasAccess) {
        redirect("/premium/trial-ended");
    }

    return {
        user: await prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: {
                id: true,
                plan: true,
                planSource: true,
                isAdmin: true,
            },
        }),
        accessState,
    };
}

export async function ensureAdminAccess(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true },
    });

    if (!user?.isAdmin) {
        redirect("/dashboard");
    }

    return user;
}

export function getEffectivePlanFromMultiPlans(
    plans: { plan: PaidPlan; billingPeriod: string; quantity: number }[],
): PaidPlan {
    if (plans.length === 0) return "BASIC";
    return plans.reduce<PaidPlan>((highest, p) =>
        isPlanAtLeast(highest, p.plan) ? highest : p.plan,
    "BASIC" as PaidPlan);
}