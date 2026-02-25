'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SubjectBreakdownItem } from '@/types/widget';

interface SubjectBreakdownChartProps {
  data: SubjectBreakdownItem[];
}

export function SubjectBreakdownChart({ data }: SubjectBreakdownChartProps) {
  // Sort data by total lessons descending and take top 8
  const sortedData = [...data].sort((a, b) => b.total - a.total);
  const chartData = sortedData.slice(0, 8).map((item) => ({
    name: item.subject.length > 15 ? item.subject.substring(0, 15) + '...' : item.subject,
    fullName: item.subject,
    Attended: item.attended,
    Absences: item.absences,
    Cancelled: item.cancelled,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No subject data available</p>
          <p className="text-sm text-gray-400 mt-1">Data will appear after syncing with Untis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Breakdown</h3>
      <div className="h-[calc(100%-3rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
                      <p className="font-medium text-gray-900 mb-2">{data.fullName}</p>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500 mr-2" />
                          Attended: <span className="font-medium">{data.Attended}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-2" />
                          Absences: <span className="font-medium">{data.Absences}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="inline-block w-3 h-3 rounded-sm bg-gray-400 mr-2" />
                          Cancelled: <span className="font-medium">{data.Cancelled}</span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="square"
            />
            <Bar
              dataKey="Attended"
              stackId="a"
              fill="#6366f1"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Absences"
              stackId="a"
              fill="#ef4444"
            />
            <Bar
              dataKey="Cancelled"
              stackId="a"
              fill="#9ca3af"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
