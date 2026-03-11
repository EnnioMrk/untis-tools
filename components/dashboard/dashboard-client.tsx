'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type AppPlan } from '@/lib/plans';
import { getShopTheme, type ShopThemeId } from '@/lib/shop';
import { RefreshCw, Plus, Save, Edit3, Loader2, ShoppingBag, Shield } from 'lucide-react';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import type { WidgetData, UserStatsResponse } from '@/types/widget';

interface DashboardHeaderProps {
    userPlan: AppPlan;
    activeTheme: ShopThemeId;
    isAdmin: boolean;
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
    userPlan,
    activeTheme,
    isAdmin,
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
    const themeConfig = getShopTheme(activeTheme);

    return (
        <div className={`mb-6 rounded-3xl border p-5 shadow-sm backdrop-blur ${themeConfig.headerClass}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-3 flex flex-wrap gap-2 text-sm">
                        <span className={`rounded-full px-3 py-1 font-medium ${themeConfig.badgeClass}`}>
                            Theme: {themeConfig.name}
                        </span>
                        <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-slate-700">
                            Plan: {userPlan}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Refresh data, change your layout, or visit the shop for new themes and upgrades.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <Link
                        href="/shop"
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        Shop
                    </Link>
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
                        >
                            <Shield className="w-4 h-4" />
                            Admin
                        </Link>
                    )}
                    <DateRangePicker
                        initialDate={initialDate}
                        isCustom={isCustom}
                        presetDates={presetDates}
                        onDateChange={onDateChange}
                    />
                    <button
                        onClick={onReloadClick}
                        disabled={isSyncing}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
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
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
                        >
                            <Plus className="w-4 h-4" />
                            Add Widget
                        </button>
                    )}
                    <button
                        onClick={onEditSaveClick}
                        disabled={isSaving}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:w-auto ${
                            isEditMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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
        </div>
    );
}

interface DashboardClientProps {
    initialWidgets: WidgetData[];
    initialStats: UserStatsResponse | null;
    userPlan: AppPlan;
    activeTheme: ShopThemeId;
    isAdmin: boolean;
    initialDate: Date | null;
    isCustom: boolean;
    presetDates: { label: string; date: Date }[];
}

export function DashboardClient({
    initialWidgets,
    initialStats,
    userPlan,
    activeTheme,
    isAdmin,
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
                userPlan={userPlan}
                activeTheme={activeTheme}
                isAdmin={isAdmin}
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
                userPlan={userPlan}
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
