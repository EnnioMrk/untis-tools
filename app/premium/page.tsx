import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Clock3, Gift, ShieldAlert, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAvailablePlans, type AppPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { PlanButton } from "@/components/premium/premium-button";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { ReferralCodeCard } from "@/components/premium/referral-code-card";
import {
    formatPlanName,
    formatPlanSource,
    getUserAccessState,
} from "@/lib/subscription";

function formatDate(value: Date | null) {
    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export default async function PremiumPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            plan: true,
            planSource: true,
            trialEndsAt: true,
            accessEndsAt: true,
            referralBonusMonths: true,
            ownedReferralCode: {
                select: {
                    code: true,
                },
            },
            redeemedReferral: {
                select: {
                    code: {
                        select: {
                            code: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        redirect("/auth/signin");
    }

    const accessState = getUserAccessState({
        id: user.id,
        plan: user.plan,
        planSource: user.planSource,
        isAdmin: false,
        trialEndsAt: user.trialEndsAt,
        accessEndsAt: user.accessEndsAt,
        referralBonusMonths: user.referralBonusMonths,
    });
    const currentPlan = user.plan as AppPlan;
    const effectivePlan = accessState.effectivePlan as AppPlan;
    const plans = getAvailablePlans();
    const comparisonRows = [
        { name: "Dashboard Widgets", key: "dashboardWidgets" },
        { name: "Widget Types", key: "widgetTypes" },
        { name: "Themes", key: "themes" },
        { name: "Statistics Range", key: "statisticsRange" },
        { name: "Data Export", key: "dataExport" },
        { name: "Priority Support", key: "prioritySupport" },
        { name: "Early Access", key: "earlyAccess" },
    ] as const;

    const statusText = accessState.trialActive
        ? `Premium trial active until ${formatDate(user.trialEndsAt)}`
        : accessState.bonusActive
          ? `Bonus month active until ${formatDate(user.accessEndsAt)}`
          : accessState.hasAccess
            ? `${formatPlanName(currentPlan)} subscription active`
            : "No active subscription";

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-900">
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
                <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                <Sparkles className="h-4 w-4" />
                                Subscriptions
                            </div>
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                                Choose your plan
                            </h1>
                            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                                UntisStats is a subscription product with three
                                paid tiers: Basic, Standard, and Premium.
                                Referral signups receive one free Premium month
                                before a subscription is required.
                            </p>
                        </div>

                        {!accessState.hasAccess && (
                            <Link
                                href="/premium/trial-ended"
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-slate-900"
                            >
                                View renewal prompt
                            </Link>
                        )}
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Sparkles className="h-4 w-4" />
                            Effective access
                        </div>
                        <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                            {formatPlanName(effectivePlan)}
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {statusText}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Clock3 className="h-4 w-4" />
                            Billing source
                        </div>
                        <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                            {formatPlanSource(user.planSource)}
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Selected tier:{" "}
                            <strong>{formatPlanName(currentPlan)}</strong>
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Gift className="h-4 w-4" />
                            Referral bonuses
                        </div>
                        <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                            {user.referralBonusMonths}
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Queued bonus months unlock after your current paid
                            billing cycle ends.
                        </p>
                    </div>
                </section>

                {!accessState.hasAccess && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                            <div>
                                <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                                    Subscription required
                                </h2>
                                <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                                    Your trial or bonus access is no longer
                                    active. Choose a plan below to continue
                                    using the app.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                <section className="grid gap-8 md:grid-cols-3">
                    {plans.map((plan) => (
                        <article
                            key={plan.id}
                            className={`relative rounded-2xl p-8 shadow-lg ${
                                plan.highlight === "premium"
                                    ? "border-2 border-blue-500 bg-white dark:bg-gray-800"
                                    : plan.highlight === "popular"
                                      ? "border-2 border-slate-900 bg-white dark:border-white dark:bg-gray-800"
                                      : "border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                            }`}
                        >
                            {plan.highlight === "premium" && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <PremiumBadge />
                                </div>
                            )}
                            {plan.highlight === "popular" && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900">
                                    Most Popular
                                </div>
                            )}

                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {plan.name}
                            </h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                {plan.description}
                            </p>
                            <div className="mt-6">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                    {plan.monthlyPriceLabel}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    /month
                                </span>
                            </div>
                            <ul className="mt-6 space-y-3">
                                {plan.featureList.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3"
                                    >
                                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <PlanButton
                                className="mt-8"
                                currentPlan={currentPlan}
                                targetPlan={plan.id}
                                planSource={user.planSource}
                                hasActiveAccess={accessState.hasAccess}
                            />
                        </article>
                    ))}
                </section>

                <ReferralCodeCard
                    initialCode={user.ownedReferralCode?.code || null}
                    referredByCode={user.redeemedReferral?.code.code || null}
                    bonusMonths={user.referralBonusMonths}
                />

                <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Feature comparison
                    </h2>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full min-w-180">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Feature
                                    </th>
                                    {plans.map((plan) => (
                                        <th
                                            key={plan.id}
                                            className="px-4 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >
                                            {plan.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonRows.map((row) => (
                                    <tr
                                        key={row.key}
                                        className="border-b border-gray-100 dark:border-gray-700/60"
                                    >
                                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                                            {row.name}
                                        </td>
                                        {plans.map((plan) => (
                                            <td
                                                key={plan.id}
                                                className={`px-4 py-4 text-center text-sm ${
                                                    plan.id === "PREMIUM"
                                                        ? "font-medium text-blue-600 dark:text-blue-400"
                                                        : "text-gray-500 dark:text-gray-400"
                                                }`}
                                            >
                                                {plan.comparison[row.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
