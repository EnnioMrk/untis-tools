import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { calculateStats } from '@/worker/stats';
import type { UserStatsData } from '@/worker/types';
import { getSchoolYearStart } from '@/lib/school-year';

/**
 * Trigger an immediate sync for a specific user
 * This is called right after they connect their Untis account
 */
export async function triggerImmediateSync(userId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    console.log('[triggerImmediateSync] Function started for user:', userId);

    try {
        // Get the user's Untis connection
        const connection = await prisma.untisConnection.findUnique({
            where: { userId },
        });

        if (!connection) {
            console.error(
                '[triggerImmediateSync] No Untis connection found for user:',
                userId,
            );
            return { success: false, error: 'No Untis connection found' };
        }

        if (!connection.isActive) {
            console.error(
                '[triggerImmediateSync] Untis connection is not active for user:',
                userId,
            );
            return { success: false, error: 'Untis connection is not active' };
        }

        console.log(
            '[triggerImmediateSync] Connection found, server:',
            connection.serverUrl,
            'school:',
            connection.school,
        );

        // Import WebUntis dynamically to avoid issues
        const { WebUntisSecretAuth } = await import('webuntis');
        const { authenticator } = await import('otplib');
        console.log('[triggerImmediateSync] Imported webuntis and otplib');

        // Decrypt the secret
        const secret = decrypt(connection.secret);
        console.log('[triggerImmediateSync] Decrypted secret successfully');

        // Create Untis client
        const untis = new WebUntisSecretAuth(
            connection.school,
            connection.username,
            secret,
            connection.serverUrl,
            'UntisStats-ImmediateSync',
            authenticator,
            false,
        );

        // Login to Untis
        console.log('[triggerImmediateSync] Attempting to login to Untis...');
        await untis.login();
        console.log(
            `[triggerImmediateSync] Logged in to Untis for user ${userId}`,
        );

        // Calculate date range - use custom dataStartDate if set, otherwise use school year start
        const endDate = new Date();
        let startDate: Date;

        if (connection.dataStartDate) {
            startDate = connection.dataStartDate;
            console.log(
                '[triggerImmediateSync] Using custom dataStartDate:',
                startDate.toISOString(),
            );
        } else {
            startDate = await getSchoolYearStart();
            console.log(
                '[triggerImmediateSync] Using school year start:',
                startDate.toISOString(),
            );
        }
        console.log(
            '[triggerImmediateSync] Date range:',
            startDate.toISOString(),
            'to',
            endDate.toISOString(),
        );

        // Fetch data
        let timetable: any[] = [];
        let absences: any[] = [];

        try {
            console.log('[triggerImmediateSync] Fetching timetable...');
            timetable =
                (await untis.getOwnTimetableForRange(startDate, endDate)) || [];
            console.log(
                '[triggerImmediateSync] Fetched timetable, lessons count:',
                timetable.length,
            );
        } catch (error) {
            console.error(
                '[triggerImmediateSync] Failed to fetch timetable:',
                error,
            );
        }

        try {
            console.log('[triggerImmediateSync] Fetching absences...');
            const absenceData = await untis.getAbsentLesson(startDate, endDate);
            absences = absenceData?.absences || [];
            console.log(
                '[triggerImmediateSync] Fetched absences, count:',
                absences.length,
            );
        } catch (error) {
            console.error(
                '[triggerImmediateSync] Failed to fetch absences:',
                error,
            );
        }

        console.log(
            `[triggerImmediateSync] Fetched ${timetable.length} lessons and ${absences.length} absences`,
        );

        // Get previous stats if available
        const previousStats = await prisma.userStats.findUnique({
            where: { userId },
        });

        const previousStatsData: UserStatsData | null =
            previousStats?.subjectBreakdown as any;
        console.log(
            '[triggerImmediateSync] Previous stats:',
            previousStats ? 'exists' : 'none',
        );

        // Calculate new statistics
        const stats = calculateStats(timetable, absences, previousStatsData);
        console.log(
            '[triggerImmediateSync] Calculated stats:',
            JSON.stringify(stats.absenceCounts),
        );

        // Convert subjectBreakdown from Record to Array format
        const subjectBreakdownArray = Object.entries(
            stats.subjectBreakdown,
        ).map(([subject, data]) => ({
            subject,
            total: data.total,
            attended: data.attended,
            absences: data.absences,
            cancelled: data.cancelled,
            absenceRate: data.absenceRate,
        }));

        // Convert dailyTrend to array if needed
        const dailyTrendArray = Array.isArray(stats.dailyTrend)
            ? stats.dailyTrend
            : [];

        console.log('[triggerImmediateSync] Saving stats to database...');
        await prisma.userStats.upsert({
            where: { userId },
            create: {
                userId,
                absences7Days: stats.absenceCounts.last7Days,
                absences14Days: stats.absenceCounts.last14Days,
                absences30Days: stats.absenceCounts.last30Days,
                absencesAllTime: stats.absenceCounts.allTime,
                trend7Days: stats.trendChanges as any,
                trend14Days: stats.trendChanges as any,
                trend30Days: stats.trendChanges as any,
                subjectBreakdown: subjectBreakdownArray as any,
                dailyTrend: dailyTrendArray as any,
                lastCalculated: new Date(),
            },
            update: {
                absences7Days: stats.absenceCounts.last7Days,
                absences14Days: stats.absenceCounts.last14Days,
                absences30Days: stats.absenceCounts.last30Days,
                absencesAllTime: stats.absenceCounts.allTime,
                trend7Days: stats.trendChanges as any,
                trend14Days: stats.trendChanges as any,
                trend30Days: stats.trendChanges as any,
                subjectBreakdown: subjectBreakdownArray as any,
                dailyTrend: dailyTrendArray as any,
                lastCalculated: new Date(),
            },
        });
        console.log('[triggerImmediateSync] Stats saved to database');

        // Update lastSyncAt on the connection
        await prisma.untisConnection.update({
            where: { userId },
            data: { lastSyncAt: new Date() },
        });

        // Logout
        try {
            await untis.logout();
        } catch {
            // Ignore logout errors
        }

        console.log(
            `[triggerImmediateSync] Successfully synced user ${userId}`,
        );
        return { success: true };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        console.error(
            `[triggerImmediateSync] Failed to sync user ${userId}:`,
            error,
        );
        return { success: false, error: errorMessage };
    }
}
