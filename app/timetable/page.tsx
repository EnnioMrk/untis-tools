import { redirect } from 'next/navigation';
import { TimetableClient } from './timetable-client';
import { getTimetableForWeek, hasUntisConnection } from './actions';
import { auth } from '@/lib/auth';
import type { UntisLesson, UntisAbsence } from '@/worker/types';

export const dynamic = 'force-dynamic';

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the end of the week (Sunday) for a given date
 */
function getWeekEnd(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

interface PageProps {
    searchParams: Promise<{ week?: string }>;
}

export default async function TimetablePage({ searchParams }: PageProps) {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    // Check if user has an Untis connection
    const hasConnection = await hasUntisConnection();
    if (!hasConnection) {
        redirect('/onboarding');
    }

    // Parse the week from search params
    const resolvedSearchParams = await searchParams;
    let weekStart: Date;

    if (resolvedSearchParams.week) {
        // Parse the provided week date
        const parsed = new Date(resolvedSearchParams.week);
        if (isNaN(parsed.getTime())) {
            // Invalid date, use current week
            weekStart = getWeekStart(new Date());
        } else {
            weekStart = getWeekStart(parsed);
        }
    } else {
        // Default to current week
        weekStart = getWeekStart(new Date());
    }

    const weekEnd = getWeekEnd(weekStart);

    // Fetch timetable data for the week
    let lessons: UntisLesson[] = [];
    let absences: UntisAbsence[] = [];

    try {
        const data = await getTimetableForWeek(weekStart, weekEnd);
        lessons = data.lessons;
        absences = data.absences;
    } catch (error) {
        console.error('Failed to fetch timetable:', error);
        // Show error state or empty state
    }

    // Format week start for client component
    const weekStartStr = weekStart.toISOString().split('T')[0];

    return (
        <TimetableClient
            initialLessons={lessons}
            initialAbsences={absences}
            weekStart={weekStartStr}
        />
    );
}
