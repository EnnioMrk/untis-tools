'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { formatUntisDate } from '@/worker/stats';
import { getSchoolYearStart } from '@/lib/school-year';

/**
 * Raw Untis data for development/testing purposes
 */
export interface RawUntisData {
  lessons: Array<{
    id: number;
    date: string;
    dateRaw: number;
    startTime: string;
    endTime: string;
    subject: string | null;
    subjectLongName: string | null;
    teachers: string[];
    rooms: string[];
    classes: string[];
    code: string | null;
    text: string | null;
    substText: string | null;
  }>;
  absences: Array<{
    id: number;
    date: string;
    dateRaw: number;
    startTime: string;
    endTime: string;
    isExcused: boolean;
    reason: string | null;
    subject: string | null;
    lessonId: number | null;
  }>;
  lastSyncAt: string | null;
}

/**
 * Filter options for Untis data
 */
export interface UntisDataFilter {
  startDate: string;
  endDate: string;
}

/**
 * Get raw Untis data (lessons and absences) for the current user
 * This is a development/testing endpoint that shows all raw data
 */
export async function getRawUntisData(
  filter?: UntisDataFilter
): Promise<RawUntisData | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // Get the user's Untis connection
  const connection = await prisma.untisConnection.findUnique({
    where: { userId: session.user.id },
  });

  if (!connection) {
    return null;
  }

  // Determine date range - use school year start for full year data
  const endDate = filter?.endDate ? new Date(filter.endDate) : new Date();
  const startDate = filter?.startDate 
    ? new Date(filter.startDate) 
    : await getSchoolYearStart();

  console.log('[getRawUntisData] Fetching data from', startDate, 'to', endDate);

  try {
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
      'UntisStats-DevTools',
      authenticator,
      false
    );

    // Login to Untis
    await untis.login();

    // Fetch timetable
    const timetable = await untis.getOwnTimetableForRange(startDate, endDate) || [];
    
    // Fetch absences
    const absenceData = await untis.getAbsentLesson(startDate, endDate);
    const absences = absenceData?.absences || [];

    // Logout
    try {
      await untis.logout();
    } catch {
      // Ignore logout errors
    }

    // Process lessons
    const processedLessons = timetable.map((lesson: any) => {
      const startTimeStr = lesson.startTime?.toString().padStart(4, '0') || '0000';
      const endTimeStr = lesson.endTime?.toString().padStart(4, '0') || '0000';
      
      return {
        id: lesson.id,
        date: formatUntisDate(lesson.date),
        dateRaw: lesson.date,
        startTime: `${startTimeStr.slice(0, 2)}:${startTimeStr.slice(2)}`,
        endTime: `${endTimeStr.slice(0, 2)}:${endTimeStr.slice(2)}`,
        subject: lesson.su?.[0]?.name || null,
        subjectLongName: lesson.su?.[0]?.longName || null,
        teachers: lesson.te?.map((t: any) => t.name) || [],
        rooms: lesson.ro?.map((r: any) => r.name) || [],
        classes: lesson.kl?.map((k: any) => k.name) || [],
        code: lesson.code || null,
        text: lesson.lstext || null,
        substText: lesson.substText || null,
      };
    });

    // Process absences
    const processedAbsences = absences.map((absence: any) => {
      const startTimeStr = absence.startTime?.toString().padStart(4, '0') || '0000';
      const endTimeStr = absence.endTime?.toString().padStart(4, '0') || '2359';
      
      return {
        id: absence.id,
        date: formatUntisDate(absence.startDate),
        dateRaw: absence.startDate,
        startTime: `${startTimeStr.slice(0, 2)}:${startTimeStr.slice(2)}`,
        endTime: `${endTimeStr.slice(0, 2)}:${endTimeStr.slice(2)}`,
        isExcused: absence.isExcused || false,
        reason: absence.reason || null,
        subject: absence.subject || null,
        lessonId: absence.lessonId || null,
      };
    });

    return {
      lessons: processedLessons,
      absences: processedAbsences,
      lastSyncAt: connection.lastSyncAt?.toISOString() || null,
    };
  } catch (error) {
    console.error('[getRawUntisData] Failed to fetch data:', error);
    return null;
  }
}

/**
 * Get stored user stats (the processed data)
 */
export async function getStoredUserStats() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userStats = await prisma.userStats.findUnique({
    where: { userId: session.user.id },
  });

  if (!userStats) {
    return null;
  }

  return {
    absences7Days: userStats.absences7Days,
    absences14Days: userStats.absences14Days,
    absences30Days: userStats.absences30Days,
    totalAbsences: userStats.totalAbsences,
    subjectBreakdown: userStats.subjectBreakdown,
    dailyTrend: userStats.dailyTrend,
    lastCalculated: userStats.lastCalculated,
  };
}
