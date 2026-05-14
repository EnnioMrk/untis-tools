'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { DailyTrendItem } from '@/types/widget';
import { useSettings } from '@/components/providers/settings-provider';

interface AbsenceTrendChartProps {
  data: DailyTrendItem[];
}

export function AbsenceTrendChart({ data }: AbsenceTrendChartProps) {
  const { chartColors } = useSettings();
  const primaryColor = chartColors[0] || '#3b82f6';

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    fullDate: new Date(item.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    }),
    absenceRate: item.absenceRate,
    absences: item.absences,
    totalLessons: item.totalLessons,
  }));

  // Calculate Y-axis domain with dynamic margin (0 margin, only round to nearest 5)
  const absenceRates = chartData.map(d => d.absenceRate).filter(r => r > 0);
  const minRate = absenceRates.length > 0 ? Math.min(...absenceRates) : 0;
  const maxRate = absenceRates.length > 0 ? Math.max(...absenceRates) : 0;

  // Round to nearest 5 (but don't add extra margin)
  const yMin = Math.max(0, Math.floor(minRate / 5) * 5);
  const yMax = Math.min(100, Math.ceil(maxRate / 5) * 5);
  const yDomain = [yMin, Math.max(yMin + 10, yMax)]; // Ensure at least 10% range

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No trend data available</p>
          <p className="text-sm text-muted-foreground mt-1">Data will appear after syncing with Untis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Cumulative Absence Trend (30 Days)</h3>
      <div className="h-[calc(100%-3rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="absenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              domain={[yMin, yMax]}
              ticks={Array.from({ length: Math.floor((yMax - yMin) / 5) + 1 }, (_, i) => yMin + i * 5)}
              tickFormatter={(value) => `${value}%`}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border p-3 shadow-lg rounded-lg">
                      <p className="font-medium text-foreground">{data.fullDate}</p>
                      <p className="text-sm text-muted-foreground">
                        Cumulative Absence Rate: <span className="font-medium" style={{ color: primaryColor }}>{data.absenceRate.toFixed(1)}%</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Absences: <span className="font-medium">{data.absences}</span> of {data.totalLessons} real lessons
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="absenceRate"
              stroke={primaryColor}
              strokeWidth={2}
              fill="url(#absenceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
