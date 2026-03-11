'use client';

import { useState, useEffect, useCallback } from 'react';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { getPlanConfig, isPlanAtLeast, type AppPlan, type PaidPlan } from '@/lib/plans';
import type { PlanSource } from '@prisma/client';
import { openCheckout } from '@/app/premium/actions';
import { Sparkles, Crown, Loader2, Star } from 'lucide-react';

interface PremiumButtonProps {
  currentPlan: AppPlan;
  targetPlan: PaidPlan;
  planSource?: PlanSource;
  hasActiveAccess?: boolean;
  className?: string;
}

export function PlanButton({
  currentPlan,
  targetPlan,
  planSource = 'NONE',
  hasActiveAccess = false,
  className = '',
}: PremiumButtonProps) {
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetPlanConfig = getPlanConfig(targetPlan);
  const hasCurrentOrHigherPlan =
    hasActiveAccess && planSource === 'SUBSCRIPTION' && isPlanAtLeast(currentPlan, targetPlan);
  const isCurrentPlan = hasActiveAccess && planSource === 'SUBSCRIPTION' && currentPlan === targetPlan;
  const isTrialPlan = hasActiveAccess && planSource === 'TRIAL' && targetPlan === 'PREMIUM';

  // Initialize Paddle on mount
  useEffect(() => {
    const initPaddle = async () => {
      try {
        const paddleInstance = await initializePaddle({
          environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
        });
        setPaddle(paddleInstance);
      } catch (err) {
        console.error('Failed to initialize Paddle:', err);
      }
    };

    initPaddle();
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!paddle) {
      setError('Payment system is not ready. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await openCheckout(targetPlan);

      if (!result.success) {
        setError(result.error || 'Failed to start checkout');
        setLoading(false);
        return;
      }

      if (result.checkoutId) {
        // Open Paddle checkout overlay
        paddle.Checkout.open({
          transactionId: result.checkoutId,
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            locale: 'en',
          },
        });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [paddle, targetPlan]);

  if (hasCurrentOrHigherPlan) {
    return (
      <button
        disabled
        className={`w-full py-3 px-6 text-white font-medium rounded-lg flex items-center justify-center gap-2 ${
          currentPlan === 'PREMIUM'
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
            : 'bg-gradient-to-r from-blue-500 to-cyan-600'
        } ${className}`}
      >
        {isCurrentPlan ? (
          currentPlan === 'PREMIUM' ? <Crown className="w-5 h-5" /> : <Star className="w-5 h-5" />
        ) : (
          <Crown className="w-5 h-5" />
        )}
        {isCurrentPlan ? `${targetPlanConfig.name} Active` : 'Included in your current plan'}
      </button>
    );
  }

  if (isTrialPlan) {
    return (
      <button
        disabled
        className={`w-full py-3 px-6 text-white font-medium rounded-lg flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 ${className}`}
      >
        <Sparkles className="w-5 h-5" />
        Premium trial active
      </button>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <button
        onClick={handleCheckout}
        disabled={loading || !paddle}
        className={`w-full py-3 px-6 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
          targetPlan === 'PREMIUM'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400'
            : 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black disabled:from-slate-500 disabled:to-slate-600'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            {targetPlan === 'PREMIUM' ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <Star className="w-5 h-5" />
            )}
            {targetPlanConfig.ctaLabel}
          </>
        )}
      </button>
      {!paddle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
          Loading payment system...
        </p>
      )}
    </div>
  );
}
