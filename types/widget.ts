// Widget type enum - must match Prisma schema
export const WidgetType = {
  KPI_7DAYS: 'KPI_7DAYS',
  KPI_14DAYS: 'KPI_14DAYS',
  KPI_30DAYS: 'KPI_30DAYS',
  KPI_ALLTIME: 'KPI_ALLTIME',
  ABSENCE_BAR: 'ABSENCE_BAR',
  ABSENCE_TREND: 'ABSENCE_TREND',
  SUBJECT_BREAKDOWN: 'SUBJECT_BREAKDOWN',
  ABSENCE_RECOMMENDER: 'ABSENCE_RECOMMENDER',
} as const;

export type WidgetType = typeof WidgetType[keyof typeof WidgetType];

// Widget type definitions for display
export const WIDGET_DEFINITIONS: Record<WidgetType, {
  name: string;
  description: string;
  defaultW: number;
  defaultH: number;
  isPremium: boolean;
}> = {
  KPI_7DAYS: {
    name: '7-Day Absence KPI',
    description: 'Shows absence count for the last 7 days with trend',
    defaultW: 1,
    defaultH: 1,
    isPremium: false,
  },
  KPI_14DAYS: {
    name: '14-Day Absence KPI',
    description: 'Shows absence count for the last 14 days with trend',
    defaultW: 1,
    defaultH: 1,
    isPremium: false,
  },
  KPI_30DAYS: {
    name: '30-Day Absence KPI',
    description: 'Shows absence count for the last 30 days with trend',
    defaultW: 1,
    defaultH: 1,
    isPremium: false,
  },
  KPI_ALLTIME: {
    name: 'All-Time Absence KPI',
    description: 'Shows total absence count',
    defaultW: 1,
    defaultH: 1,
    isPremium: false,
  },
  ABSENCE_BAR: {
    name: 'Absence by Subject',
    description: 'Bar chart showing absences per subject',
    defaultW: 1,
    defaultH: 2,
    isPremium: false,
  },
  ABSENCE_TREND: {
    name: 'Absence Trend',
    description: 'Line chart showing daily absence rate over 30 days',
    defaultW: 1,
    defaultH: 2,
    isPremium: false,
  },
  SUBJECT_BREAKDOWN: {
    name: 'Subject Breakdown',
    description: 'Stacked bar chart showing attended, absent, and cancelled lessons',
    defaultW: 2,
    defaultH: 2,
    isPremium: false,
  },
  ABSENCE_RECOMMENDER: {
    name: 'Absence Recommender',
    description: 'Shows which subjects you can safely miss',
    defaultW: 2,
    defaultH: 2,
    isPremium: true,
  },
};

// Layout interface for react-grid-layout
export interface WidgetLayout {
  i: string; // widget id
  x: number; // grid position x
  y: number; // grid position y
  w: number; // width (1 or 2 columns)
  h: number; // height in grid units
}

// Widget configuration stored in database
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  layoutData: WidgetLayout;
  config?: Record<string, unknown>;
  order: number;
}

// Data structure for saving widgets
export interface WidgetData {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

// Subject breakdown data from UserStats
export interface SubjectBreakdownItem {
  subject: string;
  total: number;
  attended: number;
  absences: number;
  cancelled: number;
  absenceRate: number;
}

// Daily trend data from UserStats
export interface DailyTrendItem {
  date: string;
  absenceRate: number;
  totalLessons: number;
  absences: number;
}

// Trend data structure
export interface TrendData {
  previousValue: number;
  changePercent: number | null;
  direction: 'up' | 'down' | 'neutral';
}

// User stats response type
export interface UserStatsResponse {
  absences7Days: number;
  absences14Days: number;
  absences30Days: number;
  absencesAllTime: number;
  trend7Days: TrendData | null;
  trend14Days: TrendData | null;
  trend30Days: TrendData | null;
  subjectBreakdown: SubjectBreakdownItem[];
  dailyTrend: DailyTrendItem[];
}

// Default widgets for new users
export const DEFAULT_WIDGETS: WidgetData[] = [
  { id: 'kpi-7days', type: 'KPI_7DAYS', x: 0, y: 0, w: 1, h: 1 },
  { id: 'kpi-14days', type: 'KPI_14DAYS', x: 1, y: 0, w: 1, h: 1 },
  { id: 'kpi-30days', type: 'KPI_30DAYS', x: 0, y: 1, w: 1, h: 1 },
  { id: 'kpi-alltime', type: 'KPI_ALLTIME', x: 1, y: 1, w: 1, h: 1 },
  { id: 'absence-bar', type: 'ABSENCE_BAR', x: 0, y: 2, w: 1, h: 2 },
  { id: 'absence-trend', type: 'ABSENCE_TREND', x: 1, y: 2, w: 1, h: 2 },
  { id: 'subject-breakdown', type: 'SUBJECT_BREAKDOWN', x: 0, y: 4, w: 2, h: 2 },
  { id: 'absence-recommender', type: 'ABSENCE_RECOMMENDER', x: 0, y: 6, w: 2, h: 2 },
];
