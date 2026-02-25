import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PremiumButton } from '@/components/premium/premium-button';
import { PremiumBadge } from '@/components/premium/premium-badge';
import { Check, X, Sparkles } from 'lucide-react';

export default async function PremiumPage() {
  const session = await auth();

  // If not logged in, redirect to signin
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get user's current plan
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      paddleCustomerId: true,
      paddleSubscriptionId: true,
    },
  });

  const isPremium = user?.plan === 'PREMIUM';

  const freeFeatures = [
    { text: 'Up to 5 widgets', included: true },
    { text: 'Basic themes', included: true },
    { text: '7-day statistics', included: true },
    { text: 'Absence tracking', included: true },
    { text: 'Premium widgets', included: false },
    { text: 'Unlimited widgets', included: false },
    { text: 'Premium themes', included: false },
    { text: 'Priority support', included: false },
  ];

  const premiumFeatures = [
    { text: 'Unlimited widgets', included: true },
    { text: 'All premium widgets', included: true },
    { text: 'Premium themes', included: true },
    { text: 'Priority support', included: true },
    { text: 'Advanced analytics', included: true },
    { text: 'Custom widget layouts', included: true },
    { text: 'Export data', included: true },
    { text: 'Early access to new features', included: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Go Premium
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unlock the full potential of UntisStats with unlimited widgets, premium themes, and priority support.
          </p>
        </div>

        {/* Current Status */}
        {isPremium && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <p className="text-green-700 dark:text-green-400 font-medium">
              🎉 You are already a Premium member! Enjoy all the premium features.
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Free Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Free
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Perfect for getting started
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">€0</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-3">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span
                    className={
                      feature.included
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500'
                    }
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border-2 border-blue-500 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <PremiumBadge />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Premium
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              For power users
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">€4.99</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
            <PremiumButton isPremium={isPremium} />
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-700 dark:text-gray-300 font-medium">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-gray-700 dark:text-gray-300 font-medium">
                    Free
                  </th>
                  <th className="text-center py-4 px-4 text-gray-700 dark:text-gray-300 font-medium">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Dashboard Widgets', free: '5 max', premium: 'Unlimited' },
                  { name: 'Widget Types', free: 'Basic', premium: 'All + Premium' },
                  { name: 'Themes', free: 'Basic', premium: 'All + Premium' },
                  { name: 'Statistics Range', free: '7 days', premium: 'Unlimited' },
                  { name: 'Data Export', free: 'No', premium: 'Yes' },
                  { name: 'Priority Support', free: 'No', premium: 'Yes' },
                  { name: 'Early Access', free: 'No', premium: 'Yes' },
                ].map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-700/50"
                  >
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                      {row.name}
                    </td>
                    <td className="text-center py-4 px-4 text-gray-500 dark:text-gray-400">
                      {row.free}
                    </td>
                    <td className="text-center py-4 px-4 text-blue-600 dark:text-blue-400 font-medium">
                      {row.premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes, you can cancel your subscription at any time. Your premium access will continue until the end of your billing period.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                What payment methods are accepted?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We accept all major credit cards, PayPal, and other payment methods through Paddle, our secure payment processor.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We offer a 7-day money-back guarantee. If you&apos;re not satisfied, contact us for a full refund.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                How do I get support?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Premium users get priority support with faster response times. Free users can still reach us through our community channels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
