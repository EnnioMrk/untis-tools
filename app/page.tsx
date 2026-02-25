import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  // If not logged in, redirect to signin
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check if user has an Untis connection
  const untisConnection = await prisma.untisConnection.findUnique({
    where: { userId: session.user.id },
  });

  // If logged in but no Untis connection, redirect to onboarding
  if (!untisConnection) {
    redirect("/onboarding");
  }

  // If logged in with Untis connection, redirect to dashboard
  redirect("/dashboard");
}
