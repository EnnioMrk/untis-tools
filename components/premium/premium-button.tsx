"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, PaddleEventData } from "@paddle/paddle-js";
import {
    getPlanConfig,
    isPlanAtLeast,
    type AppPlan,
    type PaidPlan,
} from "@/lib/plans";
import type { PlanSource } from "@prisma/client";
import { openCheckout } from "@/app/premium/actions";
import { Sparkles, Crown, Loader2, Star } from "lucide-react";
import { inferClientPaddleEnvironment } from "@/lib/paddle-environment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PremiumButtonProps {
    currentPlan: AppPlan;
    targetPlan: PaidPlan;
    planSource?: PlanSource;
    hasActiveAccess?: boolean;
    className?: string;
    billingPeriod?: "monthly" | "yearly";
    onCheckoutComplete?: () => void;
    onClick?: () => void;
    continueUrl?: string;
}

export function PlanButton({
    currentPlan,
    targetPlan,
    planSource = "NONE",
    hasActiveAccess = false,
    className = "",
    billingPeriod = "monthly",
    onCheckoutComplete,
    onClick,
    continueUrl,
}: PremiumButtonProps) {
    const router = useRouter();
    const [paddle, setPaddle] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const targetPlanConfig = getPlanConfig(targetPlan);
    const hasCurrentOrHigherPlan =
        hasActiveAccess &&
        planSource === "SUBSCRIPTION" &&
        isPlanAtLeast(currentPlan, targetPlan);
    const isCurrentPlan =
        hasActiveAccess &&
        planSource === "SUBSCRIPTION" &&
        currentPlan === targetPlan;
    const isTrialPlan =
        hasActiveAccess && planSource === "TRIAL" && targetPlan === "PREMIUM";

    // Initialize Paddle on mount
    useEffect(() => {
        const initPaddle = async () => {
            try {
                const clientToken =
                    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
                await initializePaddle({
                    environment: inferClientPaddleEnvironment(
                        clientToken,
                        process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT,
                    ),
                    token: clientToken,
                    eventCallback: (event: PaddleEventData) => {
                        if (event.name === "checkout.completed") {
                            if (onCheckoutComplete) {
                                onCheckoutComplete();
                            } else if (continueUrl) {
                                router.push(continueUrl);
                                router.refresh();
                            } else {
                                router.push("/premium");
                                router.refresh();
                            }
                        }
                    },
                });
                setPaddle(true);
            } catch (err) {
                console.error("Failed to initialize Paddle:", err);
            }
        };

        initPaddle();
    }, [router, onCheckoutComplete]);

    const handleCheckout = useCallback(async () => {
        if (!paddle) {
            setError("Zahlungssystem noch nicht bereit. Bitte versuchen Sie es erneut.");
            return;
        }

        // If parent provided an onClick handler, use it instead of default checkout
        if (onClick) {
            onClick();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await openCheckout(targetPlan, continueUrl);

            if (!result.success) {
                setError(result.error || "Failed to start checkout");
                setLoading(false);
                return;
            }

            if (result.checkoutId) {
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
            setError("Konnte Checkout nicht starten. Bitte versuchen Sie es erneut.");
        } finally {
            setLoading(false);
        }
    }, [paddle, targetPlan, onClick, continueUrl]);

    if (hasCurrentOrHigherPlan) {
        return (
            <Button
                disabled
                className={cn(
                    "w-full py-3 px-6 text-white font-medium rounded-lg flex items-center justify-center gap-2",
                    currentPlan === "PREMIUM"
                        ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                        : "bg-gradient-to-r from-blue-500 to-cyan-600",
                    className
                )}
            >
                {isCurrentPlan ? (
                    currentPlan === "PREMIUM" ? (
                        <Crown className="w-5 h-5" />
                    ) : (
                        <Star className="w-5 h-5" />
                    )
                ) : (
                    <Crown className="w-5 h-5" />
                )}
                {isCurrentPlan
                    ? `${targetPlanConfig.name} aktiv`
                    : "In Ihrem aktuellen Plan enthalten"}
            </Button>
        );
    }

    if (isTrialPlan) {
        return (
            <Button
                disabled
                className={cn(
                    "w-full py-3 px-6 text-white font-medium rounded-lg flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600",
                    className
                )}
            >
                <Sparkles className="w-5 h-5" />
                Premium-Test aktiv
            </Button>
        );
    }

    return (
        <div className={className}>
            {error && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                </div>
            )}
            <Button
                onClick={handleCheckout}
                disabled={loading || !paddle}
                className={cn(
                    "w-full py-3 px-6 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2",
                    targetPlan === "PREMIUM"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400"
                        : "bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black disabled:from-slate-500 disabled:to-slate-600",
                    className
                )}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Wird geladen...
                    </>
                ) : (
                    <>
                        {targetPlan === "PREMIUM" ? (
                            <Sparkles className="w-5 h-5" />
                        ) : (
                            <Star className="w-5 h-5" />
                        )}
                        {targetPlanConfig.ctaLabel}
                    </>
                )}
            </Button>
            {!paddle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Lade Zahlungssystem...
                </p>
            )}
        </div>
    );
}