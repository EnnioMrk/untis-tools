import type { PaidPlan } from "@/lib/plans";

export interface CheckoutItem {
    plan: PaidPlan;
    quantity: number;
    billingPeriod: "monthly" | "yearly";
}

export interface MultiCheckoutOptions {
    userId: string;
    items: CheckoutItem[];
}

export function isValidCheckoutItems(items: unknown): items is CheckoutItem[] {
    if (!Array.isArray(items)) return false;
    return items.every(
        (item) =>
            typeof item === "object" &&
            item !== null &&
            ["BASIC", "STANDARD", "PREMIUM"].includes(
                (item as CheckoutItem).plan,
            ) &&
            typeof (item as CheckoutItem).quantity === "number" &&
            (item as CheckoutItem).quantity > 0 &&
            ["monthly", "yearly"].includes(
                (item as CheckoutItem).billingPeriod,
            ),
    );
}