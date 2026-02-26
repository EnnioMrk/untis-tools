/**
 * TypeScript interfaces for the worker statistics data structures
 */

/**
 * Trend data with full information
 */
export interface TrendData {
  /** Previous period value */
  previousValue: number;
  /** Percentage change */
  changePercent: number | null;
  /** Direction of change */
  direction: 'up' | 'down' | 'neutral';
}

/**
 * Subject-level statistics
 */
export interface SubjectStats {
  /** Number of lessons attended */
  attended: number;
  /** Number of lessons absent */
  absences: number;
  /** Number of lessons cancelled by school */
  cancelled: number;
  /** Total number of lessons */
  total: number;
  /** Absence rate as percentage (0-100) */
  absenceRate: number;
}

/**
 * Absence counts for different time windows
 */
export interface AbsenceCounts {
  /** Total absences in the last 7 days */
  last7Days: number;
  /** Total absences in the last 14 days */
  last14Days: number;
  /** Total absences in the last 30 days */
  last30Days: number;
  /** Total absences all time */
  allTime: number;
}

/**
 * Trend changes as percentage compared to previous periods
 */
export interface TrendChanges {
  /** Percentage change in last 7 days vs previous 7 days */
  last7Days: TrendData;
  /** Percentage change in last 14 days vs previous 14 days */
  last14Days: TrendData;
  /** Percentage change in last 30 days vs previous 30 days */
  last30Days: TrendData;
}

/**
 * Daily trend data point
 */
export interface DailyTrendPoint {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Absence rate for this day (0-100) */
  absenceRate: number;
  /** Total lessons for this day */
  totalLessons: number;
  /** Number of absences for this day */
  absences: number;
}

/**
 * Complete user statistics data structure
 * This is stored as JSON in the UserStats table
 */
export interface UserStatsData {
  /** Absence counts for different time windows */
  absenceCounts: AbsenceCounts;
  /** Trend changes as percentages */
  trendChanges: TrendChanges;
  /** Per-subject breakdown of attendance/absence */
  subjectBreakdown: Record<string, SubjectStats>;
  /** Daily absence rates for the past 30 days */
  dailyTrend: DailyTrendPoint[];
  /** ISO timestamp when stats were last calculated */
  lastUpdated: string;
  /** Overall absence rate (0-100) */
  absenceRate: number;
  /** Total number of real lessons (not cancelled) */
  totalRealLessons: number;
  /** Total number of absences */
  totalAbsences: number;
}

/**
 * A lesson from the Untis timetable
 */
export interface UntisLesson {
  /** Lesson ID */
  id: number;
  /** Date of the lesson (YYYYMMDD format) */
  date: number;
  /** Start time (minutes from midnight) */
  startTime: number;
  /** End time (minutes from midnight) */
  endTime: number;
  /** Subject information */
  su?: { id: number; name: string; longName: string }[];
  /** Teacher information */
  te?: { id: number; name: string; longName: string }[];
  /** Room information */
  ro?: { id: number; name: string; longName: string }[];
  /** Class information */
  kl?: { id: number; name: string; longName: string }[];
  /** Lesson code (cancelled, irregular, etc.) */
  code?: 'cancelled' | 'irregular';
  /** Additional information */
  lstext?: string;
  /** Substitution text */
  substText?: string;
}

/**
 * An absence record from Untis
 */
export interface UntisAbsence {
  /** Absence ID */
  id: number;
  /** Date of absence (YYYYMMDD format) */
  date: number;
  /** Start time (minutes from midnight) */
  startTime: number;
  /** End time (minutes from midnight) */
  endTime: number;
  /** Whether the absence is excused */
  isExcused?: boolean;
  /** Absence reason */
  reason?: string;
  /** Subject information */
  subject?: string;
  /** Lesson ID this absence relates to */
  lessonId?: number;
}

/**
 * Processed lesson data for statistics calculation
 */
export interface ProcessedLesson {
  /** Date as ISO string */
  date: string;
  /** Subject name */
  subject: string;
  /** Whether the lesson was cancelled */
  isCancelled: boolean;
  /** Whether the student was absent */
  isAbsent: boolean;
}

/**
 * Result of syncing a single user
 */
export interface SyncResult {
  /** User ID */
  userId: string;
  /** Whether the sync was successful */
  success: boolean;
  /** Error message if sync failed */
  error?: string;
  /** Time taken to sync in milliseconds */
  duration?: number;
}
