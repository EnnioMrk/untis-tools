"use client";

import { Check } from "lucide-react";
import { getPlanConfig } from "@/lib/plans";
import { PlanButton } from "@/components/premium/premium-button";
import type { AppPlan, PaidPlan } from "@/lib/plans";

interface PlanCardProps {
    planId: string;
    currentPlan: string;
    planSource: string;
    hasActiveAccess: boolean;
    billingPeriod: "monthly" | "yearly";
    onSelect: (planId: string) => void;
    continueUrl?: string;
}

export function PlanCard({
    planId,
    currentPlan,
    planSource,
    hasActiveAccess,
    billingPeriod,
    onSelect,
    continueUrl,
}: PlanCardProps) {
    const plan = getPlanConfig(planId);
    const price =
        billingPeriod === "yearly" ? plan.yearlyPriceLabel : plan.monthlyPriceLabel;
    const periodLabel = billingPeriod === "yearly" ? "/year" : "/month";
    const savings =
        billingPeriod === "yearly" && plan.yearlySavings ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {plan.yearlySavings}
            </span>
        ) : null;

    return (
        <article className="rounded-2xl p-8 shadow-lg border">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {plan.name}
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
                {plan.description}
            </p>
            <div className="mt-6 flex items-end gap-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {price}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                    {periodLabel}
                </span>
                {savings}
            </div>
            <ul className="mt-6 space-y-3">
                {plan.featureList.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">{f}</span>
                    </li>
                ))}
            </ul>
            <PlanButton
                className="mt-8"
                currentPlan={currentPlan as AppPlan}
                targetPlan={planId as PaidPlan}
                planSource={planSource as any}
                hasActiveAccess={hasActiveAccess}
                billingPeriod={billingPeriod}
                onClick={() => onSelect(planId)}
                continueUrl={continueUrl}
            />
        </article>
    );
}