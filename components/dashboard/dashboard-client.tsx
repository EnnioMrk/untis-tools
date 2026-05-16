"use client";

import { useState } from "react";
import Link from "next/link";
import { type AppPlan } from "@/lib/plans";
import { useSettings } from "@/components/providers/settings-provider";
import {
    RefreshCw,
    Plus,
    Save,
    Edit3,
    Loader2,
    Shield,
    BookOpen,
    Settings,
    AlertTriangle,
    Palette,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { Button } from "@/components/ui/button";
import { SettingsModal } from "@/components/settings/settings-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { WidgetData, UserStatsResponse } from "@/types/widget";

interface DashboardHeaderProps {
    userPlan: AppPlan;
    isAdmin: boolean;
    initialDate: Date | null;
    isCustom: boolean;
    presetDates: { label: string; date: Date }[];
    isEditMode: boolean;
    isSaving: boolean;
    isSyncing: boolean;
    showOnlyUnexcusedAbsences: boolean;
    onDateChange: () => void;
    onReloadClick: () => void;
    onAddWidgetClick: () => void;
    onEditSaveClick: () => void;
    onSettingsClick: () => void;
}

export function DashboardHeader({
    userPlan,
    isAdmin,
    initialDate,
    isCustom,
    presetDates,
    isEditMode,
    isSaving,
    isSyncing,
    showOnlyUnexcusedAbsences,
    onDateChange,
    onReloadClick,
    onAddWidgetClick,
    onEditSaveClick,
    onSettingsClick,
}: DashboardHeaderProps) {
    return (
        <>
            {showOnlyUnexcusedAbsences && (
                <div className="mb-4 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <p className="text-sm text-muted-foreground">
                            <strong>Hinweis:</strong> Nur unentschuldigte Fehlstunden werden angezeigt.
                            Andere Daten werden ausgeblendet.
                        </p>
                    </div>
                </div>
            )}
            <Card className="relative z-20 mb-6 p-5">
                <div className="absolute top-4 right-4 sm:hidden">
                    <ThemeToggle />
                </div>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-3 flex flex-wrap gap-2 text-sm">
                            <span className="rounded-full px-3 py-1 font-medium bg-muted text-muted-foreground">
                                Plan: {userPlan}
                            </span>
                        </div>

                        <h1 className="text-2xl font-bold text-foreground">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Daten aktualisieren, Layout ändern und Widgets verwalten.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                        <Button asChild variant="outline">
                            <Link href="/faecher">
                                <BookOpen className="w-4 h-4" />
                                Fächer
                            </Link>
                        </Button>
                        {isAdmin && (
                            <Button asChild variant="outline">
                                <Link href="/admin">
                                    <Shield className="w-4 h-4" />
                                    Admin
                                </Link>
                            </Button>
                        )}
                        <DateRangePicker
                            initialDate={initialDate}
                            isCustom={isCustom}
                            presetDates={presetDates}
                            onDateChange={onDateChange}
                        />
                        <Button
                            onClick={onReloadClick}
                            disabled={isSyncing}
                            variant="outline"
                            title="Reload data without cache"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Wird geladen...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Neu laden
                                </>
                            )}
                        </Button>
                        {isEditMode && (
                            <Button onClick={onAddWidgetClick} variant="outline">
                                <Plus className="w-4 h-4" />
                                Widget hinzufügen
                            </Button>
                        )}
                        <Button onClick={onSettingsClick} variant="outline">
                            <Settings className="w-4 h-5" />
                            Einstellungen
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/dashboard/theme">
                                <Palette className="w-4 h-4" />
                                Thema
                            </Link>
                        </Button>
                        <div className="hidden sm:block">
                            <ThemeToggle />
                        </div>
                        <Button
                            onClick={onEditSaveClick}
                            disabled={isSaving}
                            variant="default"
                            className={`col-span-2 ${isEditMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : undefined}`}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : isEditMode ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    Layout speichern
                                </>
                            ) : (
                                <>
                                    <Edit3 className="w-4 h-4" />
                                    Dashboard bearbeiten
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </>
    );
}

interface DashboardClientProps {
    initialWidgets: WidgetData[];
    initialStats: UserStatsResponse | null;
    userPlan: AppPlan;
    isAdmin: boolean;
    initialDate: Date | null;
    isCustom: boolean;
    presetDates: { label: string; date: Date }[];
}

export function DashboardClient({
    initialWidgets,
    initialStats,
    userPlan,
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
    const [showSettings, setShowSettings] = useState(false);
    const { settings } = useSettings();

    const showOnlyUnexcusedAbsences = settings?.showOnlyUnexcusedAbsences ?? false;

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
        <>
            <div>
                <DashboardHeader
                    userPlan={userPlan}
                    isAdmin={isAdmin}
                    initialDate={initialDate}
                    isCustom={isCustom}
                    presetDates={presetDates}
                    isEditMode={isEditMode}
                    isSaving={isSaving}
                    isSyncing={isSyncing}
                    showOnlyUnexcusedAbsences={showOnlyUnexcusedAbsences}
                    onDateChange={handleDateChange}
                    onReloadClick={handleReloadClick}
                    onAddWidgetClick={handleAddWidgetClick}
                    onEditSaveClick={handleEditSaveClick}
                    onSettingsClick={() => setShowSettings(true)}
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
                    showOnlyUnexcusedAbsences={showOnlyUnexcusedAbsences}
                />
            </div>
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </>
    );
}