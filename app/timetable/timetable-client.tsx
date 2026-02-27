'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { UntisLesson, UntisAbsence } from '@/worker/types';

interface TimetableClientProps {
    initialLessons: UntisLesson[];
    initialAbsences: UntisAbsence[];
    weekStart: string; // YYYY-MM-DD format
}

/**
 * Convert YYYYMMDD to Date object
 */
function parseDate(dateNum: number): Date {
    const dateStr = dateNum.toString();
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return new Date(year, month, day);
}

/**
 * Convert Date to YYYYMMDD format
 */
function formatDateNum(date: Date): number {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return parseInt(`${year}${month}${day}`, 10);
}

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
 * Get dates for a week starting from Monday
 */
function getWeekDates(weekStart: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        dates.push(date);
    }
    return dates;
}

/**
 * Format time from minutes from midnight (e.g., 800 = 08:00)
 */
function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get unique time slots from lessons
 */
function getTimeSlots(lessons: UntisLesson[]): number[] {
    const slots = new Set<number>();
    lessons.forEach((lesson) => {
        slots.add(lesson.startTime);
    });
    return Array.from(slots).sort((a, b) => a - b);
}

/**
 * Check if a lesson matches an absence
 */
function lessonMatchesAbsence(
    lesson: UntisLesson,
    absences: UntisAbsence[],
): boolean {
    return absences.some((absence) => {
        // Match by lesson ID if available
        if (lesson.id === absence.lessonId) {
            return true;
        }
        // Otherwise match by date and time range
        if (lesson.date === absence.date) {
            return (
                lesson.startTime === absence.startTime &&
                lesson.endTime === absence.endTime
            );
        }
        return false;
    });
}

export function TimetableClient({
    initialLessons,
    initialAbsences,
    weekStart,
}: TimetableClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Parse the initial week start
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const date = new Date(weekStart);
        // Handle timezone issues by setting to midnight local time
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    });

    // Calculate week dates
    const weekDates = useMemo(
        () => getWeekDates(currentWeekStart),
        [currentWeekStart],
    );

    // Get unique time slots for this week's lessons
    const timeSlots = useMemo(() => {
        const weekDateNums = new Set(weekDates.map((d) => formatDateNum(d)));
        const weekLessons = initialLessons.filter((l) =>
            weekDateNums.has(l.date),
        );
        return getTimeSlots(weekLessons);
    }, [initialLessons, weekDates]);

    // Group lessons by day and time slot
    const lessonsByDayAndTime = useMemo(() => {
        const map = new Map<string, UntisLesson[]>();
        const weekDateNums = new Set(weekDates.map((d) => formatDateNum(d)));

        initialLessons
            .filter((l) => weekDateNums.has(l.date))
            .forEach((lesson) => {
                const key = `${lesson.date}-${lesson.startTime}`;
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key)!.push(lesson);
            });

        return map;
    }, [initialLessons, weekDates]);

    // Format the week range display
    const weekRangeDisplay = useMemo(() => {
        const start = weekDates[0];
        const end = weekDates[6];
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        };

        if (start.getMonth() === end.getMonth()) {
            // Same month: "24 Feb - 2 Mar 2025"
            return `${start.getDate()} - ${end.toLocaleDateString('en-GB', options)}`;
        } else {
            // Different months
            return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-GB', options)}`;
        }
    }, [weekDates]);

    // Navigate to previous week
    const goToPreviousWeek = () => {
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(newWeekStart.getDate() - 7);
        setCurrentWeekStart(newWeekStart);

        // Update URL with new week
        const params = new URLSearchParams(searchParams);
        params.set('week', newWeekStart.toISOString().split('T')[0]);
        router.push(`/timetable?${params.toString()}`);
    };

    // Navigate to next week
    const goToNextWeek = () => {
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(newWeekStart.getDate() + 7);
        setCurrentWeekStart(newWeekStart);

        // Update URL with new week
        const params = new URLSearchParams(searchParams);
        params.set('week', newWeekStart.toISOString().split('T')[0]);
        router.push(`/timetable?${params.toString()}`);
    };

    // Go to current week
    const goToCurrentWeek = () => {
        const today = new Date();
        const newWeekStart = getWeekStart(today);
        setCurrentWeekStart(newWeekStart);

        const params = new URLSearchParams(searchParams);
        params.set('week', newWeekStart.toISOString().split('T')[0]);
        router.push(`/timetable?${params.toString()}`);
    };

    // Day names
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Get lesson card styling based on status
    const getLessonCardClass = (lesson: UntisLesson): string => {
        if (lesson.code === 'cancelled') {
            return 'bg-gray-200 text-gray-500 line-through';
        }
        if (lesson.code === 'irregular') {
            return 'bg-yellow-100 border-l-4 border-yellow-400';
        }
        if (lessonMatchesAbsence(lesson, initialAbsences)) {
            return 'bg-red-100 border-l-4 border-red-400';
        }
        return 'bg-white border border-gray-200';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with week navigation */}
            <div className="bg-white border-b border-gray-200 px-4 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={goToPreviousWeek}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Previous week"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>

                        <div className="text-center min-w-[200px]">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {weekRangeDisplay}
                            </h2>
                            <button
                                onClick={goToCurrentWeek}
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                Today
                            </button>
                        </div>

                        <button
                            onClick={goToNextWeek}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Next week"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Timetable grid */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
                        <div className="p-3 text-sm font-medium text-gray-500 text-center border-r border-gray-200">
                            Time
                        </div>
                        {weekDates.map((date, index) => {
                            const isToday =
                                date.toDateString() ===
                                new Date().toDateString();
                            return (
                                <div
                                    key={index}
                                    className={`p-3 text-sm font-medium text-center border-r border-gray-200 last:border-r-0 ${
                                        isToday
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700'
                                    }`}
                                >
                                    <div>{dayNames[index]}</div>
                                    <div
                                        className={`text-lg ${isToday ? 'text-blue-700' : ''}`}
                                    >
                                        {date.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time slots and lessons */}
                    {timeSlots.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <p>No lessons scheduled for this week</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {timeSlots.map((startTime) => (
                                <div
                                    key={startTime}
                                    className="grid grid-cols-8"
                                >
                                    {/* Time column */}
                                    <div className="p-3 text-sm text-gray-500 text-center border-r border-gray-200 bg-gray-50">
                                        {formatTime(startTime)}
                                    </div>

                                    {/* Day columns */}
                                    {weekDates.map((date, dayIndex) => {
                                        const dateNum = formatDateNum(date);
                                        const key = `${dateNum}-${startTime}`;
                                        const lessons =
                                            lessonsByDayAndTime.get(key) || [];

                                        return (
                                            <div
                                                key={dayIndex}
                                                className="p-2 border-r border-gray-200 last:border-r-0 min-h-[80px]"
                                            >
                                                {lessons.map(
                                                    (lesson, lessonIndex) => (
                                                        <div
                                                            key={`${lesson.id}-${lessonIndex}`}
                                                            className={`p-2 rounded mb-1 last:mb-0 text-xs ${getLessonCardClass(lesson)}`}
                                                        >
                                                            {/* Subject */}
                                                            <div className="font-semibold text-gray-900">
                                                                {lesson.su?.[0]
                                                                    ?.longName ||
                                                                    lesson
                                                                        .su?.[0]
                                                                        ?.name ||
                                                                    'Unknown'}
                                                            </div>

                                                            {/* Room */}
                                                            {lesson.ro?.[0] && (
                                                                <div className="text-gray-600 mt-1">
                                                                    📍{' '}
                                                                    {
                                                                        lesson
                                                                            .ro[0]
                                                                            .name
                                                                    }
                                                                </div>
                                                            )}

                                                            {/* Teacher */}
                                                            {lesson.te?.[0] && (
                                                                <div className="text-gray-600">
                                                                    👤{' '}
                                                                    {
                                                                        lesson
                                                                            .te[0]
                                                                            .name
                                                                    }
                                                                </div>
                                                            )}

                                                            {/* Substitution text for irregular lessons */}
                                                            {lesson.substText && (
                                                                <div className="text-orange-600 mt-1 font-medium">
                                                                    →{' '}
                                                                    {
                                                                        lesson.substText
                                                                    }
                                                                </div>
                                                            )}

                                                            {/* Additional info */}
                                                            {lesson.lstext && (
                                                                <div className="text-gray-500 mt-1 italic">
                                                                    {
                                                                        lesson.lstext
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                        <span className="text-gray-600">Regular Lesson</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        <span className="text-gray-600">Cancelled</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-400 rounded"></div>
                        <span className="text-gray-600">
                            Changed (Irregular)
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border-l-4 border-red-400 rounded"></div>
                        <span className="text-gray-600">Absent</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
