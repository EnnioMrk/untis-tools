"use client";

import { X } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { settings, isLoading, updateSettings } = useSettings();

    if (!settings && !isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Einstellungen
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-900">
                                Kurzbezeichnungen verwenden
                            </label>
                            <p className="text-sm text-gray-500">
                                Zeigt Fachnamen wie &ldquo;Ma&rdquo; statt &ldquo;Mathematik&rdquo;
                            </p>
                        </div>
                        <button
                            onClick={() =>
                                updateSettings({
                                    useShortSubjectNames: !settings?.useShortSubjectNames,
                                })
                            }
                            disabled={isLoading}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings?.useShortSubjectNames
                                    ? "bg-blue-600"
                                    : "bg-gray-300"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                    settings?.useShortSubjectNames
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-900">
                                Nur unentschuldigte Fehlstunden anzeigen
                            </label>
                            <p className="text-sm text-gray-500">
                                Filtert entschuldigte Fehlstunden aus den Statistiken heraus
                            </p>
                        </div>
                        <button
                            onClick={() =>
                                updateSettings({
                                    showOnlyUnexcusedAbsences: !settings?.showOnlyUnexcusedAbsences,
                                })
                            }
                            disabled={isLoading}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings?.showOnlyUnexcusedAbsences
                                    ? "bg-blue-600"
                                    : "bg-gray-300"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                    settings?.showOnlyUnexcusedAbsences
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}