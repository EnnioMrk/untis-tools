"use client";

import { Check } from "lucide-react";
import { getPlanConfig } from "@/lib/plans";
import { PlanButton } from "@/components/premium/premium-button";
import type { AppPlan, PaidPlan } from "@/lib/plans";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-6 flex items-end gap-2">
                    <span className="text-4xl font-bold text-foreground">
                        {price}
                    </span>
                    <span className="text-muted-foreground">
                        {periodLabel}
                    </span>
                    {billingPeriod === "yearly" && plan.yearlySavings && (
                        <Badge variant="secondary" className="text-xs">
                            {plan.yearlySavings}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ul className="mt-6 space-y-3">
                    {plan.featureList.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                            <span className="text-foreground/80">{f}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <PlanButton
                    className="mt-0"
                    currentPlan={currentPlan as AppPlan}
                    targetPlan={planId as PaidPlan}
                    planSource={planSource as any}
                    hasActiveAccess={hasActiveAccess}
                    billingPeriod={billingPeriod}
                    onClick={() => onSelect(planId)}
                    continueUrl={continueUrl}
                />
            </CardFooter>
        </Card>
    );
}