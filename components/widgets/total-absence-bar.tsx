'use client';

interface TotalAbsenceBarProps {
  absenceRate: number;
  totalAbsences: number;
  totalRealLessons: number;
}

// Calculate color from green to red based on percentage
// 0% = green, 33.33% = red, beyond = darker red
function getAbsenceColor(percentage: number): string {
  if (percentage <= 0) return 'rgb(34, 197, 94)'; // green-500
  
  const maxRed = 33.33; // 1/3 is red
  const ratio = Math.min(percentage / maxRed, 1);
  
  // Interpolate from green (34, 197, 94) to red (239, 68, 68)
  const r = Math.round(34 + (239 - 34) * ratio);
  const g = Math.round(197 - (197 - 68) * ratio);
  const b = Math.round(94 - (94 - 68) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
}

// Determine severity level based on absence percentage
function getSeverity(percentage: number): { label: string; color: string } {
  if (percentage < 5) return { label: 'Excellent', color: '' };
  if (percentage < 10) return { label: 'Low', color: '' };
  if (percentage < 20) return { label: 'Medium', color: '' };
  if (percentage < 33.33) return { label: 'High', color: '' };
  return { label: 'Critical', color: '' };
}

export function TotalAbsenceBar({
  absenceRate,
  totalAbsences,
  totalRealLessons,
}: TotalAbsenceBarProps) {
  const color = getAbsenceColor(absenceRate);
  const severity = getSeverity(absenceRate);
  const barWidth = Math.min(absenceRate, 100);

  // Check if there's no data available
  const hasNoData = totalRealLessons === 0 && totalAbsences === 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col justify-center">
      <div className="flex flex-col gap-4">
        {/* Bar and percentage */}
        <div className="flex items-center gap-4">
          {/* Thick bar */}
          <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: hasNoData ? '0%' : `${barWidth}%`,
                backgroundColor: hasNoData ? 'rgb(156, 163, 175)' : color
              }}
            />
          </div>
          
          {/* Percentage */}
          <span 
            className="text-2xl font-bold min-w-[80px] text-right"
            style={{ color: hasNoData ? 'rgb(156, 163, 175)' : color }}
          >
            {hasNoData ? 'N/A' : `${absenceRate.toFixed(1)}%`}
          </span>
        </div>
        
        {/* Bottom row: absences count and severity */}
        <div className="flex items-center justify-between">
          {/* Absences count - left aligned */}
          <span className="text-sm text-gray-500">
            {hasNoData 
              ? 'No lesson data available'
              : `${totalAbsences} absences out of ${totalRealLessons} real lessons`
            }
          </span>
          
          {/* Severity - right aligned, same color as bar */}
          <span 
            className="text-sm font-semibold"
            style={{ color: hasNoData ? 'rgb(156, 163, 175)' : color }}
          >
            {hasNoData ? 'No Data' : severity.label}
          </span>
        </div>
      </div>
    </div>
  );
}
