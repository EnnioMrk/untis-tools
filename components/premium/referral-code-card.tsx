'use client';

import { useState, useTransition } from 'react';
import { Copy, Gift, Loader2, Sparkles } from 'lucide-react';
import { createPersonalReferralCode } from '@/app/premium/actions';

interface ReferralCodeCardProps {
  initialCode: string | null;
  referredByCode: string | null;
  bonusMonths: number;
}

export function ReferralCodeCard({
  initialCode,
  referredByCode,
  bonusMonths,
}: ReferralCodeCardProps) {
  const [code, setCode] = useState(initialCode);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await createPersonalReferralCode();

      if (!result.success) {
        setMessage(result.error || 'Failed to create referral code.');
        return;
      }

      setCode(result.code || null);
      setMessage('Referral code ready.');
    });
  };

  const handleCopy = async () => {
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setMessage('Referral code copied.');
    } catch {
      setMessage('Copy failed.');
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <Gift className="h-4 w-4" />
            Referrals
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invite friends</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Friends who sign up with your referral code get their first month as Premium for free.
            After they convert to a paid subscription, you earn one bonus month for your current plan.
          </p>
          {referredByCode && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              You joined with referral code <span className="font-semibold text-gray-900 dark:text-white">{referredByCode}</span>.
            </p>
          )}
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Bonus months queued: <span className="font-semibold text-gray-900 dark:text-white">{bonusMonths}</span>
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-500/30 dark:bg-violet-500/10">
          {code ? (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
                Your referral code
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-lg font-semibold text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white">
                <span>{code}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isPending ? 'Creating...' : 'Create referral code'}
            </button>
          )}

          {message && <p className="mt-3 text-sm text-violet-700 dark:text-violet-300">{message}</p>}
        </div>
      </div>
    </section>
  );
}
