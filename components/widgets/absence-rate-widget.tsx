"use client";

import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";

interface AbsenceRateWidgetProps {
    absenceRate: number;
    totalAbsences: number;
    totalRealLessons: number;
    hasAccess: boolean;
    requiredPlanName?: string;
}

export function AbsenceRateWidget({
    absenceRate,
    totalAbsences,
    totalRealLessons,
    hasAccess,
    requiredPlanName = "Premium",
}: AbsenceRateWidgetProps) {
    const { chartColors } = useSettings();
    const primaryColor = chartColors[0] || "#3b82f6";

    if (!hasAccess) {
        return (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full flex flex-col items-center justify-center text-center">
                <div className="bg-muted rounded-full p-4 mb-4">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                    Absence Rate Widget
                </h3>
                <p className="text-muted-foreground mb-4">
                    This widget is available on the {requiredPlanName} plan.
                </p>
                <button
                    onClick={() => (window.location.href = "/premium")}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    View plans
                </button>
            </div>
        );
    }

    // Determine severity level
    const getSeverity = () => {
        if (absenceRate < 10)
            return {
                color: "text-success",
                bg: "bg-success/10",
                label: "Low",
                icon: <CheckCircle className="w-4 h-4" />,
            };
        if (absenceRate < 20)
            return {
                color: "text-warning",
                bg: "bg-warning/10",
                label: "Medium",
                icon: <AlertCircle className="w-4 h-4" />,
            };
        return {
                color: "text-destructive",
                bg: "bg-destructive/10",
            label: "High",
            icon: <AlertTriangle className="w-4 h-4" />,
        };
    };

    const severity = getSeverity();

    return (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-full">
            <div className="flex flex-col gap-6">
                {/* Progress bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                            Absence Rate
                        </span>
                        <span className="text-2xl font-bold text-foreground">
                            {absenceRate.toFixed(2)}%
                        </span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                absenceRate < 10
                                    ? "bg-success"
                                    : absenceRate < 20
                                      ? "bg-warning"
                                      : "bg-destructive"
                            }`}
                            style={{ width: `${Math.min(absenceRate, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Absences</span>
                        <span className="text-sm font-medium text-foreground">
                            {totalAbsences} out of {totalRealLessons} real
                            lessons
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Severity</span>
                        <span
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${severity.bg} ${severity.color}`}
                        >
                            {severity.icon}
                            {severity.label}
                        </span>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Recommendations
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        {absenceRate < 10
                            ? "Great job! Your absence rate is very low."
                            : absenceRate < 20
                              ? "Your absence rate is moderate. Try to keep it below 10%."
                              : "Your absence rate is high. Consider improving your attendance."}
                    </p>
                </div>
            </div>
        </div>
    );
}
