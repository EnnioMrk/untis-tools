"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Check, Loader2, Palette, ShoppingCart } from "lucide-react";
import type { ShopThemeId } from "@/lib/shop";
import { activateOwnedTheme, openThemeCheckout } from "@/app/shop/actions";

interface BaseButtonProps {
    className?: string;
}

export function BuyThemeButton({
    themeId,
    className = "",
}: BaseButtonProps & { themeId: ShopThemeId }) {
    const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initPaddle = async () => {
            try {
                const paddleInstance = await initializePaddle({
                    environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ||
                        "sandbox") as "sandbox" | "production",
                    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "",
                });
                setPaddle(paddleInstance);
            } catch (initError) {
                console.error("Failed to initialize Paddle:", initError);
            }
        };

        initPaddle();
    }, []);

    const handlePurchase = useCallback(async () => {
        if (!paddle) {
            setError("Payment system is not ready yet.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await openThemeCheckout(themeId);

            if (!result.success || !result.checkoutId) {
                setError(result.error || "Theme purchase failed.");
                return;
            }

            paddle.Checkout.open({
                transactionId: result.checkoutId,
                settings: {
                    displayMode: "overlay",
                    theme: "light",
                    locale: "en",
                },
            });
        } catch (checkoutError) {
            console.error("Theme checkout failed:", checkoutError);
            setError("Theme purchase failed.");
        } finally {
            setLoading(false);
        }
    }, [paddle, themeId]);

    return (
        <div className={className}>
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <button
                type="button"
                onClick={handlePurchase}
                disabled={loading || !paddle}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening checkout...
                    </>
                ) : (
                    <>
                        <ShoppingCart className="h-4 w-4" />
                        Buy theme
                    </>
                )}
            </button>
            {!paddle && (
                <p className="mt-2 text-xs text-gray-500">
                    Loading payment system...
                </p>
            )}
        </div>
    );
}

export function ActivateThemeButton({
    themeId,
    active,
    className = "",
}: BaseButtonProps & { themeId: ShopThemeId; active?: boolean }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleActivate = () => {
        if (active) {
            return;
        }

        setError(null);
        startTransition(async () => {
            const result = await activateOwnedTheme(themeId);

            if (!result.success) {
                setError(result.error || "Theme activation failed.");
                return;
            }

            router.refresh();
        });
    };

    return (
        <div className={className}>
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <button
                type="button"
                onClick={handleActivate}
                disabled={active || isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
                {isPending ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying...
                    </>
                ) : active ? (
                    <>
                        <Check className="h-4 w-4" />
                        Active theme
                    </>
                ) : (
                    <>
                        <Palette className="h-4 w-4" />
                        Apply theme
                    </>
                )}
            </button>
        </div>
    );
}
