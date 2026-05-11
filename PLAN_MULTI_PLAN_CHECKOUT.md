# Multi-plan Checkout Feature — Implementation Plan

## Overview

Enable "multi-plan checkout" — allowing users to purchase multiple plan seats (e.g., Basic + Premium) in a single Paddle checkout transaction. The Paddle API already supports `items: [{priceId, quantity}]` per transaction.

---

## 1. Plan Config — Add Yearly Pricing (`lib/plans/types.ts`)

Add `yearlyPrice` and `yearlyPriceLabel` (optional) to `PlanConfig`:

```ts
export interface PlanConfig {
    id: AppPlan;
    slug: "basic" | "standard" | "premium";
    name: string;
    description: string;
    monthlyPrice: number;
    monthlyPriceLabel: string;
    yearlyPrice?: number;          // NEW
    yearlyPriceLabel?: string;     // NEW e.g. "€59.99"
    yearlySavings?: string;        // NEW e.g. "Save 17%"
    ctaLabel: string;
    highlight?: "popular" | "premium";
    featureList: string[];
    features: PlanFeatureAccess;
    comparison: PlanComparisonValues;
}
```

**Files changed:** `lib/plans/types.ts`

---

## 2. Update Individual Plan Files with Yearly Prices

Add `yearlyPrice`, `yearlyPriceLabel`, and `yearlySavings` to each plan.

### `lib/plans/basic.ts`

```ts
// Add after monthlyPriceLabel:
yearlyPrice: 19.99,
yearlyPriceLabel: "€19.99",
yearlySavings: "Save 17%",
```

### `lib/plans/standard.ts`

```ts
// Add after monthlyPriceLabel:
yearlyPrice: 39.99,
yearlyPriceLabel: "€39.99",
yearlySavings: "Save 15%",
```

### `lib/plans/premium.ts`

```ts
// Add after monthlyPriceLabel:
yearlyPrice: 59.99,
yearlyPriceLabel: "€59.99",
yearlySavings: "Save 17%",
```

**Files changed:** `lib/plans/basic.ts`, `lib/plans/standard.ts`, `lib/plans/premium.ts`

---

## 3. New Types — Checkout Item & Multi-checkout (`lib/checkout/types.ts`) — NEW FILE

Create `lib/checkout/types.ts`:

```ts
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
            ["BASIC", "STANDARD", "PREMIUM"].includes((item as CheckoutItem).plan) &&
            typeof (item as CheckoutItem).quantity === "number" &&
            (item as CheckoutItem).quantity > 0 &&
            ["monthly", "yearly"].includes((item as CheckoutItem).billingPeriod),
    );
}
```

**Files changed:** `lib/checkout/types.ts` (new)

---

## 4. Update Paddle Module — Multi-item Checkout & Yearly Price IDs

### `lib/paddle.ts`

**4a.** Update `getPriceId` to accept a `billingPeriod` parameter:

```ts
export function getPriceId(
    plan: PaidPlan,
    billingPeriod: "monthly" | "yearly" = "monthly",
): string {
    const prefix = billingPeriod === "yearly" ? "PADDLE_YEARLY" : "PADDLE";

    if (plan === "BASIC") {
        return process.env[`${prefix}_BASIC_PRICE_ID`] || process.env[`${prefix}_PRICE_ID`]!;
    }
    if (plan === "STANDARD") {
        return process.env[`${prefix}_STANDARD_PRICE_ID`] || process.env[`${prefix}_PRICE_ID`]!;
    }
    // PREMIUM
    return (
        process.env[`${prefix}_PREMIUM_PRICE_ID`] ||
        process.env[`${prefix}_PRICE_ID`]!
    );
}
```

> **Note:** Requires new env vars: `PADDLE_YEARLY_BASIC_PRICE_ID`, `PADDLE_YEARLY_STANDARD_PRICE_ID`, `PADDLE_YEARLY_PREMIUM_PRICE_ID`.

**4b.** Add new `createMultiCheckout` function:

```ts
export async function createMultiCheckout(
    customerId: string,
    checkoutItems: { priceId: string; quantity: number }[],
    options: { userId: string; purchasedPlans: PaidPlan[] },
): Promise<Transaction | null> {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        const transaction = await paddleClient.transactions.create({
            customerId,
            items: checkoutItems,
            customData: {
                customerId,
                userId: options.userId,
                purchasedPlans: options.purchasedPlans,
                purchaseType: "MULTI_PLAN_SUBSCRIPTION",
            },
        });
        return transaction;
    } catch (error) {
        console.error("Failed to create multi-plan checkout transaction:", error);
        throw error;
    }
}
```

**4c.** Update `resolvePlanFromPriceId` to support yearly price IDs (already works by structure — just add yearly IDs to env).

**4d.** Add a `resolvePlansFromPriceIds` helper for multi-plan:

```ts
export function resolvePlansFromPriceIds(
    priceIds: (string | null | undefined)[],
): PaidPlan[] {
    return priceIds.map(resolvePlanFromPriceId).filter(Boolean) as PaidPlan[];
}
```

**Files changed:** `lib/paddle.ts`

---

## 5. Update `openCheckout` Action — Multi-plan Support

### `app/premium/actions.ts`

**5a.** Add new `openMultiCheckout` action:

```ts
export async function openMultiCheckout(
    selectedPlans: { plan: PaidPlan; billingPeriod: "monthly" | "yearly"; quantity: number }[],
): Promise<{ success: boolean; checkoutId?: string; error?: string }> {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                email: true,
                plan: true,
                planSource: true,
                paddleCustomerId: true,
                trialEndsAt: true,
                accessEndsAt: true,
                referralBonusMonths: true,
            },
        });

        if (!user) return { success: false, error: "User not found" };

        const accessState = getUserAccessState({
            id: session.user.id,
            plan: user.plan,
            planSource: user.planSource,
            isAdmin: false,
            trialEndsAt: user.trialEndsAt,
            accessEndsAt: user.accessEndsAt,
            referralBonusMonths: user.referralBonusMonths,
        });

        // Block checkout if user already has a higher or equal subscription
        const highestPurchasedPlan = selectedPlans.reduce<PaidPlan | null>(
            (highest, sp) => {
                if (!highest) return sp.plan;
                return isPlanAtLeast(highest, sp.plan) ? highest : sp.plan;
            },
            null,
        );

        if (
            accessState.hasAccess &&
            user.planSource === "SUBSCRIPTION" &&
            highestPurchasedPlan &&
            isPlanAtLeast(user.plan, highestPurchasedPlan)
        ) {
            return {
                success: false,
                error: "You already have access to this plan tier or higher.",
            };
        }

        // Create / get Paddle customer
        let customerId = user.paddleCustomerId;
        if (!customerId) {
            const customer = await createCustomer(user.email, session.user.id);
            if (!customer) return { success: false, error: "Failed to create customer" };
            customerId = customer.id;
            await prisma.user.update({
                where: { id: session.user.id },
                data: { paddleCustomerId: customerId },
            });
        } else {
            const existingCustomer = await getCustomer(customerId);
            if (!existingCustomer) {
                const customer = await createCustomer(user.email, session.user.id);
                if (!customer) return { success: false, error: "Failed to create customer" };
                customerId = customer.id;
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { paddleCustomerId: customerId },
                });
            }
        }

        // Build items array
        const items = await Promise.all(
            selectedPlans.map(async (sp) => ({
                priceId: getPriceId(sp.plan, sp.billingPeriod),
                quantity: sp.quantity,
            })),
        );

        const purchasedPlans = selectedPlans.map((sp) => sp.plan);
        const transaction = await createMultiCheckout(customerId, items, {
            userId: session.user.id,
            purchasedPlans,
        });

        if (!transaction) return { success: false, error: "Failed to create checkout" };

        return { success: true, checkoutId: transaction.id };
    } catch (error) {
        console.error("Failed to open multi-plan checkout:", error);
        return { success: false, error: "Failed to open checkout" };
    }
}
```

**5b.** Keep existing `openCheckout` for backward compatibility (single-plan upgrades).

**Files changed:** `app/premium/actions.ts`

---

## 6. Update Webhook Handler — Multi-plan Transaction Support

### `app/api/webhooks/paddle/route.ts`

**6a.** Add new `resolvePlansFromCustomData` helper:

```ts
function resolvePlansFromWebhookData(
    data: {
        custom_data?: { userId?: string; purchasedPlans?: string[]; plan?: string };
        items?: Array<{ price?: { id?: string | null }; price_id?: string | null }>;
    },
): PaidPlan[] {
    // NEW: Check for multi-plan custom_data
    if (data.custom_data?.purchasedPlans) {
        return data.custom_data.purchasedPlans
            .map(normalizePlan)
            .filter((p): p is PaidPlan => ["BASIC", "STANDARD", "PREMIUM"].includes(p));
    }

    // Fallback: single plan
    const singlePlan = resolvePaidPlanFromWebhookData(data);
    return [singlePlan];
}
```

**6b.** Update `handleTransactionCompleted` for multi-plan:

In the `transaction.completed` handler, when `purchaseType === "MULTI_PLAN_SUBSCRIPTION"`:

```ts
if (custom_data?.purchaseType === "MULTI_PLAN_SUBSCRIPTION") {
    const user = await prisma.user.findFirst({
        where: { paddleCustomerId: customerId },
        select: { id: true, plan: true, planSource: true },
    });

    if (!user) return;

    const purchasedPlans = resolvePlansFromWebhookData(data);
    const highestPlan = purchasedPlans.reduce<PaidPlan>((highest, p) =>
        isPlanAtLeast(highest, p) ? highest : p,
    );

    if (user.plan !== highestPlan) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                plan: highestPlan,
                planSource: "SUBSCRIPTION",
                trialEndsAt: null,
                accessEndsAt: null,
                paddleSubscriptionId: data.subscription_id || null,
            },
        });
        await grantReferralRewardForSubscriber(user.id);
    }
    return;
}
```

**Files changed:** `app/api/webhooks/paddle/route.ts`

---

## 7. Update Plan Button Component — Per-plan Billing Toggle

### `components/premium/premium-button.tsx`

Add `billingPeriod` prop and a small toggle UI:

**New `PlanButtonProps`:**

```ts
interface PremiumButtonProps {
    currentPlan: AppPlan;
    targetPlan: PaidPlan;
    planSource?: PlanSource;
    hasActiveAccess?: boolean;
    className?: string;
    billingPeriod?: "monthly" | "yearly";         // NEW
    onBillingPeriodChange?: (period: "monthly" | "yearly") => void; // NEW
    multiPlanMode?: boolean;                        // NEW
}
```

**Updated component behavior:**
- If `multiPlanMode` is true, the button shows a small "Monthly / Yearly" toggle next to the price.
- Displays `yearlyPriceLabel` alongside `monthlyPriceLabel` when `billingPeriod === "yearly"`.

**Files changed:** `components/premium/premium-button.tsx`

---

## 8. New Component — Plan Comparison Card with Billing Toggle (`components/premium/plan-card.tsx`) — NEW FILE

```tsx
"use client";

import { Check } from "lucide-react";
import { getPlanConfig } from "@/lib/plans";
import { PlanButton } from "@/components/premium/premium-button";

interface PlanCardProps {
    planId: string;
    currentPlan: string;
    planSource: string;
    hasActiveAccess: boolean;
    billingPeriod: "monthly" | "yearly";
    onSelect: (plan: string, billingPeriod: "monthly" | "yearly") => void;
}

export function PlanCard({ planId, currentPlan, planSource, hasActiveAccess, billingPeriod, onSelect }: PlanCardProps) {
    const plan = getPlanConfig(planId);
    const price = billingPeriod === "yearly" ? plan.yearlyPriceLabel : plan.monthlyPriceLabel;
    const periodLabel = billingPeriod === "yearly" ? "/year" : "/month";
    const savings = billingPeriod === "yearly" && plan.yearlySavings ? (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{plan.yearlySavings}</span>
    ) : null;

    return (
        <article className="rounded-2xl p-8 shadow-lg border">
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{plan.description}</p>
            <div className="mt-6 flex items-end gap-2">
                <span className="text-4xl font-bold">{price}</span>
                <span className="text-gray-600 dark:text-gray-400">{periodLabel}</span>
                {savings}
            </div>
            <ul className="mt-6 space-y-3">
                {plan.featureList.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
            <PlanButton
                className="mt-8"
                currentPlan={currentPlan as any}
                targetPlan={planId as any}
                planSource={planSource as any}
                hasActiveAccess={hasActiveAccess}
                billingPeriod={billingPeriod}
                onClick={() => onSelect(planId, billingPeriod)}
            />
        </article>
    );
}
```

**Files changed:** `components/premium/plan-card.tsx` (new)

---

## 9. New Component — Multi-plan Selector with Monthly/Yearly Toggle (`components/premium/multi-plan-selector.tsx`) — NEW FILE

```tsx
"use client";

import { useState } from "react";
import { PlanCard } from "@/components/premium/plan-card";
import { getAvailablePlans } from "@/lib/plans";

interface MultiPlanSelectorProps {
    currentPlan: string;
    planSource: string;
    hasActiveAccess: boolean;
    selectedPlans: { plan: string; billingPeriod: "monthly" | "yearly"; quantity: number }[];
    onTogglePlan: (plan: string, billingPeriod: "monthly" | "yearly") => void;
}

export function MultiPlanSelector({ currentPlan, planSource, hasActiveAccess, selectedPlans, onTogglePlan }: MultiPlanSelectorProps) {
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
    const plans = getAvailablePlans();

    return (
        <div>
            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
                <button
                    onClick={() => setBillingPeriod("monthly")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                        billingPeriod === "monthly"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                >
                    Monthly
                </button>
                <button
                    onClick={() => setBillingPeriod("yearly")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                        billingPeriod === "yearly"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                >
                    Yearly <span className="text-xs text-green-500 ml-1">Save up to 17%</span>
                </button>
            </div>

            {/* Plan Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        planId={plan.id}
                        currentPlan={currentPlan}
                        planSource={planSource}
                        hasActiveAccess={hasActiveAccess}
                        billingPeriod={billingPeriod}
                        onSelect={onTogglePlan}
                    />
                ))}
            </div>

            {/* Selected Plans Summary */}
            {selectedPlans.length > 0 && (
                <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Selected seats:</h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedPlans.map((sp) => (
                            <span
                                key={`${sp.plan}-${sp.billingPeriod}`}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 rounded-full text-sm"
                            >
                                {sp.quantity}x {sp.plan} ({sp.billingPeriod})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
```

**Files changed:** `components/premium/multi-plan-selector.tsx` (new)

---

## 10. Update Premium Page — Add Multi-plan Checkout Section

### `app/premium/page.tsx`

Add a new section for multi-plan selection:

```tsx
// ADD after the "Choose your plan" heading section:
import { MultiPlanSelector } from "@/components/premium/multi-plan-selector";

// Inside the component, add state management (use client directive needed):
// Wrap the page or add a "Select multiple plans" expandable section
```

**Option A:** Add a toggle/expandable section "Purchase additional seats" below the main plan cards.

**Option B:** Replace the 3-card layout with `MultiPlanSelector` when a "Multi-plan checkout" toggle is enabled/visible.

**Implementation (recommended: Option A):**
- Keep existing single-plan buttons for direct upgrades.
- Add an "Advanced: Buy multiple seats" disclosure/collapsible below.
- Inside, render `<MultiPlanSelector>` with `onTogglePlan` toggling `selectedPlans` state.
- Final "Checkout" button calls `openMultiCheckout(selectedPlans)`.

**Files changed:** `app/premium/page.tsx`

---

## 11. Update Auth JWT Callback for Multi-plan

### `lib/auth.ts`

Add `purchasedPlans` to the JWT/payload if applicable:

```ts
// In the session/token callback:
session.user.purchasedPlans = user.purchasedPlans || [];
```

**Only required if `purchasedPlans` array needs to be client-accessible. Otherwise, keep server-side only.**

**Files changed:** `lib/auth.ts` (if needed)

---

## 12. Environment Variables Required

```env
# Yearly pricing (Paddle price IDs for yearly billing)
PADDLE_YEARLY_BASIC_PRICE_ID=...
PADDLE_YEARLY_STANDARD_PRICE_ID=...
PADDLE_YEARLY_PREMIUM_PRICE_ID=...
```

---

## 13. Prisma Schema Changes (`prisma/schema.prisma`)

**Option A — Store multi-plan selections as JSON (quick):**

```prisma
model User {
    // ... existing fields ...
    purchasedPlans    Json    @default("[]")   // NEW: [{plan: "PREMIUM", billingPeriod: "yearly", quantity: 1}]
}
```

**Option B — Normalized relation for querying (recommended long-term):**

```prisma
model UserPlan {
    id            String   @id @default(cuid())
    userId        String
    plan          Plan
    billingPeriod String   // "MONTHLY" | "YEARLY"
    quantity      Int      @default(1)
    purchasedAt   DateTime @default(now())
    paddlePriceId String?

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([userId, plan, billingPeriod])
}
```

**Files changed:** `prisma/schema.prisma`

---

## 14. Subscription Utility Updates (`lib/subscription.ts`)

Add helper for resolving effective plan from multiple subscriptions:

```ts
export function getEffectivePlanFromMultiPlans(
    plans: { plan: PaidPlan; billingPeriod: string; quantity: number }[],
): PaidPlan {
    if (plans.length === 0) return "BASIC";
    return plans.reduce<PaidPlan>((highest, p) =>
        isPlanAtLeast(highest, p.plan) ? highest : p.plan,
    );
}
```

**Files changed:** `lib/subscription.ts`

---

## 15. Referral Logic — Multi-plan Reward (`lib/referrals.ts`)

Update `grantReferralRewardForSubscriber` to consider multi-plan purchases:

```ts
// If user has multiple paid plans, grant bonus based on the highest plan purchased
export async function grantReferralRewardForSubscriber(userId: string) {
    // ... existing logic ...
    // For multi-plan: reward based on highest plan in the checkout
}
```

**Files changed:** `lib/referrals.ts`

---

## 16. Update `resolvePlanFromPriceId` for Yearly IDs

### `lib/paddle.ts` — Already handled in step 4a

The function already works — just needs the yearly env vars populated.

---

## Summary of File Changes

| # | File | Action |
|---|------|--------|
| 1 | `lib/plans/types.ts` | Add `yearlyPrice`, `yearlyPriceLabel`, `yearlySavings` fields |
| 2 | `lib/plans/basic.ts` | Add yearly pricing values |
| 3 | `lib/plans/standard.ts` | Add yearly pricing values |
| 4 | `lib/plans/premium.ts` | Add yearly pricing values |
| 5 | `lib/checkout/types.ts` | **New file** — `CheckoutItem`, `MultiCheckoutOptions`, validator |
| 6 | `lib/paddle.ts` | Add `billingPeriod` param to `getPriceId`, add `createMultiCheckout`, add `resolvePlansFromPriceIds` |
| 7 | `app/premium/actions.ts` | Add `openMultiCheckout` action, refactor `openCheckout` |
| 8 | `app/api/webhooks/paddle/route.ts` | Add multi-plan resolution in `handleTransactionCompleted` |
| 9 | `components/premium/premium-button.tsx` | Add `billingPeriod` and `multiPlanMode` props |
| 10 | `components/premium/plan-card.tsx` | **New file** — Plan card with billing toggle |
| 11 | `components/premium/multi-plan-selector.tsx` | **New file** — Multi-plan UI with monthly/yearly toggle |
| 12 | `app/premium/page.tsx` | Add multi-plan section with `MultiPlanSelector` |
| 13 | `lib/subscription.ts` | Add `getEffectivePlanFromMultiPlans` utility |
| 14 | `lib/referrals.ts` | Update reward logic for multi-plan purchases |
| 15 | `lib/auth.ts` | (Optional) Add `purchasedPlans` to session payload |
| 16 | `prisma/schema.prisma` | Add `purchasedPlans` JSON or `UserPlan` relation |
| 17 | `.env` | Add `PADDLE_YEARLY_*_PRICE_ID` variables |