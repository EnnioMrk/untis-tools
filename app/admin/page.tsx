import { redirect } from "next/navigation";
import { Shield, TicketPercent, Users, Crown, Gift, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureAdminAccess } from "@/lib/subscription";
import { refreshGrants } from "@/lib/access-engine";
import { DeleteForm, CancelGrantForm, UpdateReferralCodeForm } from "./delete-form";
import {
    createAdminReferralCode,
    createCouponCode,
    deleteReferralCode,
    deleteCouponCode,
    toggleUserAdmin,
    updateUserSubscription,
    cancelAccessGrant,
    simulateNextDay,
    updateReferralCode,
} from "./actions";
import type { AccessGrant, GrantType } from "@prisma/client";

function formatPlanName(plan: string): string {
    if (plan === "PREMIUM") return "Premium";
    if (plan === "STANDARD") return "Standard";
    return "Basic";
}

function formatGrantType(type: GrantType): string {
    switch (type) {
        case "SUBSCRIPTION": return "Subscription";
        case "TRIAL": return "Trial";
        case "REFERRAL": return "Referral Bonus";
        case "COUPON": return "Coupon Bonus";
        case "ADMIN": return "Admin Grant";
        default: return type;
    }
}

function timeUntil(date: Date | null): string {
    if (!date) return "—";
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    
    if (months >= 1) {
        const remainingDays = days % 30;
        return `${months}mo ${remainingDays}d`;
    }
    return `${days}d`;
}

function hasExpiredTrialGrant(grants: AccessGrant[]): boolean {
    return grants.some(g => g.type === "TRIAL" && g.status === "EXPIRED");
}

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    await ensureAdminAccess(session.user.id);

    const usersRaw = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            isAdmin: true,
            ownedReferralCode: {
                select: {
                    code: true,
                },
            },
        },
    });

    const users = await Promise.all(usersRaw.map(async (user) => {
        const access = await refreshGrants(user.id);
        const grants = await prisma.accessGrant.findMany({
            where: { userId: user.id, status: { not: "EXPIRED" } },
            orderBy: [
                { type: "asc" },
                { createdAt: "desc" },
            ],
        });
        
        // Group grants by type for summary
        const subscriptionGrants = grants.filter(g => g.type === "SUBSCRIPTION" && g.status === "ACTIVE");
        const trialGrants = grants.filter(g => g.type === "TRIAL");
        const bonusGrants = grants.filter(g => ["REFERRAL", "COUPON", "ADMIN"].includes(g.type));
        
        // Calculate next billing date (subscription expiry + bonus extensions)
        const subExpiry = subscriptionGrants.length > 0 
            ? subscriptionGrants.reduce((max, g) => g.expiresAt && (!max || g.expiresAt > max) ? g.expiresAt : max, null as Date | null)
            : null;
        
        // Bonus extends the subscription timeline
        const nextBilling = subExpiry && access.expiresAt && access.expiresAt > subExpiry ? access.expiresAt : subExpiry;
        
        // Fetch referral code sources for referral grants
        const referralCodeEntries = await Promise.all(
            bonusGrants
                .filter(g => g.type === "REFERRAL" && g.sourceUserId)
                .map(async (g) => {
                    const redemption = await prisma.referralRedemption.findFirst({
                        where: { referredUserId: g.sourceUserId ?? undefined },
                        select: { code: { select: { code: true } } },
                    });
                    return [g.id, redemption?.code.code ?? null] as const;
                })
        );
        
        return {
            ...user,
            accessSource: access.source,
            hasAccess: access.hasAccess,
            expiresAt: access.expiresAt,
            effectivePlan: access.effectivePlan,
            grants,
            subscriptionGrants,
            trialGrants,
            bonusGrants,
            nextBilling,
            hadTrial: hasExpiredTrialGrant(grants),
            referralCodeMap: Object.fromEntries(referralCodeEntries) as Record<string, string | null>,
        };
    }));

    const [referralCodes, couponCodes] = await Promise.all([
        prisma.referralCode.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                code: true,
                label: true,
                isActive: true,
                maxRedemptions: true,
                owner: {
                    select: {
                        email: true,
                    },
                },
                _count: {
                    select: {
                        redemptions: true,
                    },
                },
            },
        }),
        prisma.couponCode.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                code: true,
                description: true,
                discountPercent: true,
                freeMonths: true,
                isActive: true,
            },
        }),
    ]);

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <Shield className="h-7 w-7 text-blue-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                Administration
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Benutzer verwalten, Empfehlungs-Codes erstellen und Abonnement-Operationen unter Kontrolle halten.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-amber-600" />
                            <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                Debug: Zeitsimulation
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            Tagesschritte simulieren, um Abonnementablauf, Bonusgewährung
                            und Erneuerszenarien zu testieren. Verschiebt Ablaufdaten
                            näher an die Gegenwart, um den Zugriffzyklus zu testen.
                        </p>
                        <form action={simulateNextDay} className="mt-3 flex items-center gap-2">
                            <input
                                type="number"
                                name="days"
                                min={1}
                                max={365}
                                defaultValue={1}
                                className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
                            >
                                Simuliere +Tag(e)
                            </button>
                        </form>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-5 flex items-center gap-3">
                            <Users className="h-5 w-5 text-violet-600" />
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Empfehlungs-Code erstellen
                            </h2>
                        </div>
                        <form
                            action={createAdminReferralCode}
                            className="space-y-4"
                        >
                            <input
                                type="text"
                                name="code"
                                placeholder="Optional custom code"
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                            <input
                                type="text"
                                name="label"
                                placeholder="Bezeichnung"
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                            <input
                                type="number"
                                name="maxRedemptions"
                                min={1}
                                placeholder="Maximale Einlösungen (optional)"
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                            <button className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700">
                                Empfehlungs-Code erstellen
                            </button>
                        </form>
                    </article>

                    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-5 flex items-center gap-3">
                            <TicketPercent className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Gutschein-Code erstellen
                            </h2>
                        </div>
                        <form action={createCouponCode} className="space-y-4">
                            <input
                                type="text"
                                name="code"
                                placeholder="Optional custom code"
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                            <input
                                type="text"
                                name="description"
                                placeholder="Beschreibung"
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <input
                                    type="number"
                                    name="discountPercent"
                                    min={0}
                                    max={100}
                                    placeholder="Rabatt %"
                                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                />
                                <input
                                    type="number"
                                    name="freeMonths"
                                    min={0}
                                    max={24}
                                    placeholder="Kostenlose Monate"
                                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                />
                            </div>
                            <button className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                                Gutschein-Code erstellen
                            </button>
                        </form>
                    </article>
                </section>

                <section>
                    <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
                        Benutzer
                    </h2>
                    <div className="space-y-4">
                        {users.map((user) => {
                            const activeTrial = user.trialGrants.find(g => g.status === "ACTIVE");
                            
                            return (
                                <div
                                    key={user.id}
                                    className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex-1">
                                            <div className="mb-4 flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                            {user.name || "Unnamed user"}
                                                        </h3>
                                                        {user.isAdmin && (
                                                            <Crown className="h-5 w-5 text-amber-500" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                    user.hasAccess
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                }`}>
                                                    {user.hasAccess ? "Active" : "Inactive"}
                                                </span>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950/50">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <Crown className="h-4 w-4" />
                                                        <span className="text-xs font-medium uppercase">Plan</span>
                                                    </div>
                                                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                                                        {formatPlanName(user.effectivePlan)}
                                                    </div>
                                                </div>

                                                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950/50">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <Calendar className="h-4 w-4" />
                                                        <span className="text-xs font-medium uppercase">Nächste Abrechnung</span>
                                                    </div>
                                                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                                        {user.nextBilling 
                                                            ? new Date(user.nextBilling).toLocaleDateString()
                                                            : "—"}
                                                    </div>
                                                </div>

                                                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950/50">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <Clock className="h-4 w-4" />
                                                        <span className="text-xs font-medium uppercase">Verbleibende Zeit</span>
                                                    </div>
                                                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                                        {timeUntil(user.expiresAt)}
                                                    </div>
                                                </div>
                                            </div>

                                            {(user.trialGrants.length > 0 || user.bonusGrants.length > 0) && (
                                                <div className="mt-4 space-y-3">
                                                    {activeTrial && (
                                                        <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-blue-900 dark:text-blue-200">
                                                                    Aktiver Test
                                                                </div>
                                                                <div className="text-xs text-blue-700 dark:text-slate-400">
                                                                    {timeUntil(activeTrial.expiresAt)} verbleibend
                                                                </div>
                                                            </div>
                                                            <CancelGrantForm
                                                                action={cancelAccessGrant}
                                                                grantId={activeTrial.id}
                                                                message="Diesen Test abbrechen?"
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    {user.hadTrial && !activeTrial && (
                                                        <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                                                            <XCircle className="h-5 w-5 text-slate-500" />
                                                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                                                Test genutzt
                                                            </div>
                                                        </div>
                                                    )}

                                                    {user.bonusGrants.length > 0 && (
                                                        <div className="space-y-2">
                                                            <div className="text-xs font-medium text-slate-600 uppercase dark:text-slate-400">
                                                                Bonusmonate
                                                            </div>
                                                            {user.bonusGrants.map((grant) => {
                                                                const sourceInfo = grant.type === "REFERRAL" 
                                                                    ? `from ${user.referralCodeMap?.[grant.id] ?? "referral"}`
                                                                    : grant.type === "ADMIN" 
                                                                    ? "admin granted"
                                                                    : "coupon";
                                                                return (
                                                                    <div key={grant.id} className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <Gift className="h-4 w-4 text-emerald-600" />
                                                                                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                                                                                    {formatGrantType(grant.type)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-1 text-xs text-emerald-700 dark:text-slate-400">
                                                                                {grant.months} month{grant.months !== 1 ? "s" : ""} · {sourceInfo}
                                                                            </div>
                                                                            <div className="text-xs text-emerald-600">
                                                                                {timeUntil(grant.expiresAt)}
                                                                            </div>
                                                                        </div>
                                                                        <CancelGrantForm
                                                                            action={cancelAccessGrant}
                                                                            grantId={grant.id}
                                                                            message={`Cancel this ${formatGrantType(grant.type).toLowerCase()}?`}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
</div>

                                        <div className="flex flex-col gap-2 lg:w-64">
                                            <form action={toggleUserAdmin} className="w-full">
                                                <input type="hidden" name="userId" value={user.id} />
                                                <input type="hidden" name="nextValue" value={String(!user.isAdmin)} />
                                                <button className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                                    {user.isAdmin ? "Admin entfernen" : "Zum Admin machen"}
                                                </button>
                                            </form>

                                            <form action={updateUserSubscription} className="flex gap-2">
                                                <input type="hidden" name="userId" value={user.id} />
                                                <select
                                                    name="plan"
                                                    defaultValue={user.plan}
                                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                >
                                                    <option value="PREMIUM">Premium</option>
                                                    <option value="STANDARD">Standard</option>
                                                    <option value="BASIC">Basic</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    name="months"
                                                    min={1}
                                                    max={24}
                                                    defaultValue={1}
                                                    className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                />
                                                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-black dark:bg-white dark:text-slate-900">
                                                    Gewähren
                                                </button>
</form>

                                             <div className="text-xs text-slate-500">
                                                 Referral: {user.ownedReferralCode?.code || "—"}
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            Referral codes
                        </h2>
<div className="mt-5 space-y-3">
                            {referralCodes.map((code) => (
                                <div
                                    key={code.id}
                                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {code.code}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UpdateReferralCodeForm
                                                action={updateReferralCode}
                                                codeId={code.id}
                                                currentLabel={code.label || ""}
                                                currentMaxRedemptions={code.maxRedemptions ?? undefined}
                                            />
                                            <DeleteForm
                                                action={deleteReferralCode}
                                                id={code.id}
                                                message="Delete this referral code? This action cannot be undone."
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                        {code.label || "No label"} ·{" "}
                                        {code._count.redemptions} redemption(s)
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                        Owner:{" "}
                                        {code.owner?.email || "Admin managed"}
                                        {code.maxRedemptions
                                            ? ` · max ${code.maxRedemptions}`
                                            : ""}
                                        {code.isActive
                                            ? " · active"
                                            : " · inactive"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            Coupon codes
                        </h2>
                        <div className="mt-5 space-y-3">
                            {couponCodes.map((code) => (
                                <div
                                    key={code.id}
                                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                                >
<div className="flex items-start justify-between gap-4">
                                            <div className="font-semibold text-slate-900 dark:text-white">
                                                {code.code}
                                            </div>
                                            <DeleteForm
                                                action={deleteCouponCode}
                                                id={code.id}
                                                message="Delete this coupon code? This action cannot be undone."
                                            />
                                        </div>
                                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                        {code.description || "No description"}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                        {code.discountPercent
                                            ? `${code.discountPercent}% off`
                                            : "No percentage discount"}
                                        {` · ${code.freeMonths} free month(s)`}
                                        {code.isActive
                                            ? " · active"
                                            : " · inactive"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>
            </div>
        </div>
    );
}
