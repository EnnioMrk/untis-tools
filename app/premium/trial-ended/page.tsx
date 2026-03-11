import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Check, Crown, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAvailablePlans, type AppPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { PlanButton } from "@/components/premium/premium-button";

export default async function TrialEndedPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            plan: true,
            planSource: true,
        },
    });

    const currentPlan = (user?.plan || "BASIC") as AppPlan;
    const plans = getAvailablePlans();

    return (
        <div className="min-h-screen bg-slate-950 px-4 py-12 text-white">
            <div className="mx-auto flex max-w-5xl flex-col gap-8">
                <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 shadow-2xl">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                                <AlertTriangle className="h-4 w-4" />
                                Trial ended
                            </div>
                            <h1 className="text-4xl font-bold">
                                Your free Premium month has ended
                            </h1>
                            <p className="mt-3 text-lg text-slate-300">
                                To continue using UntisStats, choose a
                                subscription. All plans are paid subscriptions,
                                and access resumes immediately after checkout.
                            </p>
                        </div>
                        <Link
                            href="/auth/signin"
                            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                        >
                            Switch account
                        </Link>
                    </div>
                </section>

                <section className="grid gap-6 md:grid-cols-3">
                    {plans.map((plan) => (
                        <article
                            key={plan.id}
                            className={`rounded-3xl border p-7 shadow-xl ${
                                plan.highlight === "premium"
                                    ? "border-violet-500 bg-violet-500/10"
                                    : plan.highlight === "popular"
                                      ? "border-cyan-400/40 bg-cyan-400/10"
                                      : "border-white/10 bg-white/5"
                            }`}
                        >
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold">
                                        {plan.name}
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-300">
                                        {plan.description}
                                    </p>
                                </div>
                                {plan.highlight === "premium" ? (
                                    <Crown className="h-6 w-6 text-amber-300" />
                                ) : plan.highlight === "popular" ? (
                                    <Sparkles className="h-6 w-6 text-cyan-300" />
                                ) : null}
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-bold">
                                    {plan.monthlyPriceLabel}
                                </span>
                                <span className="ml-1 text-slate-300">
                                    /month
                                </span>
                            </div>

                            <ul className="mb-8 space-y-3 text-sm text-slate-200">
                                {plan.featureList.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-3"
                                    >
                                        <Check className="mt-0.5 h-4 w-4 text-emerald-300" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <PlanButton
                                currentPlan={currentPlan}
                                targetPlan={plan.id}
                                planSource={user?.planSource || "NONE"}
                                hasActiveAccess={false}
                            />
                        </article>
                    ))}
                </section>
            </div>
        </div>
    );
}
