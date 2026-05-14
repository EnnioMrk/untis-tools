"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
    canAccessWidget,
    getPlanConfig,
    getRequiredPlanForWidget,
    type AppPlan,
} from "@/lib/plans";
import { Responsive, useContainerWidth } from "react-grid-layout";
import { Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import type {
    WidgetData,
    WidgetType,
    UserStatsResponse,
    DashboardDeviceType,
    ResponsiveWidgetLayouts,
} from "@/types/widget";
import {
    DASHBOARD_BREAKPOINTS,
    DASHBOARD_COLS,
    DASHBOARD_DEVICE_TYPES,
    WIDGET_DEFINITIONS,
    getDefaultWidgetSize,
    normalizeWidgetData,
} from "@/types/widget";
import { SingleKPIWidget } from "@/components/widgets/kpi-cards";
import { AbsenceBarChart } from "@/components/widgets/absence-bar-chart";
import { AbsenceTrendChart } from "@/components/widgets/absence-trend-chart";
import { SubjectBreakdownChart } from "@/components/widgets/subject-breakdown-chart";
import { TotalAbsenceBar } from "@/components/widgets/total-absence-bar";
import { AbsenceRateWidget } from "@/components/widgets/absence-rate-widget";
import { AbsenceRecommender } from "@/components/widgets/absence-recommender";
import { Card } from "@/components/ui/card";
import { WidgetLibrary } from "@/components/dashboard/widget-library";
import {
    saveWidgetLayout,
    triggerManualSync,
    getUserStatsNoCache,
} from "@/app/dashboard/actions";

import "react-grid-layout/css/styles.css";

interface GridLayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

type ResponsiveLayouts = Record<DashboardDeviceType, GridLayoutItem[]>;
type PartialResponsiveLayouts = Partial<
    Record<DashboardDeviceType | string, readonly GridLayoutItem[]>
>;

interface DashboardGridProps {
    initialWidgets: WidgetData[];
    stats: UserStatsResponse | null;
    userPlan: AppPlan;
    refreshKey?: number;
    isEditMode?: boolean;
    onEditModeChange?: (mode: boolean) => void;
    onSavingChange?: (saving: boolean) => void;
    onSyncingChange?: (syncing: boolean) => void;
    libraryTrigger?: number;
    showOnlyUnexcusedAbsences?: boolean;
}

// Grid configuration
const ROW_HEIGHT = 150;

function buildLayoutsForGrid(widgets: WidgetData[]): ResponsiveLayouts {
    return Object.fromEntries(
        DASHBOARD_DEVICE_TYPES.map(
            (device) =>
                [
                    device,
                    widgets.map((widget) => ({
                        i: widget.id,
                        ...widget.layouts![device],
                    })),
                ] as [DashboardDeviceType, GridLayoutItem[]],
        ),
    ) as ResponsiveLayouts;
}

function applyLayoutsToWidgetState(
    widgets: WidgetData[],
    allLayouts: ResponsiveLayouts,
    currentBreakpoint: DashboardDeviceType,
): WidgetData[] {
    return widgets.map((widget) => {
        const nextLayouts = {
            ...(widget.layouts as ResponsiveWidgetLayouts),
        };
        let changed = false;

        for (const device of DASHBOARD_DEVICE_TYPES) {
            const layoutItem = allLayouts[device]?.find(
                (layout) => layout.i === widget.id,
            );

            if (!layoutItem) {
                continue;
            }

            const previousLayout = nextLayouts[device];
            const width = Math.max(
                1,
                Math.min(DASHBOARD_COLS[device], layoutItem.w),
            );
            const updatedLayout = {
                x: Math.max(
                    0,
                    Math.min(DASHBOARD_COLS[device] - width, layoutItem.x),
                ),
                y: Math.max(0, layoutItem.y),
                w: width,
                h: Math.max(1, layoutItem.h),
            };

            if (
                previousLayout.x !== updatedLayout.x ||
                previousLayout.y !== updatedLayout.y ||
                previousLayout.w !== updatedLayout.w ||
                previousLayout.h !== updatedLayout.h
            ) {
                nextLayouts[device] = updatedLayout;
                changed = true;
            }
        }

        if (!changed) {
            return widget;
        }

        const activeLayout = nextLayouts[currentBreakpoint];

        return {
            ...widget,
            x: activeLayout.x,
            y: activeLayout.y,
            w: activeLayout.w,
            h: activeLayout.h,
            layouts: nextLayouts,
        };
    });
}

export function DashboardGrid({
    initialWidgets,
    stats,
    userPlan,
    refreshKey = 0,
    isEditMode: externalEditMode,
    onEditModeChange,
    onSavingChange,
    onSyncingChange,
    libraryTrigger,
    showOnlyUnexcusedAbsences = false,
}: DashboardGridProps) {
    const [isSyncingInternal, setIsSyncingInternal] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [currentStats, setCurrentStats] = useState<UserStatsResponse | null>(
        stats,
    );

    // Filter stats if only unexcused absences should be shown
    const displayStats = useMemo(() => {
        if (!currentStats) return null;
        
        if (!showOnlyUnexcusedAbsences) return currentStats;
        
        // Filter subject breakdown to only show unexcused absences
        const filteredSubjectBreakdown = currentStats.subjectBreakdown.map(item => ({
            ...item,
            absences: item.unexcusedAbsences,
            absenceRate: item.total > 0 ? Math.round((item.unexcusedAbsences / (item.total - item.cancelled)) * 100 * 100) / 100 : 0,
        }));
        
        // Recalculate totals for unexcused only
        const totalUnexcused = currentStats.totalUnexcusedAbsences;
        const newAbsenceRate = currentStats.totalRealLessons > 0 
            ? Math.round((totalUnexcused / currentStats.totalRealLessons) * 100 * 100) / 100 
            : 0;
        
        return {
            ...currentStats,
            absences7Days: 0, // We don't have time-filtered unexcused data
            absences14Days: 0,
            absences30Days: 0,
            totalAbsences: totalUnexcused,
            absenceRate: newAbsenceRate,
            subjectBreakdown: filteredSubjectBreakdown,
        };
    }, [currentStats, showOnlyUnexcusedAbsences]);

    // Use external edit mode if provided, otherwise use internal state
    const [internalEditMode, setInternalEditMode] = useState(false);
    const isEditMode =
        externalEditMode !== undefined ? externalEditMode : internalEditMode;
    const setIsEditMode = (mode: boolean) => {
        if (onEditModeChange) {
            onEditModeChange(mode);
        } else {
            setInternalEditMode(mode);
        }
    };

    // Use external syncing state if provided
    const isSyncing = isSyncingInternal;
    const setIsSyncing = (syncing: boolean) => {
        setIsSyncingInternal(syncing);
        if (onSyncingChange) {
            onSyncingChange(syncing);
        }
    };

    const [, setIsSavingInternal] = useState(false);
    const setIsSaving = (saving: boolean) => {
        setIsSavingInternal(saving);
        if (onSavingChange) {
            onSavingChange(saving);
        }
    };

    // Refetch stats when refreshKey changes
    useEffect(() => {
        if (refreshKey > 0) {
            handleReloadWithoutCache();
        }
        // `handleReloadWithoutCache` intentionally stays outside deps to avoid re-running on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    // Update current stats when the stats prop changes (e.g. after a router.refresh or date change)
    useEffect(() => {
        if (stats) {
            setCurrentStats(stats);
        }
    }, [stats]);

    // Auto-save layout when exiting edit mode
    const prevEditMode = useRef(isEditMode);
    useEffect(() => {
        if (prevEditMode.current && !isEditMode) {
            handleSaveLayout();
        }
        prevEditMode.current = isEditMode;
        // `handleSaveLayout` intentionally stays outside deps so save only triggers on edit mode transitions.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode]);

    const [widgets, setWidgets] = useState<WidgetData[]>(() =>
        normalizeWidgetData(initialWidgets),
    );
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [currentBreakpoint, setCurrentBreakpoint] =
        useState<DashboardDeviceType>("desktop");
    const planConfig = getPlanConfig(userPlan);
    const layoutUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
    const pendingLayoutsRef = useRef<ResponsiveLayouts | null>(null);
    const { width, containerRef, mounted } = useContainerWidth({
        initialWidth: 1280,
        measureBeforeMount: false,
    });

    // Handle add widget click from header
    useEffect(() => {
        if ((libraryTrigger ?? 0) > 0) {
            setIsLibraryOpen(true);
        }
    }, [libraryTrigger]);

    useEffect(() => {
        return () => {
            if (layoutUpdateTimeout.current) {
                clearTimeout(layoutUpdateTimeout.current);
            }
        };
    }, []);

    useEffect(() => {
        const normalized = normalizeWidgetData(initialWidgets);
        setWidgets((prev) => {
            const hasChanged = normalized.some((w, i) => w !== prev[i]);
            return hasChanged ? normalized : prev;
        });
    }, [initialWidgets]);

    const layouts = useMemo(() => buildLayoutsForGrid(widgets), [widgets]);

    // Handle layout change - with debouncing to prevent infinite loops
    const handleLayoutChange = useCallback(
        (
            _: readonly GridLayoutItem[],
            allLayouts: PartialResponsiveLayouts,
        ) => {
            const nextLayouts: ResponsiveLayouts = {
                desktop: [...(allLayouts.desktop ?? [])],
                tablet: [...(allLayouts.tablet ?? [])],
                mobile: [...(allLayouts.mobile ?? [])],
            };

            pendingLayoutsRef.current = nextLayouts;
            console.log(
                "[DashboardGrid] Layout change triggered, items:",
                Object.values(nextLayouts).reduce(
                    (count, deviceLayouts) => count + deviceLayouts.length,
                    0,
                ),
            );

            if (layoutUpdateTimeout.current) {
                clearTimeout(layoutUpdateTimeout.current);
            }

            layoutUpdateTimeout.current = setTimeout(() => {
                setWidgets((prev) => {
                    const next = applyLayoutsToWidgetState(
                        prev,
                        nextLayouts,
                        currentBreakpoint,
                    );
                    const hasChanged = next.some((w, i) => w !== prev[i]);
                    return hasChanged ? next : prev;
                });
            }, 100);
        },
        [currentBreakpoint],
    );

    // Handle save layout
    const handleSaveLayout = async () => {
        const widgetsToSave = pendingLayoutsRef.current
            ? applyLayoutsToWidgetState(
                  widgets,
                  pendingLayoutsRef.current,
                  currentBreakpoint,
              )
            : widgets;

        if (layoutUpdateTimeout.current) {
            clearTimeout(layoutUpdateTimeout.current);
            layoutUpdateTimeout.current = null;
        }

        pendingLayoutsRef.current = null;
        setWidgets((prev) => {
            const hasChanged = widgetsToSave.some((w, i) => w !== prev[i]);
            return hasChanged ? widgetsToSave : prev;
        });

        setIsSaving(true);
        try {
            const result = await saveWidgetLayout(widgetsToSave);
            if (result.success) {
                setIsEditMode(false);
            } else {
                console.error("Failed to save layout:", result.error);
            }
        } catch (error) {
            console.error("Failed to save layout:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle add widget
    const handleAddWidget = (type: WidgetType) => {
        if (!canAccessWidget(userPlan, type)) {
            return;
        }

        if (
            planConfig.features.maxWidgets !== null &&
            widgets.length >= planConfig.features.maxWidgets
        ) {
            return;
        }

        const nextLayouts = Object.fromEntries(
            DASHBOARD_DEVICE_TYPES.map((device) => {
                const size = getDefaultWidgetSize(type, device);
                const nextY = widgets.length
                    ? Math.max(
                          ...widgets.map((widget) =>
                              widget.layouts?.[device]
                                  ? widget.layouts[device].y +
                                    widget.layouts[device].h
                                  : 0,
                          ),
                      )
                    : 0;

                return [
                    device,
                    {
                        x: 0,
                        y: nextY,
                        w: size.w,
                        h: size.h,
                    },
                ];
            }),
        ) as ResponsiveWidgetLayouts;

        const newWidget: WidgetData = {
            id: `${type.toLowerCase()}-${Date.now()}`,
            type,
            x: nextLayouts[currentBreakpoint].x,
            y: nextLayouts[currentBreakpoint].y,
            w: nextLayouts[currentBreakpoint].w,
            h: nextLayouts[currentBreakpoint].h,
            layouts: nextLayouts,
        };
        setWidgets((prev) => [...prev, newWidget]);
        setIsLibraryOpen(false);
    };

    // Handle remove widget
    const handleRemoveWidget = (id: string) => {
        setWidgets((prev) => prev.filter((w) => w.id !== id));
    };

    // Handle manual sync
    const handleManualSync = async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const result = await triggerManualSync();
            if (!result.success) {
                setSyncError(result.error || "Sync failed");
            } else {
                // Refresh the page to get updated data
                window.location.reload();
            }
        } catch (error) {
            setSyncError(
                error instanceof Error ? error.message : "Sync failed",
            );
        } finally {
            setIsSyncing(false);
        }
    };

    // Handle reload without cache - triggers sync and gets fresh data
    const handleReloadWithoutCache = async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            // First trigger a sync to get fresh data from Untis
            const syncResult = await triggerManualSync();
            if (!syncResult.success) {
                setSyncError(syncResult.error || "Sync failed");
                // Still try to get whatever data we have
            }

            // Then fetch fresh stats (bypasses cache)
            const freshStats = await getUserStatsNoCache();
            if (freshStats) {
                setCurrentStats(freshStats);
            } else {
                setSyncError("Failed to fetch fresh data");
            }
        } catch (error) {
            setSyncError(
                error instanceof Error ? error.message : "Reload failed",
            );
        } finally {
            setIsSyncing(false);
        }
    };

    // Render widget content
    const renderWidgetContent = (widget: WidgetData) => {
        const widgetStats = displayStats;
        if (!widgetStats) {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                    <p className="text-muted-foreground">Keine Daten verfügbar</p>
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:text-primary/90 disabled:opacity-50"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Synchronisiere...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Jetzt synchronisieren
                            </>
                        )}
                    </button>
                    {syncError && (
                        <p className="text-xs text-destructive">{syncError}</p>
                    )}
                </div>
            );
        }

        switch (widget.type) {
            case "KPI_7DAYS":
                return (
                    <SingleKPIWidget
                        type="KPI_7DAYS"
                        absences7Days={widgetStats.absences7Days}
                        absences14Days={widgetStats.absences14Days}
                        absences30Days={widgetStats.absences30Days}
                        totalAbsences={widgetStats.totalAbsences}
                        trend7Days={widgetStats.trend7Days}
                        trend14Days={widgetStats.trend14Days}
                        trend30Days={widgetStats.trend30Days}
                    />
                );
            case "KPI_14DAYS":
                return (
                    <SingleKPIWidget
                        type="KPI_14DAYS"
                        absences7Days={widgetStats.absences7Days}
                        absences14Days={widgetStats.absences14Days}
                        absences30Days={widgetStats.absences30Days}
                        totalAbsences={widgetStats.totalAbsences}
                        trend7Days={widgetStats.trend7Days}
                        trend14Days={widgetStats.trend14Days}
                        trend30Days={widgetStats.trend30Days}
                    />
                );
            case "KPI_30DAYS":
                return (
                    <SingleKPIWidget
                        type="KPI_30DAYS"
                        absences7Days={widgetStats.absences7Days}
                        absences14Days={widgetStats.absences14Days}
                        absences30Days={widgetStats.absences30Days}
                        totalAbsences={widgetStats.totalAbsences}
                        trend7Days={widgetStats.trend7Days}
                        trend14Days={widgetStats.trend14Days}
                        trend30Days={widgetStats.trend30Days}
                    />
                );
            case "KPI_ALLTIME":
                return (
                    <SingleKPIWidget
                        type="KPI_ALLTIME"
                        absences7Days={widgetStats.absences7Days}
                        absences14Days={widgetStats.absences14Days}
                        absences30Days={widgetStats.absences30Days}
                        totalAbsences={widgetStats.totalAbsences}
                        trend7Days={widgetStats.trend7Days}
                        trend14Days={widgetStats.trend14Days}
                        trend30Days={widgetStats.trend30Days}
                    />
                );
            case "ABSENCE_BAR":
                return <AbsenceBarChart data={widgetStats.subjectBreakdown} />;
            case "ABSENCE_TREND":
                return <AbsenceTrendChart data={widgetStats.dailyTrend} />;
            case "SUBJECT_BREAKDOWN":
                return (
                    <SubjectBreakdownChart
                        data={widgetStats.subjectBreakdown}
                    />
                );
            case "ABSENCE_RECOMMENDER": {
                const hasRecommenderAccess = canAccessWidget(
                    userPlan,
                    "ABSENCE_RECOMMENDER",
                );
                const recommenderRequiredPlan = getRequiredPlanForWidget(
                    "ABSENCE_RECOMMENDER",
                );
                return (
                    <AbsenceRecommender
                        data={widgetStats.subjectBreakdown}
                        hasAccess={hasRecommenderAccess}
                        requiredPlanName={
                            getPlanConfig(recommenderRequiredPlan).name
                        }
                    />
                );
            }
            case "TOTAL_ABSENCE_BAR":
                return (
                    <TotalAbsenceBar
                        absenceRate={widgetStats.absenceRate}
                        totalAbsences={widgetStats.totalAbsences}
                        totalRealLessons={widgetStats.totalRealLessons}
                    />
                );
            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Unbekannter Widget-Typ</p>
                    </div>
                );
        }
    };

    return (
        <div className="w-full">
            {/* Grid */}
            <div className="w-full" ref={containerRef}>
                {mounted && (
                    <Responsive
                        className="layout"
                        width={width}
                        layouts={layouts}
                        breakpoints={DASHBOARD_BREAKPOINTS}
                        cols={DASHBOARD_COLS}
                        rowHeight={ROW_HEIGHT}
                        dragConfig={{
                            enabled: isEditMode,
                            handle: ".widget-drag-handle",
                        }}
                        resizeConfig={{ enabled: isEditMode }}
                        onLayoutChange={handleLayoutChange}
                        onBreakpointChange={(breakpoint: string) =>
                            setCurrentBreakpoint(
                                breakpoint as DashboardDeviceType,
                            )
                        }
                        margin={[16, 16]}
                    >
                        {widgets.map((widget) => (
                            <Card
                                key={widget.id}
                                className="relative overflow-hidden"
                            >
                                {isEditMode && (
                                    <button
                                        onClick={() =>
                                            handleRemoveWidget(widget.id)
                                        }
                                        className="absolute top-3 right-3 z-10 rounded-md border border-border bg-card/95 p-1.5 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                                        title={`Entfernen ${
                                            WIDGET_DEFINITIONS[widget.type]
                                                ?.name ?? "widget"
                                        }`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                {/* Widget content */}
                                <div
                                    className={`h-full ${
                                        isEditMode
                                            ? "widget-drag-handle cursor-move"
                                            : ""
                                    }`}
                                >
                                    {renderWidgetContent(widget)}
                                    </div>
                                </Card>
                        ))}
                    </Responsive>
                )}
            </div>

            {/* Empty state */}
            {widgets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-muted rounded-full p-4 mb-4">
                        <Plus className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        Noch keine Widgets
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        Widgets hinzufügen, um Ihr Dashboard anzupassen
                    </p>
                    <button
                        onClick={() => setIsLibraryOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Widget hinzufügen
                    </button>
                </div>
            )}

            {/* Widget Library Modal */}
            <WidgetLibrary
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onAddWidget={handleAddWidget}
                userPlan={userPlan}
                existingWidgets={widgets}
            />
        </div>
    );
}