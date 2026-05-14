"use client";

import { BookOpen, User, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { SubjectOverviewItem } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FaecherClientProps {
    subjects: SubjectOverviewItem[];
}

export function FaecherClient({ subjects }: FaecherClientProps) {
    if (subjects.length === 0) {
        return (
            <Card className="flex min-h-[400px] flex-col items-center justify-center p-8">
                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium text-foreground">
                    Keine Fächerauswahl gefunden
                </h3>
                <p className="text-center text-muted-foreground">
                    Verbinde deinen Untis-Account, um hier deine Fächer anzuzeigen.
                </p>
            </Card>
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
                    icon={<BookOpen className="h-5 w-5" />}
                />
                <StatsCard
                    label="Gesamtstunden"
                    value={subjects.reduce((sum, s) => sum + s.total, 0)}
                    icon={<Clock className="h-5 w-5" />}
                />
                <StatsCard
                    label="Gesamt-Fehlzeiten"
                    value={subjects.reduce((sum, s) => sum + s.absences, 0)}
                    icon={<XCircle className="h-5 w-5" />}
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
        subject.absenceRate < 5 ? "text-green-500" :
        subject.absenceRate < 10 ? "text-amber-500" : "text-red-500";

    return (
        <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                                {subject.subject}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {subject.shortName} {subject.id && `• ${subject.id}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {subject.teacherKuerzel && (
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{subject.teacherKuerzel}</span>
                        </div>
                    )}
                    
                    <Badge variant="outline" className={absenceColor}>
                        Fehlquote: {subject.absenceRate}%
                    </Badge>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatItem
                    label="Unterricht"
                    value={subject.total}
                    icon={<Clock className="h-4 w-4" />}
                />
                <StatItem
                    label="Anwesend"
                    value={subject.attended}
                    icon={<CheckCircle className="h-4 w-4" />}
                />
                <StatItem
                    label="Fehlzeiten"
                    value={subject.absences}
                    icon={<XCircle className="h-4 w-4" />}
                />
                <StatItem
                    label="Ausfall"
                    value={subject.cancelled}
                    icon={<AlertCircle className="h-4 w-4" />}
                />
            </div>

            <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Anwesenheitsquote</span>
                    <span>{attendanceRate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div 
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${attendanceRate}%` }}
                    />
                </div>
            </div>

            {subject.teacherName && (
                <div className="mt-3 pt-3 border-t border-border sm:hidden">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{subject.teacherName}</span>
                    </div>
                </div>
            )}
        </Card>
    );
}

interface StatItemProps {
    label: string;
    value: number;
    icon: React.ReactNode;
}

function StatItem({ label, value, icon }: StatItemProps) {
    return (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <div className="text-muted-foreground">
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
            </div>
        </div>
    );
}

interface StatsCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
}

function StatsCard({ label, value, icon }: StatsCardProps) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    {icon}
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}