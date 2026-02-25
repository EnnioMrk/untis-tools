'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GridLayout } from 'react-grid-layout';
import { Edit3, Save, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import type { WidgetData, WidgetType, UserStatsResponse } from '@/types/widget';
import { WIDGET_DEFINITIONS } from '@/types/widget';
import { SingleKPIWidget } from '@/components/widgets/kpi-cards';
import { AbsenceBarChart } from '@/components/widgets/absence-bar-chart';
import { AbsenceTrendChart } from '@/components/widgets/absence-trend-chart';
import { SubjectBreakdownChart } from '@/components/widgets/subject-breakdown-chart';
import { AbsenceRecommender } from '@/components/widgets/absence-recommender';
import { WidgetLibrary } from '@/components/dashboard/widget-library';
import { saveWidgetLayout, triggerManualSync, getUserStatsNoCache } from '@/app/dashboard/actions';

import 'react-grid-layout/css/styles.css';

interface DashboardGridProps {
  initialWidgets: WidgetData[];
  stats: UserStatsResponse | null;
  isPremium: boolean;
}

// Grid configuration
const COLS = 2;
const ROW_HEIGHT = 150;
const CONTAINER_WIDTH = 800;

export function DashboardGrid({ initialWidgets, stats, isPremium }: DashboardGridProps) {
  const renderCount = useRef(0);
  const prevWidgetsJson = useRef('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentStats, setCurrentStats] = useState<UserStatsResponse | null>(stats);
  
  // Debug: Track re-renders
  useEffect(() => {
    renderCount.current += 1;
    const currentWidgetsJson = JSON.stringify(widgets);
    if (prevWidgetsJson.current && prevWidgetsJson.current !== currentWidgetsJson) {
      console.log(`[DashboardGrid] Render #${renderCount.current}, widgets changed`);
    } else if (renderCount.current > 10) {
      console.warn(`[DashboardGrid] HIGH RENDER COUNT: ${renderCount.current} - potential infinite loop!`);
    }
    prevWidgetsJson.current = currentWidgetsJson;
  });
  
  const [widgets, setWidgets] = useState<WidgetData[]>(initialWidgets);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Measure container width for responsive grid
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        console.log('[DashboardGrid] Container width:', width);
        setContainerWidth(width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate the maximum y position for adding new widgets
  const maxY = useMemo(() => {
    if (widgets.length === 0) return 0;
    return Math.max(...widgets.map((w) => w.y + w.h));
  }, [widgets]);

  // Generate layout for react-grid-layout
  const layout = useMemo(() => {
    return widgets.map((widget) => ({
      i: widget.id,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
    }));
  }, [widgets]);

  // Handle layout change - with debouncing to prevent infinite loops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback((newLayout: any) => {
    console.log('[DashboardGrid] Layout change triggered, items:', newLayout.length);
    
    // Clear any pending timeout
    if (layoutUpdateTimeout.current) {
      clearTimeout(layoutUpdateTimeout.current);
    }
    
    // Debounce the state update to prevent rapid re-renders
    layoutUpdateTimeout.current = setTimeout(() => {
      setWidgets((prev) => {
        const updated = prev.map((widget) => {
          const layoutItem = newLayout.find((l: { i: string; x: number; y: number; w: number; h: number }) => l.i === widget.id);
          if (layoutItem && (layoutItem.x !== widget.x || layoutItem.y !== widget.y || layoutItem.w !== widget.w || layoutItem.h !== widget.h)) {
            console.log('[DashboardGrid] Updating widget:', widget.id);
            return {
              ...widget,
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            };
          }
          return widget;
        });
        return updated;
      });
    }, 100); // 100ms debounce
  }, []);

  // Handle save layout
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      const result = await saveWidgetLayout(widgets);
      if (result.success) {
        setIsEditMode(false);
      } else {
        console.error('Failed to save layout:', result.error);
      }
    } catch (error) {
      console.error('Failed to save layout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle add widget
  const handleAddWidget = (type: WidgetType) => {
    const definition = WIDGET_DEFINITIONS[type];
    const newWidget: WidgetData = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      x: 0,
      y: maxY,
      w: definition.defaultW,
      h: definition.defaultH,
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
        setSyncError(result.error || 'Sync failed');
      } else {
        // Refresh the page to get updated data
        window.location.reload();
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
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
        setSyncError(syncResult.error || 'Sync failed');
        // Still try to get whatever data we have
      }
      
      // Then fetch fresh stats (bypasses cache)
      const freshStats = await getUserStatsNoCache();
      if (freshStats) {
        setCurrentStats(freshStats);
      } else {
        setSyncError('Failed to fetch fresh data');
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Reload failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Render widget content
  const renderWidgetContent = (widget: WidgetData) => {
    const widgetStats = currentStats;
    if (!widgetStats) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <p className="text-gray-500">No data available</p>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync Now
              </>
            )}
          </button>
          {syncError && (
            <p className="text-xs text-red-500">{syncError}</p>
          )}
        </div>
      );
    }

    switch (widget.type) {
      case 'KPI_7DAYS':
        return (
          <SingleKPIWidget
            type="KPI_7DAYS"
            absences7Days={widgetStats.absences7Days}
            absences14Days={widgetStats.absences14Days}
            absences30Days={widgetStats.absences30Days}
            absencesAllTime={widgetStats.absencesAllTime}
            trend7Days={widgetStats.trend7Days}
            trend14Days={widgetStats.trend14Days}
            trend30Days={widgetStats.trend30Days}
          />
        );
      case 'KPI_14DAYS':
        return (
          <SingleKPIWidget
            type="KPI_14DAYS"
            absences7Days={widgetStats.absences7Days}
            absences14Days={widgetStats.absences14Days}
            absences30Days={widgetStats.absences30Days}
            absencesAllTime={widgetStats.absencesAllTime}
            trend7Days={widgetStats.trend7Days}
            trend14Days={widgetStats.trend14Days}
            trend30Days={widgetStats.trend30Days}
          />
        );
      case 'KPI_30DAYS':
        return (
          <SingleKPIWidget
            type="KPI_30DAYS"
            absences7Days={widgetStats.absences7Days}
            absences14Days={widgetStats.absences14Days}
            absences30Days={widgetStats.absences30Days}
            absencesAllTime={widgetStats.absencesAllTime}
            trend7Days={widgetStats.trend7Days}
            trend14Days={widgetStats.trend14Days}
            trend30Days={widgetStats.trend30Days}
          />
        );
      case 'KPI_ALLTIME':
        return (
          <SingleKPIWidget
            type="KPI_ALLTIME"
            absences7Days={widgetStats.absences7Days}
            absences14Days={widgetStats.absences14Days}
            absences30Days={widgetStats.absences30Days}
            absencesAllTime={widgetStats.absencesAllTime}
            trend7Days={widgetStats.trend7Days}
            trend14Days={widgetStats.trend14Days}
            trend30Days={widgetStats.trend30Days}
          />
        );
      case 'ABSENCE_BAR':
        return <AbsenceBarChart data={widgetStats.subjectBreakdown} />;
      case 'ABSENCE_TREND':
        return <AbsenceTrendChart data={widgetStats.dailyTrend} />;
      case 'SUBJECT_BREAKDOWN':
        return <SubjectBreakdownChart data={widgetStats.subjectBreakdown} />;
      case 'ABSENCE_RECOMMENDER':
        return <AbsenceRecommender data={widgetStats.subjectBreakdown} isPremium={isPremium} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Unknown widget type</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {/* Header with Edit/Save button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          {/* Reload without cache button */}
          <button
            onClick={handleReloadWithoutCache}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Reload data without cache"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Reload
              </>
            )}
          </button>
          {isEditMode && (
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Widget
            </button>
          )}
          <button
            onClick={() => {
              if (isEditMode) {
                handleSaveLayout();
              } else {
                setIsEditMode(true);
              }
            }}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isEditMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isEditMode ? (
              <>
                <Save className="w-4 h-4" />
                Save Layout
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Edit Dashboard
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="w-full" ref={containerRef}>
        <GridLayout
          className="layout"
          layout={layout}
          // @ts-expect-error - react-grid-layout types are outdated
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={containerWidth}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-header"
          margin={[16, 16] as [number, number]}
        >
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                isEditMode ? 'cursor-move' : ''
              }`}
            >
              {/* Widget header with remove button in edit mode */}
              {isEditMode && (
                <div className="widget-header flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">
                    {WIDGET_DEFINITIONS[widget.type].name}
                  </span>
                  <button
                    onClick={() => handleRemoveWidget(widget.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* Widget content */}
              <div className={isEditMode ? 'h-[calc(100%-40px)]' : 'h-full'}>
                {renderWidgetContent(widget)}
              </div>
            </div>
          ))}
        </GridLayout>
      </div>

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-gray-100 rounded-full p-4 mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
          <p className="text-gray-500 mb-4">Add widgets to customize your dashboard</p>
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Widget
          </button>
        </div>
      )}

      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAddWidget={handleAddWidget}
        isPremium={isPremium}
        existingWidgets={widgets}
      />
    </div>
  );
}
