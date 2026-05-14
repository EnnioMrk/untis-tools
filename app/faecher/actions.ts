"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSubjectDisplayName, SUBJECT_NAME_MAP } from "@/lib/subject";

export interface SubjectOverviewItem {
    id: string;
    subject: string;
    shortName: string;
    realName: string;
    total: number;
    attended: number;
    absences: number;
    cancelled: number;
    realLessons: number;
    teacherKuerzel?: string;
    teacherName?: string;
    absenceRate: number;
}

export async function hasUntisConnection(): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id) {
        return false;
    }

    const connection = await prisma.untisConnection.findUnique({
        where: { userId: session.user.id },
    });

    return !!connection?.isActive;
}

/**
 * Convert Untis teacher name to Kuerzel format (e.g., "Mustermann, Max" -> "MM")
 */
function getKuerzel(name: string): string {
    const parts = name.split(",");
    if (parts.length >= 2) {
        const lastName = parts[0]?.trim() || "";
        const firstName = parts[1]?.trim() || "";
        const lastInitial = lastName.charAt(0).toUpperCase();
        const firstInitial = firstName.charAt(0).toUpperCase();
        return `${lastInitial}${firstInitial}`;
    }
    return name.substring(0, 2).toUpperCase();
}

export async function getSubjectOverview(): Promise<SubjectOverviewItem[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const userStats = await prisma.userStats.findUnique({
        where: { userId: session.user.id },
    });

    if (!userStats?.subjectBreakdown) {
        return [];
    }

    const breakdown = userStats.subjectBreakdown as Record<
        string,
        {
            total?: number;
            attended?: number;
            absences?: number;
            cancelled?: number;
            absenceRate?: number;
            teacherName?: string;
            teacherKuerzel?: string;
            subjectName?: string;
            subject?: string;
        }
    >;

    const items: SubjectOverviewItem[] = [];

    for (const [subjectId, data] of Object.entries(breakdown)) {
        // Handle legacy format where key is numeric ("0", "1") and subject is in data.subject
        // vs new format where key is the subject ID (e.g., "E5.3-Ma1" or "sub-123")
        let actualSubjectId: string;
        
        if (/^\d+$/.test(subjectId) && data.subject) {
            // Legacy format: key is "0", "1", etc., subject ID is in data.subject
            actualSubjectId = data.subject;
        } else {
            // New format: key is the subject ID
            actualSubjectId = subjectId;
        }
        
        // Extract short name from subjectId using the format function
        const shortName = formatSubjectDisplayName(actualSubjectId);
        const lowerShortName = shortName.toLowerCase();
        
        // Determine the real name: prefer subjectName from data, then lookup in map
        let realName = data.subjectName;
        if (!realName) {
            // Try to map the short name to a full name
            realName = SUBJECT_NAME_MAP[lowerShortName];
            if (!realName) {
                // If subjectId looks like a group format (E5.3-Ma1), extract the short name
                if (actualSubjectId.startsWith("sub-")) {
                    // Numeric ID - show as Fach with number
                    realName = `Fach ${actualSubjectId.replace("sub-", "")}`;
                } else if (/^\d+$/.test(actualSubjectId)) {
                    realName = `Fach ${actualSubjectId}`;
                } else {
                    // Use the formatted short name as the display name
                    realName = shortName;
                }
            }
        }
        
        items.push({
            id: actualSubjectId,
            subject: realName,
            shortName: shortName,
            realName: realName,
            total: data.total || 0,
            attended: data.attended || 0,
            absences: data.absences || 0,
            cancelled: data.cancelled || 0,
            realLessons: (data.total || 0) - (data.cancelled || 0),
            absenceRate: data.absenceRate || 0,
            teacherKuerzel: data.teacherKuerzel || (data.teacherName ? getKuerzel(data.teacherName) : undefined),
            teacherName: data.teacherName,
        });
    }

    return items;
}