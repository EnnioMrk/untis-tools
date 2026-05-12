import { redirect } from "next/navigation";
import { FaecherClient } from "./faecher-client";
import { getSubjectOverview, hasUntisConnection } from "./actions";
import { auth } from "@/lib/auth";
import { ensureActiveSubscriptionAccess } from "@/lib/subscription";
import { getShopTheme } from "@/lib/shop";
import { getUserTheme } from "./actions";
import { FaecherHeader } from "./faecher-header";

export const dynamic = "force-dynamic";

export default async function FaecherPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    await ensureActiveSubscriptionAccess(session.user.id);

    const hasConnection = await hasUntisConnection();
    if (!hasConnection) {
        redirect("/onboarding");
    }

    const [subjects, activeTheme] = await Promise.all([
        getSubjectOverview(),
        getUserTheme(session.user.id),
    ]);

    const themeConfig = getShopTheme(activeTheme);

    return (
        <main className={`min-h-screen ${themeConfig.pageClass}`}>
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <FaecherHeader activeTheme={activeTheme} />
                <FaecherClient subjects={subjects} />
            </div>
        </main>
    );
}