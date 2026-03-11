import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    const untisConnection = await prisma.untisConnection.findUnique({
        where: { userId: session.user.id },
    });

    if (untisConnection) {
        redirect("/dashboard");
    }

    return <OnboardingClient />;
}
