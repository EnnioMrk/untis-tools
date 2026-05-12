"use client";

import { BookOpen } from "lucide-react";
import type { SubjectOverviewItem } from "./actions";

interface FaecherClientProps {
    subjects: SubjectOverviewItem[];
}

export function FaecherClient({ subjects }: FaecherClientProps) {
    if (subjects.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-8">
                <BookOpen className="mb-4 h-12 w-12 text-gray-300" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                    Keine Fächerauswahl gefunden
                </h3>
                <p className="text-center text-gray-500">
                    Verbinde deinen Untis-Account, um hier deine Fächer anzuzeigen.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Fach
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Kurzbezeichnung
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Unterrichtsstunden
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Anwesend
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Fehlzeiten
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Ausfall
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Fehlquote
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Lehrer
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {subjects.map((subject) => (
                            <tr
                                key={subject.id}
                                className="transition-colors hover:bg-gray-50/50"
                            >
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                    {subject.id}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    {subject.subject}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {subject.shortName}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-900">
                                    {subject.total}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-medium text-green-700">
                                        {subject.attended}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-medium text-red-700">
                                        {subject.absences}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                    {subject.cancelled}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${
                                            subject.absenceRate < 5
                                                ? "bg-green-50 text-green-700"
                                                : subject.absenceRate < 10
                                                  ? "bg-yellow-50 text-yellow-700"
                                                  : "bg-red-50 text-red-700"
                                        }`}
                                    >
                                        {subject.absenceRate}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {subject.teacherKuerzel ? (
                                        <span>
                                            <span className="font-medium">
                                                {subject.teacherKuerzel}
                                            </span>
                                            {subject.teacherName && (
                                                <span className="block text-xs text-gray-500">
                                                    {subject.teacherName}
                                                </span>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="text-sm font-medium text-gray-500">
                        Gesamte Fächer
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                        {subjects.length}
                    </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="text-sm font-medium text-gray-500">
                        Gesamtstunden
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                        {subjects.reduce((sum, s) => sum + s.total, 0)}
                    </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="text-sm font-medium text-gray-500">
                        Gesamt-Fehlzeiten
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                        {subjects.reduce((sum, s) => sum + s.absences, 0)}
                    </p>
                </div>
            </div>
        </div>
    );
}