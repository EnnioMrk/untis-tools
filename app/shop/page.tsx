import Link from "next/link";
import { redirect } from "next/navigation";
import { Palette, Sparkles, ShoppingBag } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SHOP_THEMES, formatEuroCents, getShopTheme } from "@/lib/shop";
import {
    ActivateThemeButton,
    BuyThemeButton,
} from "@/components/shop/shop-buttons";
import {
    ensureActiveSubscriptionAccess,
    formatPlanSource,
} from "@/lib/subscription";

export default async function ShopPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    await ensureActiveSubscriptionAccess(session.user.id);

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            plan: true,
            planSource: true,
            isAdmin: true,
            activeTheme: true,
            themePurchases: {
                select: {
                    theme: true,
                },
            },
        },
    });

    const activeTheme = getShopTheme(user?.activeTheme);
    const ownedThemes = new Set([
        "DEFAULT",
        ...(user?.themePurchases.map((purchase) => purchase.theme) || []),
    ]);

    return (
        <div className={`min-h-screen px-4 py-10 ${activeTheme.pageClass}`}>
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
                <section
                    className={`overflow-hidden rounded-3xl border p-8 shadow-xl backdrop-blur ${activeTheme.headerClass}`}
                >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">
                                <ShoppingBag className="h-4 w-4" />
                                Shop
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900">
                                Theme-Shop
                            </h1>
                            <p className="mt-3 text-lg text-slate-600">
                                Premium-Dashboard-Themes direkt kaufen.
                                Abonnements werden im{" "}
                                <Link
                                    href="/premium"
                                    className="font-semibold text-blue-700 hover:text-blue-800"
                                >
                                    Abrechnungsbereich
                                </Link>
                                verwaltet.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                                <span
                                    className={`rounded-full px-3 py-1 shadow-sm ${activeTheme.badgeClass}`}
                                >
                                    Aktives Theme:{" "}
                                    <strong>{activeTheme.name}</strong>
                                </span>
                                <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm">
                                    Plan source:{" "}
                                    <strong>
                                        {formatPlanSource(
                                            user?.planSource || "NONE",
                                        )}
                                    </strong>
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                    <Sparkles className="h-4 w-4" />
                                    Owned themes
                                </div>
                                <div className="mt-3 text-4xl font-bold text-slate-900">
                                    {ownedThemes.size}
                                </div>
                                <p className="mt-2 text-sm text-slate-500">
                                    Käufe bleiben an Ihrem Konto hängen und
                                    können jederzeit aktiviert werden.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-lg">
                    <div className="mb-6 flex items-center gap-3">
                        <Palette className="h-6 w-6 text-violet-600" />
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                Theme-Galerie
                            </h2>
                            <p className="text-slate-600">
                                Schalten Sie ein Theme frei, das Ihnen gefällt,
                                und wenden Sie es sofort auf die Dashboard-Shell an.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {SHOP_THEMES.map((theme) => {
                            const owned = ownedThemes.has(theme.id);
                            const isActive = activeTheme.id === theme.id;

                            return (
                                <article
                                    key={theme.id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                                >
                                    <div
                                        className={`h-36 rounded-2xl bg-gradient-to-br ${theme.previewClass}`}
                                    />
                                    <div className="mt-5 flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {theme.name}
                                            </h3>
                                            <p className="mt-2 text-sm text-slate-600">
                                                {theme.description}
                                            </p>
                                        </div>
                                        {isActive && (
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.badgeClass}`}
                                            >
                                                Aktiv
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="text-sm text-slate-500">
                                            Preis
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-slate-900">
                                            {theme.priceEuroCents === 0
                                                ? "Enthalten"
                                                : formatEuroCents(
                                                      theme.priceEuroCents,
                                                  )}
                                        </div>
                                    </div>

                                    {owned ? (
                                        <ActivateThemeButton
                                            className="mt-5"
                                            themeId={theme.id}
                                            active={isActive}
                                        />
                                    ) : (
                                        <BuyThemeButton
                                            className="mt-5"
                                            themeId={theme.id}
                                        />
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
