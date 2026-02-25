'use client';

import { TrendingUp, TrendingDown, Minus, Calendar, Clock, BarChart3, Infinity } from 'lucide-react';
import type { TrendData } from '@/types/widget';

interface KPICardProps {
  title: string;
  value: number;
  trend: TrendData | null;
  icon: React.ReactNode;
  iconBg: string;
}

function KPICard({ title, value, trend, icon, iconBg }: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend || trend.direction === 'neutral') {
      return <Minus className="w-4 h-4" />;
    }
    return trend.direction === 'up' ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend.direction === 'neutral') {
      return 'text-gray-500';
    }
    // For absences, up is bad (red), down is good (green)
    return trend.direction === 'up' ? 'text-red-500' : 'text-green-500';
  };

  const formatTrend = () => {
    if (!trend || trend.changePercent === null) {
      return 'No previous data';
    }
    const sign = trend.changePercent >= 0 ? '+' : '';
    return `${sign}${trend.changePercent.toFixed(1)}% from previous`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{formatTrend()}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface KPICardsProps {
  absences7Days: number;
  absences14Days: number;
  absences30Days: number;
  absencesAllTime: number;
  trend7Days: TrendData | null;
  trend14Days: TrendData | null;
  trend30Days: TrendData | null;
}

export function KPICards({
  absences7Days,
  absences14Days,
  absences30Days,
  absencesAllTime,
  trend7Days,
  trend14Days,
  trend30Days,
}: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      <KPICard
        title="Last 7 Days"
        value={absences7Days}
        trend={trend7Days}
        icon={<Calendar className="w-6 h-6 text-blue-600" />}
        iconBg="bg-blue-100"
      />
      <KPICard
        title="Last 14 Days"
        value={absences14Days}
        trend={trend14Days}
        icon={<Clock className="w-6 h-6 text-purple-600" />}
        iconBg="bg-purple-100"
      />
      <KPICard
        title="Last 30 Days"
        value={absences30Days}
        trend={trend30Days}
        icon={<BarChart3 className="w-6 h-6 text-orange-600" />}
        iconBg="bg-orange-100"
      />
      <KPICard
        title="All Time"
        value={absencesAllTime}
        trend={null}
        icon={<Infinity className="w-6 h-6 text-green-600" />}
        iconBg="bg-green-100"
      />
    </div>
  );
}

// Individual KPI widget components for the grid
interface SingleKPIWidgetProps {
  type: 'KPI_7DAYS' | 'KPI_14DAYS' | 'KPI_30DAYS' | 'KPI_ALLTIME';
  absences7Days: number;
  absences14Days: number;
  absences30Days: number;
  absencesAllTime: number;
  trend7Days: TrendData | null;
  trend14Days: TrendData | null;
  trend30Days: TrendData | null;
}

export function SingleKPIWidget({
  type,
  absences7Days,
  absences14Days,
  absences30Days,
  absencesAllTime,
  trend7Days,
  trend14Days,
  trend30Days,
}: SingleKPIWidgetProps) {
  const config = {
    KPI_7DAYS: {
      title: 'Last 7 Days',
      value: absences7Days,
      trend: trend7Days,
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      iconBg: 'bg-blue-100',
    },
    KPI_14DAYS: {
      title: 'Last 14 Days',
      value: absences14Days,
      trend: trend14Days,
      icon: <Clock className="w-6 h-6 text-purple-600" />,
      iconBg: 'bg-purple-100',
    },
    KPI_30DAYS: {
      title: 'Last 30 Days',
      value: absences30Days,
      trend: trend30Days,
      icon: <BarChart3 className="w-6 h-6 text-orange-600" />,
      iconBg: 'bg-orange-100',
    },
    KPI_ALLTIME: {
      title: 'All Time',
      value: absencesAllTime,
      trend: null,
      icon: <Infinity className="w-6 h-6 text-green-600" />,
      iconBg: 'bg-green-100',
    },
  };

  const { title, value, trend, icon, iconBg } = config[type];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-400 mt-1">absences</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${
              !trend || trend.direction === 'neutral' ? 'text-gray-500' :
              trend.direction === 'up' ? 'text-red-500' : 'text-green-500'
            }`}>
              {trend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {typeof trend?.changePercent === 'number'
                  ? `${trend.changePercent >= 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%`
                  : 'No change'}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
