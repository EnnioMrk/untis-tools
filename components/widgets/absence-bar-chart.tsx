"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import type { SubjectBreakdownItem } from "@/types/widget";
import { formatSubjectName } from "@/lib/subject";
import { useSettings } from "@/components/providers/settings-provider";

interface AbsenceBarChartProps {
    data: SubjectBreakdownItem[];
}

export function AbsenceBarChart({ data }: AbsenceBarChartProps) {
    const { chartColors, settings } = useSettings();
    const useShort = settings?.useShortSubjectNames ?? true;

    // Sort data by absences descending
    const sortedData = [...data].sort((a, b) => b.absences - a.absences);

    // Take top 10 subjects
    const chartData = sortedData.slice(0, 10).map((item) => ({
        name: formatSubjectName(item.subject, useShort),
        fullName: formatSubjectName(item.subject, useShort),
        absences: item.absences,
    }));

    if (chartData.length === 0) {
        return (
            <div className="bg-card rounded-lg border border-border p-6 h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-foreground">No absence data available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Data will appear after syncing with Untis
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-lg border border-border p-6 pb-0 h-full">
            <h3 className="text-lg font-semibold text-foreground mb-4">
                Absences by Subject
            </h3>
            <div className="h-[calc(100%-3rem)]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
                        barCategoryGap="10%"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="name"
                            interval={0}
                             tick={({ x, y, index, payload }) => {
                                 const isStaggered = !useShort;
                                 const offsetY = isStaggered ? (index % 2 === 0 ? -10 : 10) : 0;
                                 return (
                                     <text x={x} y={Number(y) + 12 + offsetY} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
                                         {payload.value}
                                     </text>
                                 );
                             }}
                            height={!useShort ? 45 : 28}
                            padding={{ left: 10, right: 10 }}
                            tickMargin={8}
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            allowDecimals={false}
                            width={28}
                            domain={[0, "dataMax"]}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-card p-3 shadow-lg rounded-lg border border-border">
                                            <p className="font-medium text-foreground">
                                                {data.fullName}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Absences:{" "}
                                                <span className="font-medium text-foreground">
                                                    {data.absences}
                                                </span>
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="absences" radius={[4, 4, 0, 0]}>
                            {chartData.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={chartColors[index % chartColors.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
