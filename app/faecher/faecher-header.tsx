"use client";

import Link from "next/link";
import { RefreshCw, LayoutDashboard } from "lucide-react";
import { getShopTheme, type ShopThemeId } from "@/lib/shop";

interface FaecherHeaderProps {
    activeTheme: ShopThemeId;
}

export function FaecherHeader({ activeTheme }: FaecherHeaderProps) {
    const themeConfig = getShopTheme(activeTheme);

    return (
        <div className={`relative z-20 mb-6 rounded-3xl border p-5 shadow-sm backdrop-blur ${themeConfig.headerClass}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Fächer
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Übersicht aller Fächer mit Anwesenheitsinformationen
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        title="Seite neu laden"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Neu laden
                    </button>
                </div>
            </div>
        </div>
    );
}