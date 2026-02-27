'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import type { UntisLesson, UntisAbsence } from '@/worker/types';

/**
 * Fetch timetable data for a specific week
 */
export async function getTimetableForWeek(
    startDate: Date,
    endDate: Date,
): Promise<{
    lessons: UntisLesson[];
    absences: UntisAbsence[];
}> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Not authenticated');
    }

    // Get user's Untis connection
    const connection = await prisma.untisConnection.findUnique({
        where: { userId: session.user.id },
    });

    if (!connection || !connection.isActive) {
        throw new Error('No active Untis connection');
    }

    // Import WebUntis dynamically
    const { WebUntisSecretAuth } = await import('webuntis');
    const { authenticator } = await import('otplib');

    // Decrypt the secret
    const secret = decrypt(connection.secret);

    // Create Untis client
    const untis = new WebUntisSecretAuth(
        connection.school,
        connection.username,
        secret,
        connection.serverUrl,
        'UntisTools-Timetable',
        authenticator,
        false,
    );

    try {
        // Login to Untis
        await untis.login();

        // Fetch timetable for the date range
        const timetable =
            (await untis.getOwnTimetableForRange(startDate, endDate)) || [];

        // Fetch absences for the date range
        const absenceData = await untis.getAbsentLesson(startDate, endDate);
        const absences = absenceData?.absences || [];

        return {
            lessons: timetable as UntisLesson[],
            absences: absences as UntisAbsence[],
        };
    } finally {
        // Always logout to clean up the session
        try {
            await untis.logout();
        } catch {
            // Ignore logout errors
        }
    }
}

/**
 * Check if user has an active Untis connection
 */
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
