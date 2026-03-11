'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SubjectBreakdownItem } from '@/types/widget';
import { formatSubjectDisplayName } from '@/lib/subject';

interface AbsenceBarChartProps {
  data: SubjectBreakdownItem[];
}

// Color palette for subjects
const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#eab308', // yellow
  '#6366f1', // indigo
  '#ef4444', // red
  '#22c55e', // green
  '#06b6d4', // cyan
];

export function AbsenceBarChart({ data }: AbsenceBarChartProps) {
  // Sort data by absences descending
  const sortedData = [...data].sort((a, b) => b.absences - a.absences);

  // Take top 10 subjects
  const chartData = sortedData.slice(0, 10).map((item) => ({
    name: formatSubjectDisplayName(item.subject),
    fullName: formatSubjectDisplayName(item.subject),
    absences: item.absences,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No absence data available</p>
          <p className="text-sm text-gray-400 mt-1">Data will appear after syncing with Untis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Absences by Subject</h3>
      <div className="h-[calc(100%-3rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            barCategoryGap="10%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              interval={0}
              tick={{ fontSize: 11 }}
              height={28}
              padding={{ left: 0, right: 0 }}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              allowDecimals={false}
              width={28}
              domain={[0, 'dataMax']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
                      <p className="font-medium text-gray-900">{data.fullName}</p>
                      <p className="text-sm text-gray-600">
                        Absences: <span className="font-medium">{data.absences}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="absences" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
