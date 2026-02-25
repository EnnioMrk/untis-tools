'use client';

import { useState, useEffect, useCallback } from 'react';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { openCheckout } from '@/app/premium/actions';
import { Sparkles, Crown, Loader2 } from 'lucide-react';

interface PremiumButtonProps {
  isPremium: boolean;
  className?: string;
}

export function PremiumButton({ isPremium, className = '' }: PremiumButtonProps) {
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const result = await openCheckout();

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
  }, [paddle]);

  if (isPremium) {
    return (
      <button
        disabled
        className={`w-full py-3 px-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 ${className}`}
      >
        <Crown className="w-5 h-5" />
        Premium Active
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
        className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Go Premium
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
