'use client';

import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface AbsenceRateWidgetProps {
  absenceRate: number;
  totalAbsences: number;
  totalRealLessons: number;
  isPremium: boolean;
}

export function AbsenceRateWidget({
  absenceRate,
  totalAbsences,
  totalRealLessons,
  isPremium,
}: AbsenceRateWidgetProps) {
  if (!isPremium) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <AlertTriangle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Absence Rate Widget
        </h3>
        <p className="text-gray-500 mb-4">
          This widget is available for Premium users only.
        </p>
        <button
          onClick={() => window.location.href = '/premium'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade to Premium
        </button>
      </div>
    );
  }

  // Determine severity level
  const getSeverity = () => {
    if (absenceRate < 10) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Low', icon: <CheckCircle className="w-4 h-4" /> };
    if (absenceRate < 20) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Medium', icon: <AlertCircle className="w-4 h-4" /> };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'High', icon: <AlertTriangle className="w-4 h-4" /> };
  };

  const severity = getSeverity();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex flex-col gap-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Absence Rate</span>
            <span className="text-2xl font-bold text-gray-900">{absenceRate.toFixed(2)}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                absenceRate < 10 ? 'bg-green-500' :
                absenceRate < 20 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(absenceRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Absences</span>
            <span className="text-sm font-medium text-gray-900">
              {totalAbsences} out of {totalRealLessons} real lessons
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Severity</span>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${severity.bg} ${severity.color}`}>
              {severity.icon}
              {severity.label}
            </span>
          </div>
        </div>

        {/* Recommendations */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
          <p className="text-sm text-gray-600">
            {absenceRate < 10 ? 'Great job! Your absence rate is very low.' :
             absenceRate < 20 ? 'Your absence rate is moderate. Try to keep it below 10%.' :
             'Your absence rate is high. Consider improving your attendance.'}
          </p>
        </div>
      </div>
    </div>
  );
}
