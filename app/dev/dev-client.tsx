'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RawUntisData, UntisDataFilter } from './actions';
import { getStoredUserStats } from './actions';

interface DevTestClientProps {
  rawData: RawUntisData;
  storedStats: Awaited<ReturnType<typeof getStoredUserStats>>;
  currentFilter?: UntisDataFilter;
}

type TabType = 'lessons' | 'absences' | 'stats' | 'filter';

export function DevTestClient({ rawData, storedStats, currentFilter }: DevTestClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('filter');
  const [startDate, setStartDate] = useState(currentFilter?.startDate || getDefaultStartDate());
  const [endDate, setEndDate] = useState(currentFilter?.endDate || getDefaultEndDate());

  // Filter lessons based on date range
  const filteredLessons = useMemo(() => {
    if (!startDate || !endDate) return rawData.lessons;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return rawData.lessons.filter(lesson => {
      const lessonDate = new Date(lesson.date);
      return lessonDate >= start && lessonDate <= end;
    });
  }, [rawData.lessons, startDate, endDate]);

  // Filter absences based on date range
  const filteredAbsences = useMemo(() => {
    if (!startDate || !endDate) return rawData.absences;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return rawData.absences.filter(absence => {
      const absenceDate = new Date(absence.date);
      return absenceDate >= start && absenceDate <= end;
    });
  }, [rawData.absences, startDate, endDate]);

  // Calculate stats for filtered data
  const calculatedStats = useMemo(() => {
    const lessons = filteredLessons;
    const absences = filteredAbsences;

    const totalLessons = lessons.length;
    const cancelledLessons = lessons.filter(l => l.code === 'cancelled').length;
    const actualLessons = totalLessons - cancelledLessons;
    
    // Find lessons that overlap with absences
    const absentLessonIds = new Set<number>();
    absences.forEach(absence => {
      lessons.forEach(lesson => {
        if (lesson.date === absence.date) {
          // Check time overlap
          const lessonStart = parseInt(lesson.startTime.replace(':', ''));
          const lessonEnd = parseInt(lesson.endTime.replace(':', ''));
          const absenceStart = parseInt(absence.startTime.replace(':', ''));
          const absenceEnd = parseInt(absence.endTime.replace(':', ''));
          
          if (lessonStart < absenceEnd && lessonEnd > absenceStart) {
            absentLessonIds.add(lesson.id);
          }
        }
      });
    });

    const totalAbsences = absentLessonIds.size;
    const attendanceRate = actualLessons > 0 
      ? Math.round(((actualLessons - totalAbsences) / actualLessons) * 100 * 100) / 100 
      : 100;

    // Subject breakdown
    const subjectMap = new Map<string, { total: number; absent: number; cancelled: number }>();
    lessons.forEach(lesson => {
      const subject = lesson.subject || 'Unknown';
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { total: 0, absent: 0, cancelled: 0 });
      }
      const stats = subjectMap.get(subject)!;
      stats.total++;
      if (lesson.code === 'cancelled') {
        stats.cancelled++;
      } else if (absentLessonIds.has(lesson.id)) {
        stats.absent++;
      }
    });

    const subjectBreakdown = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
      subject,
      total: stats.total,
      attended: stats.total - stats.absent - stats.cancelled,
      absences: stats.absent,
      cancelled: stats.cancelled,
      absenceRate: (stats.total - stats.cancelled) > 0 
        ? Math.round((stats.absent / (stats.total - stats.cancelled)) * 100 * 100) / 100 
        : 0,
    }));

    // Daily trend
    const dailyMap = new Map<string, { total: number; absences: number }>();
    lessons.forEach(lesson => {
      if (!dailyMap.has(lesson.date)) {
        dailyMap.set(lesson.date, { total: 0, absences: 0 });
      }
      const stats = dailyMap.get(lesson.date)!;
      if (!lesson.code) {
        stats.total++;
        if (absentLessonIds.has(lesson.id)) {
          stats.absences++;
        }
      }
    });

    const dailyTrend = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        totalLessons: stats.total,
        absences: stats.absences,
        absenceRate: stats.total > 0 
          ? Math.round((stats.absences / stats.total) * 100 * 100) / 100 
          : 0,
      }));

    return {
      totalLessons,
      cancelledLessons,
      actualLessons,
      totalAbsences,
      attendanceRate,
      subjectBreakdown,
      dailyTrend,
    };
  }, [filteredLessons, filteredAbsences]);

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    router.push(`/dev?${params.toString()}`);
  };

  const clearFilter = () => {
    router.push('/dev');
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dev-Test-Bereich</h1>
        <p className="text-gray-600">
          Alle Untis-Daten ansehen und wie Datumsfilter die Statistiken beeinflussen.
        </p>
        {rawData.lastSyncAt && (
          <p className="text-sm text-gray-500 mt-1">
            Zuletzt synchronisiert: {new Date(rawData.lastSyncAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['filter', 'lessons', 'absences', 'stats'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'lessons' && <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">{filteredLessons.length}</span>}
            {tab === 'absences' && <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">{filteredAbsences.length}</span>}
          </button>
        ))}
      </div>

      {/* Filter Tab */}
      {activeTab === 'filter' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Datums-Bereich Filter</h2>
          <p className="text-gray-600 mb-6">
            Passen Sie Start- und Enddatum an, um die Untis-Daten zu filtern. 
            Dies zeigt, wie Daten nach Datum gefiltert werden.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startdatum
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enddatum
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Filter anwenden
              </button>
              <button
                onClick={clearFilter}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Zurücksetzen
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{calculatedStats.totalLessons}</div>
              <div className="text-sm text-gray-600">Gesamtstunden</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{calculatedStats.totalAbsences}</div>
              <div className="text-sm text-gray-600">Fehlzeiten</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{calculatedStats.cancelledLessons}</div>
              <div className="text-sm text-gray-600">Abgesagt</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{calculatedStats.attendanceRate}%</div>
              <div className="text-sm text-gray-600">Anwesenheitsquote</div>
            </div>
          </div>
        </div>
      )}

      {/* Lessons Tab */}
      {activeTab === 'lessons' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold">Stunden (Stundenplan)</h2>
            <p className="text-sm text-gray-600">
              Zeige {filteredLessons.length} von {rawData.lessons.length} Stunden
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
<thead className="bg-gray-50">
                 <tr>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Datum</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Zeit</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Fach</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Lehrer</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Räume</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                 </tr>
               </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLessons.slice(0, 100).map((lesson) => (
                  <tr key={lesson.id} className={lesson.code ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3 font-mono">{lesson.date}</td>
                    <td className="px-4 py-3 font-mono">{lesson.startTime} - {lesson.endTime}</td>
                    <td className="px-4 py-3">{lesson.subject || lesson.subjectLongName || '-'}</td>
                    <td className="px-4 py-3">{lesson.teachers.join(', ') || '-'}</td>
                    <td className="px-4 py-3">{lesson.rooms.join(', ') || '-'}</td>
                    <td className="px-4 py-3">
{lesson.code ? (
                         <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                           {lesson.code}
                         </span>
                       ) : (
                         <span className="text-green-600">Geplant</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
{filteredLessons.length > 100 && (
             <div className="p-4 text-center text-gray-500 bg-gray-50">
               Zeige die ersten 100 von {filteredLessons.length} Stunden
             </div>
           )}
        </div>
      )}

      {/* Absences Tab */}
      {activeTab === 'absences' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold">Fehlzeiten</h2>
            <p className="text-sm text-gray-600">
              Zeige {filteredAbsences.length} von {rawData.absences.length} Fehlzeiten
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
<thead className="bg-gray-50">
                 <tr>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Datum</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Zeit</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Fach</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Grund</th>
                   <th className="px-4 py-3 text-left font-medium text-gray-600">Entschuldigt</th>
                 </tr>
               </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAbsences.map((absence) => (
                  <tr key={absence.id} className={absence.isExcused ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-4 py-3 font-mono">{absence.date}</td>
                    <td className="px-4 py-3 font-mono">{absence.startTime} - {absence.endTime}</td>
                    <td className="px-4 py-3">{absence.subject || '-'}</td>
                    <td className="px-4 py-3">{absence.reason || '-'}</td>
<td className="px-4 py-3">
                       {absence.isExcused ? (
                         <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Entschuldigt</span>
                       ) : (
                         <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Nicht entschuldigt</span>
                       )}
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
{filteredAbsences.length === 0 && (
             <div className="p-8 text-center text-gray-500">
               Keine Fehlzeiten für den ausgewählten Zeitraum gefunden.
             </div>
           )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Calculated Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Berechnete Statistiken (Gefilterte Daten)</h2>
            <p className="text-gray-600 mb-4">
              Statistiken berechnet aus den gefilterten Stunden und Fehlzeiten im ausgewählten Zeitraum.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{calculatedStats.totalLessons}</div>
                <div className="text-sm text-gray-600">Gesamtstunden</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{calculatedStats.actualLessons}</div>
                <div className="text-sm text-gray-600">Tatsächliche Stunden</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">{calculatedStats.totalAbsences}</div>
                <div className="text-sm text-gray-600">Fehlzeiten</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-600">{calculatedStats.cancelledLessons}</div>
                <div className="text-sm text-gray-600">Abgesagt</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600">{calculatedStats.attendanceRate}%</div>
                <div className="text-sm text-gray-600">Anwesenheit</div>
              </div>
            </div>

            {/* Subject Breakdown */}
            <h3 className="text-lg font-semibold mb-3">Fach-Aufschlüsselung</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fach</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Gesamt</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Anwesend</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Fehlend</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Abgesagt</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Fehlquote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calculatedStats.subjectBreakdown.map((subject) => (
                    <tr key={subject.subject}>
                      <td className="px-4 py-3 font-medium">{subject.subject}</td>
                      <td className="px-4 py-3 text-right">{subject.total}</td>
                      <td className="px-4 py-3 text-right text-green-600">{subject.attended}</td>
                      <td className="px-4 py-3 text-right text-red-600">{subject.absences}</td>
                      <td className="px-4 py-3 text-right text-yellow-600">{subject.cancelled}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          subject.absenceRate > 20 ? 'bg-red-100 text-red-800' :
                          subject.absenceRate > 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {subject.absenceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stored Stats */}
          {storedStats && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Gespeicherte Statistiken (Letzte Synchronisation)</h2>
              <p className="text-gray-600 mb-4">
                Statistiken, die in der Datenbank vom letzten Synchronisationsvorgang gespeichert wurden.
                Diese wurden aus den letzten 30 Tagen Daten berechnet.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{storedStats.absences7Days}</div>
                  <div className="text-sm text-gray-600">Letzte 7 Tage</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{storedStats.absences14Days}</div>
                  <div className="text-sm text-gray-600">Letzte 14 Tage</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{storedStats.absences30Days}</div>
                  <div className="text-sm text-gray-600">Letzte 30 Tage</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{storedStats.totalAbsences}</div>
                  <div className="text-sm text-gray-600">Gesamt</div>
                </div>
              </div>

              {storedStats.lastCalculated && (
                <p className="text-sm text-gray-500">
                  Last calculated: {new Date(storedStats.lastCalculated).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Daily Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Täglicher Trend (Gefilterte Daten)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Datum</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Gesamtstunden</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Fehlzeiten</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Fehlquote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calculatedStats.dailyTrend.map((day) => (
                    <tr key={day.date}>
                      <td className="px-4 py-3 font-mono">{day.date}</td>
                      <td className="px-4 py-3 text-right">{day.totalLessons}</td>
                      <td className="px-4 py-3 text-right text-red-600">{day.absences}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="w-24 ml-auto bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, day.absenceRate)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{day.absenceRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

