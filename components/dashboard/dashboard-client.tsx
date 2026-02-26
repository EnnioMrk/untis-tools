'use client';

import { useState } from 'react';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import type { WidgetData, UserStatsResponse } from '@/types/widget';

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

    const handleDateChange = () => {
        // Increment the key to trigger a refresh in DashboardGrid
        setRefreshKey((k) => k + 1);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <DateRangePicker
                    initialDate={initialDate}
                    isCustom={isCustom}
                    presetDates={presetDates}
                    onDateChange={handleDateChange}
                />
            </div>
            <DashboardGrid
                initialWidgets={initialWidgets}
                stats={initialStats}
                isPremium={isPremium}
                refreshKey={refreshKey}
            />
        </div>
    );
}
