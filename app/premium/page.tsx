import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Clock3,
    Gift,
    ShieldAlert,
    Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getAvailablePlans, type AppPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { PlanButton } from "@/components/premium/premium-button";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { ReferralCodeCard } from "@/components/premium/referral-code-card";
import { MultiPlanSelector } from "@/components/premium/multi-plan-selector";
import { getUserAccessState } from "@/lib/access-engine";
import { formatPlanName, formatPlanSource } from "@/lib/subscription";

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
            accessGrants: {
                where: { status: { in: ["ACTIVE", "PENDING"] } },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    months: true,
                    expiresAt: true,
                    sourceUserId: true,
                },
                orderBy: [{ status: "asc" }, { createdAt: "asc" }],
            },
        },
    });

    if (!user) {
        redirect("/auth/signin");
    }

    const accessState = await getUserAccessState(session.user.id);
    const currentPlan = user.plan as AppPlan;
    const effectivePlan = accessState.effectivePlan as AppPlan;
    const plans = getAvailablePlans();
    const comparisonRows = [
        { name: "Dashboard-Widgets", key: "dashboardWidgets" },
        { name: "Widget-Typen", key: "widgetTypes" },
        { name: "Themes", key: "themes" },
        { name: "Statistikbereich", key: "statisticsRange" },
        { name: "Datenexport", key: "dataExport" },
        { name: "Prioritäts-Support", key: "prioritySupport" },
        { name: "Frühzeitiger Zugriff", key: "earlyAccess" },
    ] as const;

    const pendingGrants = user.accessGrants.filter((g) => g.status === "PENDING");
    const statusText = accessState.hasAccess
        ? `${formatPlanName(effectivePlan)} aktiv bis ${formatDate(accessState.expiresAt)}`
        : "Kein aktives Abonnement";

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-900">
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
                {/* Header */}
                <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                <Sparkles className="h-4 w-4" />
                                Abonnements
                            </div>
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                                Wählen Sie Ihren Plan
                            </h1>
                            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                                UntisStats ist ein Abonnement-Produkt mit drei
                                kostenpflichtigen Stufen: Basic, Standard und Premium.
                                Durch Empfehlungen erhalten Sie einen kostenlosen Premium-Monat,
                                bevor ein Abonnement erforderlich ist.
                            </p>
                        </div>

                        {!accessState.hasAccess && (
                            <Link
                                href="/premium/trial-ended"
                                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-slate-900"
                            >
                                Erneuerungsaufforderung anzeigen
                            </Link>
                        )}
                    </div>
                </section>

                {/* Current Status Cards */}
                <section className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Sparkles className="h-4 w-4" />
                            Aktiver Zugriff
                        </div>
                        <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                            {formatPlanName(effectivePlan)}
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {statusText}
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Clock3 className="h-4 w-4" />
                            Abrechnungsquelle
                        </div>
                        <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                            {formatPlanSource(accessState.source)}
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Ausgewählte Stufe:{" "}
                            <strong>{formatPlanName(currentPlan)}</strong>
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Gift className="h-4 w-4" />
                            Wartende Bonusmonate
                        </div>
                        <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                            {pendingGrants.length}
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {pendingGrants.length > 0
                                ? "Nächster Monat durch Empfehlungsbonus gedeckt"
                                : "Keine Bonusmonate wartend"}
                        </p>
                    </div>
                </section>

                {/* No Access Warning */}
                {!accessState.hasAccess && (
                    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                            <div>
                                <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                                    Abonnement erforderlich
                                </h2>
                                <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                                    Ihr Testzugang oder Bonuszugang ist nicht mehr
                                    aktiv. Wählen Sie einen Plan unten, um die App
                                    weiterhin zu nutzen.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Single Plan Cards */}
                <section className="grid gap-8 md:grid-cols-3">
                    {plans.map((plan) => (
                        <article
                            key={plan.id}
                            className={`relative rounded-lg p-8 shadow-lg ${
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
                                    /Monat
                                </span>
                                {plan.yearlyPriceLabel && (
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 line-through">
                                        {plan.yearlyPriceLabel}/Monat
                                    </span>
                                )}
                            </div>
                            {plan.yearlySavings && (
                                <span className="mt-2 inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    {plan.yearlySavings}
                                </span>
                            )}

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

                {/* Multi-Plan Checkout Section */}
                <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="h-6 w-6 text-violet-500" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Mehrere Pläne zusammen kaufen
                        </h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Kaufen Sie Plätze über mehrere Stufen in einer einzigen
                        Transaktion. Ideal für Teams mit gemischten Bedürfnissen.
                    </p>

                    <MultiPlanSelector
                        currentPlan={currentPlan}
                        planSource={user.planSource}
                        hasActiveAccess={accessState.hasAccess}
                    />
                </section>

                {/* Referral */}
                <ReferralCodeCard
                    initialCode={user.ownedReferralCode?.code || null}
                    referredByCode={user.redeemedReferral?.code.code || null}
                    bonusMonths={pendingGrants.length}
                />

                {/* Feature Comparison */}
                <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Feature-Vergleich
                    </h2>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full min-w-180">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Funktion
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