'use client';

import { useState, useTransition, useEffect } from 'react';
import { updateDataStartDate } from '@/app/dashboard/actions';
import { useRouter } from 'next/navigation';

interface DateRangePickerProps {
    initialDate: Date | null;
    isCustom: boolean;
    presetDates?: { label: string; date: Date }[];
    onDateChange?: () => void;
}

export function DateRangePicker({
    initialDate,
    isCustom,
    presetDates = [],
    onDateChange,
}: DateRangePickerProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedDate, setSelectedDate] = useState<string>(
        initialDate ? initialDate.toISOString().split('T')[0] : '',
    );
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);

        startTransition(async () => {
            const dateStr = newDate ? `${newDate}T00:00:00.000Z` : null;
            await updateDataStartDate(dateStr);
            onDateChange?.();
            router.refresh();
        });
    };

    const handlePresetClick = (date: Date) => {
        const dateStr = date.toISOString();
        setSelectedDate(date.toISOString().split('T')[0]);
        setShowDatePicker(false);

        startTransition(async () => {
            await updateDataStartDate(dateStr);
            onDateChange?.();
            router.refresh();
        });
    };

    const handleResetToDefault = () => {
        setSelectedDate('');
        setShowDatePicker(false);

        startTransition(async () => {
            await updateDataStartDate(null);
            onDateChange?.();
            router.refresh();
        });
    };

    const formatDisplayDate = () => {
        if (!initialDate) return 'From start';
        return initialDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <span
                        className={
                            isCustom
                                ? 'text-gray-900 font-medium'
                                : 'text-gray-700'
                        }
                    >
                        {formatDisplayDate()}
                    </span>
                    {isCustom && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                            Custom
                        </span>
                    )}
                </button>

                {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px]">
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-semibold text-gray-900">
                                Data starts from:
                            </label>

                            {/* Preset buttons */}
                            <div className="flex flex-wrap gap-2">
                                {presetDates.map((preset, index) => (
                                    <button
                                        key={index}
                                        onClick={() =>
                                            handlePresetClick(preset.date)
                                        }
                                        className="text-xs px-2 py-1.5 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
                                        disabled={isPending}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                <button
                                    onClick={handleResetToDefault}
                                    className="text-xs px-2 py-1.5 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
                                    disabled={isPending}
                                >
                                    From start
                                </button>
                            </div>

                            <div className="border-t border-gray-200 my-2"></div>

                            {/* Custom date picker */}
                            <label className="text-sm font-medium text-gray-700">
                                Or select custom date:
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                disabled={isPending}
                            />
                        </div>
                    </div>
                )}
            </div>
            {isPending && (
                <span className="text-xs text-gray-600">Updating...</span>
            )}
        </div>
    );
}
