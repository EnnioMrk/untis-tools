import type { 
  UserStatsData, 
  ProcessedLesson, 
  AbsenceCounts, 
  TrendChanges,
  SubjectStats,
  DailyTrendPoint,
  TrendData
} from './types';

/**
 * Convert a date number (YYYYMMDD) to an ISO date string (YYYY-MM-DD)
 */
export function formatUntisDate(dateNumber: number): string {
  const dateStr = dateNumber.toString();
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * Increment a Untis date number (YYYYMMDD) by one day
 */
function incrementUntisDate(dateNum: number): number {
  const dateStr = dateNum.toString().padStart(8, '0');
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6));
  const day = parseInt(dateStr.slice(6, 8));
  
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  
  return parseInt(`${newYear}${newMonth}${newDay}`);
}

/**
 * Calculate how many lesson periods a lesson spans (assuming 45 min lessons)
 */
function calculateLessonTimes(start: number, end: number): number {
  const startStr = start.toString().padStart(4, '0');
  const endStr = end.toString().padStart(4, '0');
  
  const hourDiff = parseInt(endStr.slice(0, 2)) - parseInt(startStr.slice(0, 2));
  const minuteDiff = parseInt(endStr.slice(2, 4)) - parseInt(startStr.slice(2, 4));
  const duration = hourDiff * 60 + minuteDiff;
  const lessonTimes = (duration - (duration % 45)) / 45;
  
  // Subtract break if lesson spans lunch break (before 11:30 to after 13:00)
  if (parseInt(startStr) <= 915 && parseInt(endStr) >= 1130) {
    return Math.max(0, lessonTimes - 1);
  }
  
  return lessonTimes;
}

/**
 * Process timetable and absence data into a unified format
 * Properly expands multi-day absences and matches them to lessons by time overlap
 */
export function processLessonData(
  timetable: any[],
  absences: any[]
): ProcessedLesson[] {
  // Build a timetable keyed by date for efficient lookup
  const timetableByDate = new Map<string, typeof timetable>();
  
  for (const lesson of timetable) {
    if (!lesson.date) continue;
    
    const dateStr = formatUntisDate(lesson.date);
    if (!timetableByDate.has(dateStr)) {
      timetableByDate.set(dateStr, []);
    }
    timetableByDate.get(dateStr)!.push(lesson);
  }
  
  // Expand absences to individual days with time ranges
  const absencesByDate = new Map<string, Array<{
    startTime: number;
    endTime: number;
    absence: any;
  }>>();
  
  for (const absence of absences) {
    // Get start and end dates - handle both single-day and multi-day absences
    const startDate = absence.startDate;
    const endDate = absence.endDate || absence.startDate;
    
    if (!startDate) {
      console.warn('[processLessonData] Skipping absence without startDate:', absence);
      continue;
    }
    
    // Expand the date range to individual days
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateStr = formatUntisDate(currentDate);
      
      if (!absencesByDate.has(dateStr)) {
        absencesByDate.set(dateStr, []);
      }
      
      // Set appropriate time ranges based on position in absence period
      let startTime: number, endTime: number;
      
      if (currentDate === startDate && currentDate === endDate) {
        // Single day absence - use exact times from absence
        startTime = absence.startTime || 0;
        endTime = absence.endTime || 2359;
      } else if (currentDate === startDate) {
        // First day of multi-day absence
        startTime = absence.startTime || 0;
        endTime = 2359; // Until end of day
      } else if (currentDate === endDate) {
        // Last day of multi-day absence
        startTime = 0; // From start of day
        endTime = absence.endTime || 2359;
      } else {
        // Middle day - full day absence
        startTime = 0;
        endTime = 2359;
      }
      
      absencesByDate.get(dateStr)!.push({
        startTime,
        endTime,
        absence,
      });
      
      // Move to next day
      currentDate = incrementUntisDate(currentDate);
    }
  }
  
  const processed: ProcessedLesson[] = [];
  
  for (const lesson of timetable) {
    if (!lesson.date) continue;
    
    const dateStr = formatUntisDate(lesson.date);
    const subject = lesson.su?.[0]?.name || lesson.su?.[0]?.longName || 'Unknown';
    const isCancelled = lesson.code === 'cancelled';
    
    // Check if this lesson has an absence on this date
    const dayAbsences = absencesByDate.get(dateStr);
    let isAbsent = false;
    
    if (dayAbsences && !isCancelled) {
      const lessonStart = lesson.startTime || 0;
      const lessonEnd = lesson.endTime || 2359;
      
      for (const dayAbsence of dayAbsences) {
        // Check if lesson times overlap with absence times
        const hasOverlap = lessonStart < dayAbsence.endTime && lessonEnd > dayAbsence.startTime;
        
        if (hasOverlap) {
          isAbsent = true;
          break;
        }
      }
    }
    
    processed.push({
      date: dateStr,
      subject,
      isCancelled,
      isAbsent,
    });
  }
  
  return processed;
}

/**
 * Calculate absence counts for different time windows
 */
export function calculateAbsenceCounts(
  lessons: ProcessedLesson[],
  previousStats?: UserStatsData | null
): AbsenceCounts {
  const now = new Date();
  
  const countAbsences = (days: number): number => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    
    return lessons.filter(l => {
      const lessonDate = new Date(l.date);
      return lessonDate >= cutoff && l.isAbsent;
    }).length;
  };
  
  const last7Days = countAbsences(7);
  const last14Days = countAbsences(14);
  const last30Days = countAbsences(30);
  
  // Count total absences from all available lessons (not limited by time window)
  const totalAbsences = lessons.filter(l => l.isAbsent).length;
  
  // For all time, use the best available data:
  // 1. If we have previous stats with valid allTime, accumulate incrementally
  // 2. Otherwise, use total absences from available data
  // 3. At minimum, use the 30-day count
  let allTime: number;
  const prevAllTime = previousStats?.absenceCounts?.allTime;
  const prevLast30 = previousStats?.absenceCounts?.last30Days;
  
  if (typeof prevAllTime === 'number' && prevAllTime > 0) {
    // Accumulate from previous stats
    const newAbsences = typeof prevLast30 === 'number' 
      ? Math.max(0, last30Days - prevLast30)
      : last30Days;
    allTime = prevAllTime + newAbsences;
  } else if (totalAbsences > 0) {
    // Use total absences from current data as baseline
    allTime = totalAbsences;
  } else {
    // Fall back to 30-day count
    allTime = last30Days;
  }
  
  return {
    last7Days,
    last14Days,
    last30Days,
    allTime: Math.max(0, allTime),
  };
}

/**
 * Calculate trend changes as percentages with full TrendData
 */
export function calculateTrendChanges(
  lessons: ProcessedLesson[],
  previousStats?: UserStatsData | null
): { last7Days: TrendData; last14Days: TrendData; last30Days: TrendData } {
  const now = new Date();
  
  const countAbsencesInRange = (startDaysAgo: number, endDaysAgo: number): number => {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startDaysAgo);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - endDaysAgo);
    endDate.setHours(23, 59, 59, 999);
    
    return lessons.filter(l => {
      const lessonDate = new Date(l.date);
      return lessonDate >= endDate && lessonDate <= startDate && l.isAbsent;
    }).length;
  };
  
  // Current periods
  const current7Days = countAbsencesInRange(0, 7);
  const current14Days = countAbsencesInRange(0, 14);
  const current30Days = countAbsencesInRange(0, 30);
  
  // Previous periods
  const previous7Days = countAbsencesInRange(8, 14);
  const previous14Days = countAbsencesInRange(15, 28);
  const previous30Days = countAbsencesInRange(31, 60);
  
  const calculateTrendData = (current: number, previous: number): TrendData => {
    const changePercent = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (changePercent > 0) direction = 'up';
    else if (changePercent < 0) direction = 'down';
    
    return {
      previousValue: previous,
      changePercent,
      direction,
    };
  };
  
  return {
    last7Days: calculateTrendData(current7Days, previous7Days),
    last14Days: calculateTrendData(current14Days, previous14Days),
    last30Days: calculateTrendData(current30Days, previous30Days),
  };
}

/**
 * Calculate per-subject breakdown
 */
export function calculateSubjectBreakdown(
  lessons: ProcessedLesson[]
): Record<string, SubjectStats> {
  const subjectMap = new Map<string, { attended: number; absences: number; cancelled: number; total: number }>();
  
  for (const lesson of lessons) {
    const subject = lesson.subject;
    
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { attended: 0, absences: 0, cancelled: 0, total: 0 });
    }
    
    const stats = subjectMap.get(subject)!;
    stats.total++;
    
    if (lesson.isCancelled) {
      stats.cancelled++;
    } else if (lesson.isAbsent) {
      stats.absences++;
    } else {
      stats.attended++;
    }
  }
  
  const result: Record<string, SubjectStats> = {};
  
  for (const [subject, stats] of subjectMap) {
    const totalLessons = stats.total - stats.cancelled;
    const absenceRate = totalLessons > 0 
      ? Math.round((stats.absences / totalLessons) * 100 * 100) / 100 
      : 0;
    
    result[subject] = {
      ...stats,
      absenceRate,
    };
  }
  
  return result;
}

/**
 * Calculate daily trend for the past 30 days
 */
export function calculateDailyTrend(
  lessons: ProcessedLesson[]
): DailyTrendPoint[] {
  const dailyData = new Map<string, { total: number; absences: number }>();
  
  // Initialize all days in the past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData.set(dateStr, { total: 0, absences: 0 });
  }
  
  // Count lessons and absences per day
  for (const lesson of lessons) {
    if (!dailyData.has(lesson.date)) continue;
    
    const stats = dailyData.get(lesson.date)!;
    if (!lesson.isCancelled) {
      stats.total++;
      if (lesson.isAbsent) {
        stats.absences++;
      }
    }
  }
  
  // Convert to array and calculate rates
  const trend: DailyTrendPoint[] = [];
  const sortedDates = Array.from(dailyData.keys()).sort();
  
  for (const date of sortedDates) {
    const stats = dailyData.get(date)!;
    const absenceRate = stats.total > 0 
      ? Math.round((stats.absences / stats.total) * 100 * 100) / 100 
      : 0;
    
    trend.push({
      date,
      absenceRate,
      totalLessons: stats.total,
      absences: stats.absences,
    });
  }
  
  return trend;
}

/**
 * Calculate all statistics from timetable and absence data
 */
export function calculateStats(
  timetable: any[],
  absences: any[],
  previousStats?: UserStatsData | null
): UserStatsData {
  const processedLessons = processLessonData(timetable, absences);
  
  return {
    absenceCounts: calculateAbsenceCounts(processedLessons, previousStats),
    trendChanges: calculateTrendChanges(processedLessons, previousStats),
    subjectBreakdown: calculateSubjectBreakdown(processedLessons),
    dailyTrend: calculateDailyTrend(processedLessons),
    lastUpdated: new Date().toISOString(),
  };
}
