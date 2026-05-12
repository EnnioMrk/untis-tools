import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
        where: { userId: session.user.id },
    });

    return NextResponse.json({
        useShortSubjectNames: settings?.useShortSubjectNames ?? true,
        showOnlyUnexcusedAbsences: settings?.showOnlyUnexcusedAbsences ?? false,
    });
}

export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { useShortSubjectNames, showOnlyUnexcusedAbsences } = body;

    const settings = await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        update: {
            useShortSubjectNames: useShortSubjectNames ?? undefined,
            showOnlyUnexcusedAbsences: showOnlyUnexcusedAbsences ?? undefined,
        },
        create: {
            userId: session.user.id,
            useShortSubjectNames: useShortSubjectNames ?? true,
            showOnlyUnexcusedAbsences: showOnlyUnexcusedAbsences ?? false,
        },
    });

    return NextResponse.json(settings);
}