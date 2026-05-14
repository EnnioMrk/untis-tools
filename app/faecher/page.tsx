import { redirect } from "next/navigation";
import { FaecherClient } from "./faecher-client";
import { FaecherHeader } from "./faecher-header";
import { getSubjectOverview, hasUntisConnection } from "./actions";
import { auth } from "@/lib/auth";
import { ensureActiveSubscriptionAccess } from "@/lib/subscription";

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

    const subjects = await getSubjectOverview();

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <FaecherHeader />
                <FaecherClient subjects={subjects} />
            </div>
        </main>
    );
}