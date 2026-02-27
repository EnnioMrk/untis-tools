'use client';

import { useState } from 'react';
import { RefreshCw, Plus, Save, Edit3, Loader2 } from 'lucide-react';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import type { WidgetData, UserStatsResponse } from '@/types/widget';

interface DashboardHeaderProps {
    initialDate: Date | null;
    isCustom: boolean;
    presetDates: { label: string; date: Date }[];
    isEditMode: boolean;
    isSaving: boolean;
    isSyncing: boolean;
    onDateChange: () => void;
    onReloadClick: () => void;
    onAddWidgetClick: () => void;
    onEditSaveClick: () => void;
}

export function DashboardHeader({
    initialDate,
    isCustom,
    presetDates,
    isEditMode,
    isSaving,
    isSyncing,
    onDateChange,
    onReloadClick,
    onAddWidgetClick,
    onEditSaveClick,
}: DashboardHeaderProps) {
    return (
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-2">
                <DateRangePicker
                    initialDate={initialDate}
                    isCustom={isCustom}
                    presetDates={presetDates}
                    onDateChange={onDateChange}
                />
                {/* Reload without cache button */}
                <button
                    onClick={onReloadClick}
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
                        onClick={onAddWidgetClick}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Widget
                    </button>
                )}
                <button
                    onClick={onEditSaveClick}
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
    );
}

interface DashboardClientProps {
    initialWidgets: WidgetData[];
    initialStats: UserStatsResponse | null;
    isPremium: boolean;
    initialDate: Date | null;
    isCustom: boolean;
    presetDates: { label: string; date: Date }[];
}

export function DashboardClient({
    initialWidgets,
    initialStats,
    isPremium,
    initialDate,
    isCustom,
    presetDates,
}: DashboardClientProps) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [libraryTrigger, setLibraryTrigger] = useState(0);

    const handleDateChange = () => {
        // We don't need to increment refreshKey here because DateRangePicker calls router.refresh()
        // which will provide new stats props to DashboardGrid, and DashboardGrid has an effect
        // to sync internal stats with props.
    };

    const handleReloadClick = () => {
        setIsSyncing(true);
        setRefreshKey((k) => k + 1);
    };

    const handleAddWidgetClick = () => {
        setLibraryTrigger((t) => t + 1);
    };

    const handleEditSaveClick = () => {
        if (isEditMode) {
            // Trigger save - this is handled by DashboardGrid
            setIsEditMode(false);
        } else {
            setIsEditMode(true);
        }
    };

    return (
        <div>
            <DashboardHeader
                initialDate={initialDate}
                isCustom={isCustom}
                presetDates={presetDates}
                isEditMode={isEditMode}
                isSaving={isSaving}
                isSyncing={isSyncing}
                onDateChange={handleDateChange}
                onReloadClick={handleReloadClick}
                onAddWidgetClick={handleAddWidgetClick}
                onEditSaveClick={handleEditSaveClick}
            />
            <DashboardGrid
                initialWidgets={initialWidgets}
                stats={initialStats}
                isPremium={isPremium}
                refreshKey={refreshKey}
                isEditMode={isEditMode}
                onEditModeChange={setIsEditMode}
                onSavingChange={setIsSaving}
                onSyncingChange={setIsSyncing}
                libraryTrigger={libraryTrigger}
            />
        </div>
    );
}
