// Widget type enum - must match Prisma schema
export const WidgetType = {
    KPI_7DAYS: "KPI_7DAYS",
    KPI_14DAYS: "KPI_14DAYS",
    KPI_30DAYS: "KPI_30DAYS",
    KPI_ALLTIME: "KPI_ALLTIME",
    ABSENCE_BAR: "ABSENCE_BAR",
    ABSENCE_TREND: "ABSENCE_TREND",
    SUBJECT_BREAKDOWN: "SUBJECT_BREAKDOWN",
    ABSENCE_RECOMMENDER: "ABSENCE_RECOMMENDER",
    ABSENCE_RATE: "ABSENCE_RATE",
    TOTAL_ABSENCE_BAR: "TOTAL_ABSENCE_BAR",
} as const;

export type WidgetType = (typeof WidgetType)[keyof typeof WidgetType];

export const DASHBOARD_DEVICE_TYPES = ["desktop", "tablet", "mobile"] as const;

export type DashboardDeviceType = (typeof DASHBOARD_DEVICE_TYPES)[number];

export const DASHBOARD_COLS: Record<DashboardDeviceType, number> = {
    desktop: 4,
    tablet: 2,
    mobile: 1,
};

export const DASHBOARD_BREAKPOINTS: Record<DashboardDeviceType, number> = {
    desktop: 1200,
    tablet: 768,
    mobile: 0,
};

export interface WidgetLayoutPosition {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type ResponsiveWidgetLayouts = Record<
    DashboardDeviceType,
    WidgetLayoutPosition
>;

interface WidgetDefaultSize {
    w: number;
    h: number;
}

// Widget type definitions for display
export const WIDGET_DEFINITIONS: Record<
    WidgetType,
    {
        name: string;
        description: string;
        defaultSize: Record<DashboardDeviceType, WidgetDefaultSize>;
    }
> = {
    KPI_7DAYS: {
        name: "7-Day Absence KPI",
        description: "Shows absence count for the last 7 days with trend",
        defaultSize: {
            desktop: { w: 1, h: 1 },
            tablet: { w: 1, h: 1 },
            mobile: { w: 1, h: 1 },
        },
    },
    KPI_14DAYS: {
        name: "14-Day Absence KPI",
        description: "Shows absence count for the last 14 days with trend",
        defaultSize: {
            desktop: { w: 1, h: 1 },
            tablet: { w: 1, h: 1 },
            mobile: { w: 1, h: 1 },
        },
    },
    KPI_30DAYS: {
        name: "30-Day Absence KPI",
        description: "Shows absence count for the last 30 days with trend",
        defaultSize: {
            desktop: { w: 1, h: 1 },
            tablet: { w: 1, h: 1 },
            mobile: { w: 1, h: 1 },
        },
    },
    KPI_ALLTIME: {
        name: "All-Time Absence KPI",
        description: "Shows total absence count",
        defaultSize: {
            desktop: { w: 1, h: 1 },
            tablet: { w: 1, h: 1 },
            mobile: { w: 1, h: 1 },
        },
    },
    ABSENCE_BAR: {
        name: "Absence by Subject",
        description: "Bar chart showing absences per subject",
        defaultSize: {
            desktop: { w: 2, h: 2 },
            tablet: { w: 1, h: 2 },
            mobile: { w: 1, h: 2 },
        },
    },
    ABSENCE_TREND: {
        name: "Absence Trend",
        description: "Line chart showing cumulative absence rate over 30 days",
        defaultSize: {
            desktop: { w: 2, h: 2 },
            tablet: { w: 1, h: 2 },
            mobile: { w: 1, h: 2 },
        },
    },
    SUBJECT_BREAKDOWN: {
        name: "Subject Breakdown",
        description:
            "Stacked bar chart showing attended, absent, and cancelled lessons",
        defaultSize: {
            desktop: { w: 4, h: 2 },
            tablet: { w: 2, h: 2 },
            mobile: { w: 1, h: 2 },
        },
    },
    ABSENCE_RECOMMENDER: {
        name: "Absence Recommender",
        description: "Shows which subjects you can safely miss",
        defaultSize: {
            desktop: { w: 4, h: 2 },
            tablet: { w: 2, h: 2 },
            mobile: { w: 1, h: 2 },
        },
    },
    TOTAL_ABSENCE_BAR: {
        name: "Absence Rate Bar",
        description:
            "Visual bar showing total absence percentage with severity",
        defaultSize: {
            desktop: { w: 4, h: 1 },
            tablet: { w: 2, h: 1 },
            mobile: { w: 1, h: 1 },
        },
    },
    ABSENCE_RATE: {
        name: "Absence Rate",
        description: "Shows overall absence rate percentage",
        defaultSize: {
            desktop: { w: 1, h: 1 },
            tablet: { w: 1, h: 1 },
            mobile: { w: 1, h: 1 },
        },
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
    layoutData: ResponsiveWidgetLayouts;
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
    layouts?: Partial<ResponsiveWidgetLayouts>;
    config?: Record<string, unknown>;
}

export function getDefaultWidgetSize(
    type: WidgetType,
    device: DashboardDeviceType,
): WidgetDefaultSize {
    return WIDGET_DEFINITIONS[type].defaultSize[device];
}

function sanitizeLayoutPosition(
    layout: Partial<WidgetLayoutPosition> | undefined,
    type: WidgetType,
    device: DashboardDeviceType,
): WidgetLayoutPosition {
    const fallback = getDefaultWidgetSize(type, device);
    const cols = DASHBOARD_COLS[device];
    const width = Math.max(
        1,
        Math.min(cols, Math.round(layout?.w ?? fallback.w)),
    );

    return {
        x: Math.max(0, Math.min(cols - width, Math.round(layout?.x ?? 0))),
        y: Math.max(0, Math.round(layout?.y ?? 0)),
        w: width,
        h: Math.max(1, Math.round(layout?.h ?? fallback.h)),
    };
}

export function createResponsiveLayoutsForWidgets(
    widgets: Array<Pick<WidgetData, "id" | "type">>,
): Record<string, ResponsiveWidgetLayouts> {
    const placements = Object.fromEntries(
        widgets.map((widget) => [
            widget.id,
            {} as Partial<ResponsiveWidgetLayouts>,
        ]),
    ) as Record<string, Partial<ResponsiveWidgetLayouts>>;

    for (const device of DASHBOARD_DEVICE_TYPES) {
        const cols = DASHBOARD_COLS[device];
        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;

        for (const widget of widgets) {
            const size = getDefaultWidgetSize(widget.type, device);

            if (currentX + size.w > cols) {
                currentX = 0;
                currentY += rowHeight;
                rowHeight = 0;
            }

            placements[widget.id][device] = {
                x: currentX,
                y: currentY,
                w: size.w,
                h: size.h,
            };

            currentX += size.w;
            rowHeight = Math.max(rowHeight, size.h);

            if (currentX >= cols) {
                currentX = 0;
                currentY += rowHeight;
                rowHeight = 0;
            }
        }
    }

    return Object.fromEntries(
        widgets.map((widget) => [
            widget.id,
            {
                desktop: sanitizeLayoutPosition(
                    placements[widget.id].desktop,
                    widget.type,
                    "desktop",
                ),
                tablet: sanitizeLayoutPosition(
                    placements[widget.id].tablet,
                    widget.type,
                    "tablet",
                ),
                mobile: sanitizeLayoutPosition(
                    placements[widget.id].mobile,
                    widget.type,
                    "mobile",
                ),
            },
        ]),
    );
}

export function normalizeWidgetData(widgets: WidgetData[]): WidgetData[] {
    const generatedLayouts = createResponsiveLayoutsForWidgets(widgets);

    return widgets.map((widget) => {
        const storedLayouts = widget.layouts;
        const layouts: ResponsiveWidgetLayouts = {
            desktop: sanitizeLayoutPosition(
                storedLayouts?.desktop,
                widget.type,
                "desktop",
            ),
            tablet: sanitizeLayoutPosition(
                storedLayouts?.tablet,
                widget.type,
                "tablet",
            ),
            mobile: sanitizeLayoutPosition(
                storedLayouts?.mobile,
                widget.type,
                "mobile",
            ),
        };

        for (const device of DASHBOARD_DEVICE_TYPES) {
            if (!storedLayouts?.[device]) {
                layouts[device] = generatedLayouts[widget.id][device];
            }
        }

        return {
            ...widget,
            x: layouts.desktop.x,
            y: layouts.desktop.y,
            w: layouts.desktop.w,
            h: layouts.desktop.h,
            layouts,
        };
    });
}

export function getWidgetSizeLabel(type: WidgetType): string {
    const desktop = getDefaultWidgetSize(type, "desktop");
    const tablet = getDefaultWidgetSize(type, "tablet");
    const mobile = getDefaultWidgetSize(type, "mobile");

    return `Desktop ${desktop.w}/${DASHBOARD_COLS.desktop}, Tablet ${tablet.w}/${DASHBOARD_COLS.tablet}, Mobile ${mobile.w}/${DASHBOARD_COLS.mobile} × ${mobile.h === desktop.h && tablet.h === desktop.h ? `${desktop.h} rows` : `${desktop.h}/${tablet.h}/${mobile.h} rows`}`;
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
    direction: "up" | "down" | "neutral";
}

// User stats response type
export interface UserStatsResponse {
    absences7Days: number;
    absences14Days: number;
    absences30Days: number;
    trend7Days: TrendData | null;
    trend14Days: TrendData | null;
    trend30Days: TrendData | null;
    subjectBreakdown: SubjectBreakdownItem[];
    dailyTrend: DailyTrendItem[];
    absenceRate: number;
    totalRealLessons: number;
    totalAbsences: number;
}

// Default widgets for new users
const DEFAULT_WIDGET_BLUEPRINTS: Array<Pick<WidgetData, "id" | "type">> = [
    { id: "kpi-7days", type: "KPI_7DAYS" },
    { id: "kpi-14days", type: "KPI_14DAYS" },
    { id: "kpi-30days", type: "KPI_30DAYS" },
    { id: "kpi-alltime", type: "KPI_ALLTIME" },
    { id: "absence-bar", type: "ABSENCE_BAR" },
    { id: "absence-trend", type: "ABSENCE_TREND" },
    { id: "subject-breakdown", type: "SUBJECT_BREAKDOWN" },
    { id: "absence-recommender", type: "ABSENCE_RECOMMENDER" },
];

const DEFAULT_WIDGET_LAYOUTS = createResponsiveLayoutsForWidgets(
    DEFAULT_WIDGET_BLUEPRINTS,
);

export const DEFAULT_WIDGETS: WidgetData[] = DEFAULT_WIDGET_BLUEPRINTS.map(
    (widget) => ({
        ...widget,
        ...DEFAULT_WIDGET_LAYOUTS[widget.id].desktop,
        layouts: DEFAULT_WIDGET_LAYOUTS[widget.id],
    }),
);
