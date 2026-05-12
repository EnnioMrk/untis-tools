"use client";

import { createContext, useContext, useState } from "react";

interface UserSettings {
    useShortSubjectNames: boolean;
    showOnlyUnexcusedAbsences: boolean;
}

interface SettingsContextValue {
    settings: UserSettings | null;
    isLoading: boolean;
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
    settings: null,
    isLoading: true,
    updateSettings: async () => {},
});

export function SettingsProvider({
    children,
    initialSettings,
}: {
    children: React.ReactNode;
    initialSettings: UserSettings | null;
}) {
    const [settings, setSettings] = useState<UserSettings | null>(initialSettings);
    const [isLoading, setIsLoading] = useState(false);

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newSettings),
            });

            if (response.ok) {
                const updated = await response.json();
                setSettings(updated);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within SettingsProvider");
    }
    return context;
}