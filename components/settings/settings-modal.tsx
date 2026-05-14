"use client";

import { X } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { settings, isLoading, updateSettings } = useSettings();

    if (!settings) return null;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Settings
                    </DialogTitle>
                    <DialogDescription>
                        Customize your dashboard preferences
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">
                                Short Subject Names
                            </label>
                            <p className="text-sm text-muted-foreground">
                                Display abbreviations like "Ma" instead of "Mathematik"
                            </p>
                        </div>
                        <Switch
                            checked={settings.useShortSubjectNames}
                            onCheckedChange={(checked) =>
                                updateSettings({ useShortSubjectNames: checked })
                            }
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">
                                Unexcused Only
                            </label>
                            <p className="text-sm text-muted-foreground">
                                Show only unexcused absences in statistics
                            </p>
                        </div>
                        <Switch
                            checked={settings.showOnlyUnexcusedAbsences}
                            onCheckedChange={(checked) =>
                                updateSettings({ showOnlyUnexcusedAbsences: checked })
                            }
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}