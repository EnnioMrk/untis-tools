import { redirect } from "next/navigation";
import { type AppPlan } from "@/lib/plans";
import { getShopTheme } from "@/lib/shop";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import {
    getUserStatsNoCache,
    getUserWidgets,
    hasUntisConnection,
    getUserPlan,
    getUserTheme,
    getDataStartDate,
    getPresetDateOptions,
} from "./actions";
import { auth } from "@/lib/auth";
import { ensureActiveSubscriptionAccess } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    await ensureActiveSubscriptionAccess(session.user.id);

    // Check if user has an Untis connection
    const hasConnection = await hasUntisConnection();
    if (!hasConnection) {
        redirect("/onboarding");
    }

    // Fetch user data in parallel
    const [stats, widgets, plan, activeTheme, dataStartDate, presetDates] =
        await Promise.all([
            getUserStatsNoCache(),
            getUserWidgets(),
            getUserPlan(),
            getUserTheme(),
            getDataStartDate(),
            getPresetDateOptions(),
        ]);

    const themeConfig = getShopTheme(activeTheme);

    return (
        <main className={`min-h-screen ${themeConfig.pageClass}`}>
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <DashboardClient
                    initialWidgets={widgets}
                    initialStats={stats}
                    userPlan={plan as AppPlan}
                    activeTheme={activeTheme}
                    isAdmin={Boolean(session.user.isAdmin)}
                    initialDate={dataStartDate.date}
                    isCustom={dataStartDate.isCustom}
                    presetDates={presetDates}
                />
            </div>
        </main>
    );
}
