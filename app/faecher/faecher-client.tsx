"use client";

import { BookOpen, User, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
        <div className="space-y-6">
            <div className="space-y-4">
                {subjects.map((subject) => (
                    <SubjectCard key={subject.id} subject={subject} />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatsCard
                    label="Gesamte Fächer"
                    value={subjects.length}
                    icon={<BookOpen className="h-5 w-5 text-blue-600" />}
                    color="blue"
                />
                <StatsCard
                    label="Gesamtstunden"
                    value={subjects.reduce((sum, s) => sum + s.total, 0)}
                    icon={<Clock className="h-5 w-5 text-indigo-600" />}
                    color="indigo"
                />
                <StatsCard
                    label="Gesamt-Fehlzeiten"
                    value={subjects.reduce((sum, s) => sum + s.absences, 0)}
                    icon={<XCircle className="h-5 w-5 text-red-600" />}
                    color="red"
                />
            </div>
        </div>
    );
}

interface SubjectCardProps {
    subject: SubjectOverviewItem;
}

function SubjectCard({ subject }: SubjectCardProps) {
    const attendanceRate = subject.total > 0 ? Math.round((subject.attended / subject.total) * 100) : 0;
    const absenceColor = 
        subject.absenceRate < 5 ? "text-green-600" :
        subject.absenceRate < 10 ? "text-amber-600" : "text-red-600";

    return (
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:shadow-md hover:border-gray-300">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 border border-gray-200">
                            <BookOpen className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                                {subject.subject}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {subject.shortName} {subject.id && `• ${subject.id}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {subject.teacherKuerzel && (
                        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{subject.teacherKuerzel}</span>
                        </div>
                    )}
                    
                    <div className="text-right">
                        <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${absenceColor} bg-opacity-10`}>
                            Fehlquote: {subject.absenceRate}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatItem
                    label="Unterricht"
                    value={subject.total}
                    icon={<Clock className="h-4 w-4" />}
                    bgColor="bg-blue-50"
                    textColor="text-blue-700"
                />
                <StatItem
                    label="Anwesend"
                    value={subject.attended}
                    icon={<CheckCircle className="h-4 w-4" />}
                    bgColor="bg-green-50"
                    textColor="text-green-700"
                />
                <StatItem
                    label="Fehlzeiten"
                    value={subject.absences}
                    icon={<XCircle className="h-4 w-4" />}
                    bgColor="bg-red-50"
                    textColor="text-red-700"
                />
                <StatItem
                    label="Ausfall"
                    value={subject.cancelled}
                    icon={<AlertCircle className="h-4 w-4" />}
                    bgColor="bg-amber-50"
                    textColor="text-amber-700"
                />
            </div>

            <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Anwesenheitsquote</span>
                    <span>{attendanceRate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div 
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                        style={{ width: `${attendanceRate}%` }}
                    />
                </div>
            </div>

            {subject.teacherName && (
                <div className="mt-3 pt-3 border-t border-gray-100 sm:hidden">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{subject.teacherName}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

interface StatItemProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
}

function StatItem({ label, value, icon, bgColor, textColor }: StatItemProps) {
    return (
        <div className={`flex items-center gap-2 rounded-lg ${bgColor} px-3 py-2`}>
            <div className={`${textColor}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-gray-600">{label}</p>
                <p className={`font-semibold ${textColor}`}>{value}</p>
            </div>
        </div>
    );
}

interface StatsCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: "blue" | "indigo" | "red";
}

function StatsCard({ label, value, icon, color }: StatsCardProps) {
    const colorClasses = {
        blue: "bg-blue-50 border-blue-100",
        indigo: "bg-indigo-50 border-indigo-100",
        red: "bg-red-50 border-red-100",
    };

    return (
        <div className={`rounded-xl border ${colorClasses[color]} p-4`}>
            <div className="flex items-center gap-3">
                {icon}
                <div>
                    <p className="text-sm font-medium text-gray-600">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
}