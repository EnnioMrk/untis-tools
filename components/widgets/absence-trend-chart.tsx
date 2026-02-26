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

interface AbsenceTrendChartProps {
  data: DailyTrendItem[];
}

export function AbsenceTrendChart({ data }: AbsenceTrendChartProps) {
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No trend data available</p>
          <p className="text-sm text-gray-400 mt-1">Data will appear after syncing with Untis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Absence Trend (30 Days)</h3>
      <div className="h-[calc(100%-3rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="absenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              domain={[yMin, yMax]}
              ticks={Array.from({ length: Math.floor((yMax - yMin) / 5) + 1 }, (_, i) => yMin + i * 5)}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
                      <p className="font-medium text-gray-900">{data.fullDate}</p>
                      <p className="text-sm text-gray-600">
                        Cumulative Absence Rate: <span className="font-medium text-blue-600">{data.absenceRate.toFixed(1)}%</span>
                      </p>
                      <p className="text-sm text-gray-600">
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
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#absenceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
