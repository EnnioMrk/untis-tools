"use client";

import Link from "next/link";
import { RefreshCw, LayoutDashboard, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function FaecherHeader() {
    return (
        <Card className="relative z-20 mb-6 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full px-3 py-1 font-medium bg-muted text-muted-foreground">
                            Fächer
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Fächer
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Übersicht aller Fächer mit Anwesenheitsinformationen
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                    <Button asChild variant="outline">
                        <Link href="/dashboard">
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>
                    </Button>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        title="Seite neu laden"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Neu laden
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/theme">
                            <Palette className="w-4 h-4" />
                            Thema
                        </Link>
                    </Button>
                    <ThemeToggle />
                </div>
            </div>
        </Card>
    );
}