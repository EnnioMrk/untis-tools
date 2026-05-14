"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAvailablePlans, type AppPlan } from "@/lib/plans";
import { openMultiCheckout } from "@/app/premium/actions";
import { PlanCard } from "@/components/premium/plan-card";
import { Sparkles, Loader2 } from "lucide-react";
import { isValidCheckoutItems } from "@/lib/checkout/types";
import type { PaidPlan } from "@/lib/plans";

interface MultiPlanSelectorProps {
    currentPlan: string;
    planSource: string;
    hasActiveAccess: boolean;
    continueUrl?: string;
}

export function MultiPlanSelector({
    currentPlan,
    planSource,
    hasActiveAccess,
    continueUrl,
}: MultiPlanSelectorProps) {
    const [billingPeriod, setBillingPeriod] = useState<
        "monthly" | "yearly"
    >("monthly");
    const [selectedPlans, setSelectedPlans] = useState<
        { plan: string; billingPeriod: "monthly" | "yearly"; quantity: number }[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const plans = getAvailablePlans();

    const isSelected = (planId: string): boolean => {
        return selectedPlans.some((sp) => sp.plan === planId);
    };

    const getQuantity = (planId: string): number => {
        const item = selectedPlans.find((sp) => sp.plan === planId);
        return item?.quantity ?? 0;
    };

    const handlePlanToggle = (planId: string) => {
        setError(null);
        setSuccess(false);
        if (isSelected(planId)) {
            setSelectedPlans((prev) =>
                prev.filter((sp) => sp.plan !== planId),
            );
        } else {
            setSelectedPlans((prev) => [
                ...prev,
                {
                    plan: planId,
                    billingPeriod,
                    quantity: 1,
                },
            ]);
        }
    };

    const handleQuantityChange = (planId: string, delta: number) => {
        setError(null);
        setSuccess(false);
        setSelectedPlans((prev) => {
            const existing = prev.find((sp) => sp.plan === planId);
            if (!existing) return prev;
            const newQty = Math.max(0, existing.quantity + delta);
            if (newQty === 0) {
                return prev.filter((sp) => sp.plan !== planId);
            }
            return prev.map((sp) =>
                sp.plan === planId
                    ? { ...sp, quantity: newQty, billingPeriod }
                    : sp,
            );
        });
    };

    const handleCheckout = async () => {
        if (selectedPlans.filter((sp) => sp.quantity > 0).length === 0) {
            setError("Bitte wählen Sie mindestens einen Plan.");
            return;
        }

        const items = selectedPlans
            .filter((sp) => sp.quantity > 0)
            .map((sp) => ({
                ...sp,
                plan: sp.plan as PaidPlan,
            }));

        if (!isValidCheckoutItems(items)) {
            setError("Ungültige Checkout-Artikel ausgewählt.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await openMultiCheckout(items, continueUrl);

            if (!result.success) {
                setError(result.error || "Checkout konnte nicht gestartet werden");
                setLoading(false);
                return;
            }

            if (result.checkoutId) {
                setSuccess(true);
                // Open Paddle checkout overlay
                (window as any).Paddle?.Checkout.open({
                    transactionId: result.checkoutId,
                    settings: {
                        displayMode: "overlay",
                        theme: "light",
                        locale: "en",
                    },
                });
            }
        } catch (err) {
            console.error("Checkout error:", err);
            setError("Checkout konnte nicht gestartet werden. Bitte versuchen Sie es erneut.");
        } finally {
            setLoading(false);
        }
    };

    const selectedTotal = selectedPlans
        .filter((sp) => sp.quantity > 0)
        .map((sp) => {
            const planCfg = plans.find((p) => p.id === sp.plan);
            const unitPrice =
                billingPeriod === "yearly"
                    ? planCfg?.yearlyPrice ?? 0
                    : planCfg?.monthlyPrice ?? 0;
            return unitPrice * sp.quantity;
        })
        .reduce((sum, val) => sum + val, 0);

    return (
        <div>
            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
                <button
                    onClick={() => {
                        setBillingPeriod("monthly");
                        setSelectedPlans((prev) =>
                            prev.map((sp) => ({
                                ...sp,
                                billingPeriod: "monthly",
                            })),
                        );
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                        billingPeriod === "monthly"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                >
                    Monatlich
                </button>
                <button
                    onClick={() => {
                        setBillingPeriod("yearly");
                        setSelectedPlans((prev) =>
                            prev.map((sp) => ({
                                ...sp,
                                billingPeriod: "yearly",
                            })),
                        );
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                        billingPeriod === "yearly"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                >
                    Jährlich{" "}
                    <span className="text-xs text-green-500 ml-1">
                        Sparen Sie bis zu 17%
                    </span>
                </button>
            </div>

            {/* Plan Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        planId={plan.id}
                        currentPlan={currentPlan}
                        planSource={planSource}
                        hasActiveAccess={hasActiveAccess}
                        billingPeriod={billingPeriod}
                        onSelect={(planId: string) =>
                            handlePlanToggle(planId)
                        }
                        continueUrl={continueUrl}
                    />
                ))}
            </div>

            {/* Quantity Controls for Selected Plans */}
            {selectedPlans.filter((sp) => sp.quantity > 0).length > 0 && (
                <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Ausgewählte Plätze
                    </h3>
                    <div className="flex flex-col gap-3">
                        {selectedPlans
                            .filter((sp) => sp.quantity > 0)
                            .map((sp) => {
                                const planCfg = plans.find(
                                    (p) => p.id === sp.plan,
                                );
                                const price =
                                    sp.billingPeriod === "yearly"
                                        ? planCfg?.yearlyPriceLabel
                                        : planCfg?.monthlyPriceLabel;
                                const total =
                                    sp.billingPeriod === "yearly"
                                        ? (planCfg?.yearlyPrice ?? 0) *
                                          sp.quantity
                                        : (planCfg?.monthlyPrice ?? 0) *
                                          sp.quantity;
                                return (
                                    <div
                                        key={`${sp.plan}-${sp.billingPeriod}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                    >
                                        <div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {sp.plan}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                                ({sp.billingPeriod})
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                                x{sp.quantity} @ {price} each
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                €{total.toFixed(2)}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() =>
                                                        handleQuantityChange(
                                                            sp.plan,
                                                            -1,
                                                        )
                                                    }
                                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                                                >
                                                    −
                                                </button>
                                                <span className="w-8 text-center font-medium text-gray-700 dark:text-gray-300">
                                                    {sp.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        handleQuantityChange(
                                                            sp.plan,
                                                            1,
                                                        )
                                                    }
                                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Checkout Button */}
                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Gesamt:{" "}
                            <span className="font-bold text-gray-900 dark:text-white">
                                €{selectedTotal.toFixed(2)}
                            </span>
                            /Monat
                        </span>
                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Wird verarbeitet...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Zur Kasse ({selectedPlans.filter((sp) => sp.quantity > 0).length} Artikel)
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                            Weiterleitung zur Zahlung...
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}