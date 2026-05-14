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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

function formatPlanName(plan: Plan): string {
  if (plan === "PREMIUM") return "Premium";
  if (plan === "STANDARD") return "Standard";
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
const SHOW_INTERVAL_MS = 60 * 60 * 24 * 7;

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
      let targetPlan: PaidPlan;
      if (currentPlan === "BASIC") {
        targetPlan = "STANDARD";
      } else if (currentPlan === "STANDARD") {
        targetPlan = "PREMIUM";
      } else {
        markPromptDismissed();
        setVisible(false);
        return;
      }

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
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <DialogTitle className="text-2xl">Ready to upgrade?</DialogTitle>
          <DialogDescription className="text-base">
            You&apos;re currently on the <span className="font-semibold text-foreground">{formatPlanName(currentPlan)}</span> plan. Upgrade to <strong>{nextPlanLabel}</strong> to unlock more widgets, longer statistics ranges, and premium features.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex flex-col gap-3 sm:flex-col">
          <Button
            onClick={handleUpgrade}
            disabled={loading || !paddleReady}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Opening checkout...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Upgrade to {nextPlanLabel}
              </>
            )}
          </Button>

          {!loading && (
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full"
            >
              Not now, maybe later
            </Button>
          )}

          {!paddleReady && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Loading payment system...
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}