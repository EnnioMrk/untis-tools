"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { openCheckout } from "@/app/premium/actions";
import { initializePaddle, type PaddleEventData } from "@paddle/paddle-js";
import { X, Loader2, Crown, Sparkles } from "lucide-react";
import { isPlanAtLeast, type AppPlan, type PaidPlan } from "@/lib/plans";
import { inferClientPaddleEnvironment } from "@/lib/paddle-environment";
import { useSession } from "next-auth/react";
import { Plan } from "@prisma/client";

function formatPlanName(plan: Plan): string {
    if (plan === "PREMIUM") {
        return "Premium";
    }
    if (plan === "STANDARD") {
        return "Standard";
    }
    return "Basic";
}

interface SubscriptionUpgradePromptProps {
  currentPlan: Plan;
  userPlan: AppPlan;
  planSource: string;
  hasActiveAccess: boolean;
  paddleSubscriptionId: string | null;
  isAdmin: boolean;
}

const STORAGE_KEY = "subscription-upgrade-dismissed";
const SHOW_INTERVAL_MS = 60 * 60 * 24 * 7; // Show once per week (7 days)

function shouldShowPrompt(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (!isNaN(dismissedTime) && Date.now() - dismissedTime < SHOW_INTERVAL_MS) {
        return false;
      }
    }
  } catch {
    // localStorage not available
  }
  return true;
}

function markPromptDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch {
    // localStorage not available
  }
}

export function SubscriptionUpgradePrompt({
  currentPlan,
  userPlan,
  planSource,
  hasActiveAccess,
  paddleSubscriptionId,
  isAdmin,
}: SubscriptionUpgradePromptProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    // Only show prompt if:
    // 1. User is authenticated (session exists)
    // 2. User has an active subscription (planSource === "SUBSCRIPTION")
    // 3. User has a Paddle subscription ID
    // 4. Not admin
    // 5. Enough time has passed since last dismiss
    if (
      session?.status === "authenticated" &&
      planSource === "SUBSCRIPTION" &&
      paddleSubscriptionId &&
      !isAdmin &&
      shouldShowPrompt()
    ) {
      setVisible(true);
    }
  }, [session?.status, planSource, paddleSubscriptionId, isAdmin]);

  useEffect(() => {
    if (!visible) return;

    const initPaddle = async () => {
      try {
        const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
        await initializePaddle({
          environment: inferClientPaddleEnvironment(
            clientToken,
            process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT,
          ),
          token: clientToken,
          eventCallback: (event: PaddleEventData) => {
            if (event.name === "checkout.completed") {
              setCompleted(true);
              setVisible(false);
              markPromptDismissed();
              router.refresh();
            }
          },
        });
        setPaddleReady(true);
      } catch (err) {
        console.error("Failed to initialize Paddle:", err);
      }
    };

    initPaddle();
  }, [visible, router]);

  const handleUpgrade = useCallback(async () => {
    if (!paddleReady) {
      setError("Payment system is not ready. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine the next plan to upgrade to
      let targetPlan: PaidPlan;
      if (currentPlan === "BASIC") {
        targetPlan = "STANDARD";
      } else if (currentPlan === "STANDARD") {
        targetPlan = "PREMIUM";
      } else {
        // Already at PREMIUM, dismiss the prompt
        markPromptDismissed();
        setVisible(false);
        return;
      }

      // Check if user already has access to the next plan or higher
      if (hasActiveAccess && isPlanAtLeast(userPlan, targetPlan)) {
        markPromptDismissed();
        setVisible(false);
        return;
      }

      const result = await openCheckout(targetPlan, "/premium");

      if (!result.success) {
        setError(result.error || "Failed to start checkout");
        setLoading(false);
        return;
      }

      if (result.checkoutId) {
        // Open Paddle checkout overlay
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      console.error("Upgrade error:", err);
      setError("Failed to start upgrade. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [paddleReady, currentPlan, hasActiveAccess, userPlan]);

  const handleDismiss = useCallback(() => {
    markPromptDismissed();
    setVisible(false);
  }, []);

  if (!visible || completed) return null;

  const nextPlanLabel =
    currentPlan === "BASIC" ? "Standard" : currentPlan === "STANDARD" ? "Premium" : null;

  if (!nextPlanLabel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition"
          aria-label="Dismiss upgrade prompt"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ready to upgrade?
          </h2>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 max-w-md">
            You&apos;re currently on the{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatPlanName(currentPlan)}
            </span>{" "}
            plan. Upgrade to <strong>{nextPlanLabel}</strong> to unlock more
            widgets, longer statistics ranges, and premium features.
          </p>

          {/* Error display */}
          {error && (
            <div className="w-full p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={handleUpgrade}
              disabled={loading || !paddleReady}
              className="w-full py-3 px-6 text-white font-medium rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-violet-400 disabled:to-fuchsia-400 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Opening checkout...
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  Upgrade to {nextPlanLabel}
                </>
              )}
            </button>

            {!loading && (
              <button
                onClick={handleDismiss}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
              >
                Not now, maybe later
              </button>
            )}
          </div>

          {!paddleReady && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Loading payment system...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}