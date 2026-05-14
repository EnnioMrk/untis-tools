"use client";

import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import type { SubjectBreakdownItem } from "@/types/widget";
import { formatSubjectDisplayName } from "@/lib/subject";
import { useSettings } from "@/components/providers/settings-provider";

interface AbsenceRecommenderProps {
    data: SubjectBreakdownItem[];
    hasAccess: boolean;
    requiredPlanName?: string;
}

type Severity = "critical" | "warning" | "caution" | "good";

interface SubjectCardProps {
    subject: string;
    absenceRate: number;
    realLessons: number;
    absences: number;
    severity: Severity;
    hasAccess: boolean;
}

function SubjectCard({
    subject,
    absenceRate,
    realLessons,
    absences,
    severity,
    hasAccess,
}: SubjectCardProps) {
    const getSeverityStyles = () => {
        switch (severity) {
            case "critical":
                return {
                    bg: "bg-destructive/10",
                    border: "border-destructive/20",
                    icon: <XCircle className="w-5 h-5 text-destructive" />,
                    badge: "bg-destructive/10 text-destructive",
                    text: "Critical",
                };
            case "warning":
                return {
                    bg: "bg-warning/10",
                    border: "border-warning/20",
                    icon: <AlertTriangle className="w-5 h-5 text-warning" />,
                    badge: "bg-warning/10 text-warning",
                    text: "Warning",
                };
            case "caution":
                return {
                    bg: "bg-warning/10",
                    border: "border-warning/20",
                    icon: <AlertCircle className="w-5 h-5 text-warning" />,
                    badge: "bg-warning/10 text-warning",
                    text: "Caution",
                };
            case "good":
                return {
                    bg: "bg-success/10",
                    border: "border-success/20",
                    icon: <CheckCircle className="w-5 h-5 text-success" />,
                    badge: "bg-success/10 text-success",
                    text: "Good",
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
                        <h4 className="font-medium text-foreground">{subject}</h4>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <span
                            className={`text-xs font-medium px-2 py-1 rounded ${styles.badge}`}
                        >
                            {styles.text}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {absenceRate.toFixed(1)}% absence rate
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                        {absences}/{realLessons}
                    </p>
                    <p className="text-xs text-muted-foreground">absences</p>
                </div>
            </div>
            {severity === "good" && hasAccess && (
                <p className="text-xs text-success mt-2">
                    Can miss up to {remainingAbsences} more lesson
                    {remainingAbsences !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}

function getSeverity(absenceRate: number): Severity {
    if (absenceRate >= 25) return "critical";
    if (absenceRate >= 18) return "warning";
    if (absenceRate >= 12) return "caution";
    return "good";
}

export function AbsenceRecommender({
    data,
    hasAccess,
    requiredPlanName = "Premium",
}: AbsenceRecommenderProps) {
    // Sort by absence rate descending
    const sortedData = [...data].sort((a, b) => b.absenceRate - a.absenceRate);

    if (sortedData.length === 0) {
        return (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full flex items-center justify-center">
                <div className="text-center">
                     <p className="text-muted-foreground">No subject data available</p>
                     <p className="text-sm text-muted-foreground mt-1">
                        Data will appear after syncing with Untis
                    </p>
                </div>
            </div>
        );
    }

    return (
             <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full">
            <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-foreground">
                    Absence Recommender
                </h3>
                {!hasAccess && (
                         <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        {requiredPlanName}
                    </span>
                )}
            </div>

            {!hasAccess ? (
                <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] text-center">
                     <div className="bg-muted rounded-lg p-6 max-w-sm">
                         <h4 className="font-medium text-foreground mb-2">
                            Unlock Absence Recommender
                        </h4>
                         <p className="text-sm text-muted-foreground mb-4">
                            See which subjects you can safely miss without
                            exceeding your absence limit on the{" "}
                            {requiredPlanName} plan.
                        </p>
                         <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
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
                            realLessons={Math.max(
                                0,
                                item.total - item.cancelled,
                            )}
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
