'use client';

import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { SubjectBreakdownItem } from '@/types/widget';
import { formatSubjectDisplayName } from '@/lib/subject';

interface AbsenceRecommenderProps {
  data: SubjectBreakdownItem[];
  hasAccess: boolean;
  requiredPlanName?: string;
}

type Severity = 'critical' | 'warning' | 'caution' | 'good';

interface SubjectCardProps {
  subject: string;
  absenceRate: number;
  realLessons: number;
  absences: number;
  severity: Severity;
  hasAccess: boolean;
}

function SubjectCard({ subject, absenceRate, realLessons, absences, severity, hasAccess }: SubjectCardProps) {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          badge: 'bg-red-100 text-red-700',
          text: 'Critical',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
          badge: 'bg-orange-100 text-orange-700',
          text: 'Warning',
        };
      case 'caution':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
          badge: 'bg-yellow-100 text-yellow-700',
          text: 'Caution',
        };
      case 'good':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          badge: 'bg-green-100 text-green-700',
          text: 'Good',
        };
    }
  };

  const styles = getSeverityStyles();

  // Calculate how many more absences they can afford (assuming 25% max safe rate)
  const maxSafeAbsences = Math.floor(realLessons * 0.25);
  const remainingAbsences = Math.max(0, maxSafeAbsences - absences);

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {styles.icon}
            <h4 className="font-medium text-gray-900">{subject}</h4>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${styles.badge}`}>
              {styles.text}
            </span>
            <span className="text-sm text-gray-600">
              {absenceRate.toFixed(1)}% absence rate
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{absences}/{realLessons}</p>
          <p className="text-xs text-gray-500">absences</p>
        </div>
      </div>
      {severity === 'good' && hasAccess && (
        <p className="text-xs text-green-600 mt-2">
          Can miss up to {remainingAbsences} more lesson{remainingAbsences !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

function getSeverity(absenceRate: number): Severity {
  if (absenceRate >= 25) return 'critical';
  if (absenceRate >= 18) return 'warning';
  if (absenceRate >= 12) return 'caution';
  return 'good';
}

export function AbsenceRecommender({ data, hasAccess, requiredPlanName = 'Premium' }: AbsenceRecommenderProps) {
  // Sort by absence rate descending
  const sortedData = [...data].sort((a, b) => b.absenceRate - a.absenceRate);

  if (sortedData.length === 0) {
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Absence Recommender</h3>
        {!hasAccess && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            {requiredPlanName}
          </span>
        )}
      </div>
      
      {!hasAccess ? (
        <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] text-center">
          <div className="bg-gray-50 rounded-lg p-6 max-w-sm">
            <h4 className="font-medium text-gray-900 mb-2">Unlock Absence Recommender</h4>
            <p className="text-sm text-gray-600 mb-4">
              See which subjects you can safely miss without exceeding your absence limit on the {requiredPlanName} plan.
            </p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              View plans
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-100 pr-2">
          {sortedData.map((item) => (
            <SubjectCard
              key={item.subject}
              subject={formatSubjectDisplayName(item.subject)}
              absenceRate={item.absenceRate}
              realLessons={Math.max(0, item.total - item.cancelled)}
              absences={item.absences}
              severity={getSeverity(item.absenceRate)}
              hasAccess={hasAccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}
