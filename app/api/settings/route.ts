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
         theme: {
             theme: settings?.themeMode ?? "system",
             baseColor: settings?.baseColor ?? "slate",
             backgroundColor: settings?.backgroundColor ?? "neutral",
             chartColor: settings?.chartColor ?? "default",
             radius: settings?.radius ?? 0.5,
             headingFont: settings?.headingFont ?? "Geist_Sans",
             bodyFont: settings?.bodyFont ?? "Geist_Sans",
             borderShadowMode: settings?.borderShadowMode ?? "both",
         },
     });
}

export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
        useShortSubjectNames,
        showOnlyUnexcusedAbsences,
        theme,
    } = body;

    // Build update object
    const updateData: any = {};
    if (useShortSubjectNames !== undefined) updateData.useShortSubjectNames = useShortSubjectNames;
    if (showOnlyUnexcusedAbsences !== undefined) updateData.showOnlyUnexcusedAbsences = showOnlyUnexcusedAbsences;

     // Handle theme updates
     if (theme) {
         if (theme.theme !== undefined) updateData.themeMode = theme.theme;
         if (theme.baseColor !== undefined) updateData.baseColor = theme.baseColor;
         if (theme.backgroundColor !== undefined) updateData.backgroundColor = theme.backgroundColor;
         if (theme.chartColor !== undefined) updateData.chartColor = theme.chartColor;
         if (theme.radius !== undefined) updateData.radius = theme.radius;
         if (theme.headingFont !== undefined) updateData.headingFont = theme.headingFont;
         if (theme.bodyFont !== undefined) updateData.bodyFont = theme.bodyFont;
         if (theme.borderShadowMode !== undefined) updateData.borderShadowMode = theme.borderShadowMode;
     }

    const settings = await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        update: updateData,
         create: {
             userId: session.user.id,
             useShortSubjectNames: useShortSubjectNames ?? true,
             showOnlyUnexcusedAbsences: showOnlyUnexcusedAbsences ?? false,
             themeMode: theme?.theme ?? "system",
             baseColor: theme?.baseColor ?? "slate",
             backgroundColor: theme?.backgroundColor ?? "neutral",
             chartColor: theme?.chartColor ?? "default",
             radius: theme?.radius ?? 0.5,
             headingFont: theme?.headingFont ?? "Geist_Sans",
             bodyFont: theme?.bodyFont ?? "Geist_Sans",
             borderShadowMode: theme?.borderShadowMode ?? "both",
         },
    });

    return NextResponse.json({
        useShortSubjectNames: settings.useShortSubjectNames,
        showOnlyUnexcusedAbsences: settings.showOnlyUnexcusedAbsences,
        theme: {
            theme: settings.themeMode,
            baseColor: settings.baseColor,
            backgroundColor: settings.backgroundColor,
            chartColor: settings.chartColor,
            radius: settings.radius,
            headingFont: settings.headingFont,
            bodyFont: settings.bodyFont,
        },
    });
}