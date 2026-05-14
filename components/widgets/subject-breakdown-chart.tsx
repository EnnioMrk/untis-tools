"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import type { SubjectBreakdownItem } from "@/types/widget";
import { formatSubjectName } from "@/lib/subject";
import { useSettings } from "@/components/providers/settings-provider";

interface SubjectBreakdownChartProps {
    data: SubjectBreakdownItem[];
}

export function SubjectBreakdownChart({ data }: SubjectBreakdownChartProps) {
    const { settings, chartColors } = useSettings();
    const useShort = settings?.useShortSubjectNames ?? true;
    
    // Sort data by total lessons descending and take top 8
    const sortedData = [...data].sort((a, b) => b.total - a.total);
    const chartData = sortedData.slice(0, 8).map((item) => ({
        name: formatSubjectName(item.subject, useShort),
        fullName: formatSubjectName(item.subject, useShort),
        Attended: item.attended,
        Absences: item.absences,
        Cancelled: item.cancelled,
    }));

    // Calculate YAxis width dynamically based on longest name
    const maxLen = Math.max(...chartData.map(d => d.name.length), 0);
    const yAxisWidth = Math.max(56, maxLen * 8);

    if (chartData.length === 0) {
        return (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-foreground">No subject data available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Data will appear after syncing with Untis
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-foreground mb-4">
                Subject Breakdown
            </h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 0, right: 8, left: -32, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            horizontal={true}
                            vertical={false}
                        />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            allowDecimals={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            width={yAxisWidth}
                            interval={0}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-popover p-3 shadow-lg rounded-lg border border-border">
                                            <p className="font-medium text-foreground mb-2">
                                                {data.fullName}
                                            </p>
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: chartColors[0] }} />
                                                    Attended:{" "}
                                                    <span className="font-medium text-foreground">
                                                        {data.Attended}
                                                    </span>
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: chartColors[1] }} />
                                                    Absences:{" "}
                                                    <span className="font-medium text-foreground">
                                                        {data.Absences}
                                                    </span>
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: chartColors[2] }} />
                                                    Cancelled:{" "}
                                                    <span className="font-medium text-foreground">
                                                        {data.Cancelled}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: "10px" }}
                            iconType="square"
                        />
                        <Bar
                            dataKey="Attended"
                            stackId="a"
                            fill={chartColors[0]}
                            radius={[0, 0, 0, 0]}
                        />
                        <Bar dataKey="Absences" stackId="a" fill={chartColors[1]} />
                        <Bar
                            dataKey="Cancelled"
                            stackId="a"
                            fill={chartColors[2]}
                            radius={[0, 4, 4, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
