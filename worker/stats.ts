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
  lessons: ProcessedLesson[]
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
  
  return {
    last7Days,
    last14Days,
    last30Days,
    allTime: Math.max(0, totalAbsences),
  };
}

/**
 * Calculate trend changes as percentages with full TrendData
 */
export function calculateTrendChanges(
  lessons: ProcessedLesson[]
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
 * Returns cumulative absence rate: total absences up to each day / total real lessons up to each day
 * Real lessons = total lessons - cancelled lessons
 * Includes all historical data from the start, not just the past 30 days
 */
export function calculateDailyTrend(
  lessons: ProcessedLesson[]
): DailyTrendPoint[] {
  // Group all lessons by date
  const allDailyData = new Map<string, { total: number; absences: number; cancelled: number }>();
  
  // Process all lessons to build daily data
  for (const lesson of lessons) {
    if (!allDailyData.has(lesson.date)) {
      allDailyData.set(lesson.date, { total: 0, absences: 0, cancelled: 0 });
    }
    
    const stats = allDailyData.get(lesson.date)!;
    if (lesson.isCancelled) {
      stats.cancelled++;
    } else {
      stats.total++;
      if (lesson.isAbsent) {
        stats.absences++;
      }
    }
  }
  
  // Get all unique dates and sort them
  const allDates = Array.from(allDailyData.keys()).sort();
  
  if (allDates.length === 0) {
    // No data - return empty 30-day array
    const emptyTrend: DailyTrendPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      emptyTrend.push({
        date: dateStr,
        absenceRate: 0,
        totalLessons: 0,
        absences: 0,
      });
    }
    return emptyTrend;
  }
  
  // Calculate cumulative values starting from the earliest date
  const trend: DailyTrendPoint[] = [];
  let cumulativeAbsences = 0;
  let cumulativeRealLessons = 0;
  
  // Find the earliest date in the data
  const earliestDate = allDates[0];
  const earliestDateObj = new Date(earliestDate);
  
  // Create a map of all dates from earliest to now for cumulative calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const cumulativeData = new Map<string, { cumulativeAbsences: number; cumulativeRealLessons: number }>();
  
  // Iterate through all dates in order and build cumulative data
  for (const date of allDates) {
    const stats = allDailyData.get(date)!;
    cumulativeAbsences += stats.absences;
    cumulativeRealLessons += stats.total;
    
    cumulativeData.set(date, {
      cumulativeAbsences,
      cumulativeRealLessons,
    });
  }
  
  // Now generate the last 30 days with cumulative values
  // If we have data before 30 days ago, that data is included in the cumulative totals
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // If we have data for this date, use cumulative values up to this date
    // Otherwise, use the last known cumulative values (or 0 if no data at all)
    const dateData = cumulativeData.get(dateStr);
    
    if (dateData) {
      const absenceRate = dateData.cumulativeRealLessons > 0
        ? Math.round((dateData.cumulativeAbsences / dateData.cumulativeRealLessons) * 100 * 100) / 100
        : 0;
      
      trend.push({
        date: dateStr,
        absenceRate,
        totalLessons: dateData.cumulativeRealLessons,
        absences: dateData.cumulativeAbsences,
      });
    } else if (trend.length > 0) {
      // No data for this date - carry forward the last known cumulative values
      const lastKnown = trend[trend.length - 1];
      trend.push({
        date: dateStr,
        absenceRate: lastKnown.absenceRate,
        totalLessons: lastKnown.totalLessons,
        absences: lastKnown.absences,
      });
    } else {
      // No data at all yet
      trend.push({
        date: dateStr,
        absenceRate: 0,
        totalLessons: 0,
        absences: 0,
      });
    }
  }
  
  return trend;
}

/**
 * Calculate all statistics from timetable and absence data
 */
export function calculateStats(
  timetable: any[],
  absences: any[]
): UserStatsData {
  const processedLessons = processLessonData(timetable, absences);
  
  // Calculate absenceCounts
  const absenceCounts = calculateAbsenceCounts(processedLessons);
  
  // Calculate total real lessons from processed lessons
  // Note: totalRealLessons is calculated fresh as we don't accumulate lesson counts
  const totalRealLessons = processedLessons.filter(l => !l.isCancelled).length;
  
  // FIX: Use absenceCounts.allTime for totalAbsences to match the database field
  // This calculates total absences from all time
  const totalAbsences = absenceCounts.allTime;
  
  const absenceRate = totalRealLessons > 0 
    ? Math.round((totalAbsences / totalRealLessons) * 100 * 100) / 100 
    : 0;
  
  return {
    absenceCounts,
    trendChanges: calculateTrendChanges(processedLessons),
    subjectBreakdown: calculateSubjectBreakdown(processedLessons),
    dailyTrend: calculateDailyTrend(processedLessons),
    lastUpdated: new Date().toISOString(),
    absenceRate,
    totalRealLessons,
    totalAbsences,
  };
}

