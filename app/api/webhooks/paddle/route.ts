import { NextRequest, NextResponse } from "next/server";
import { normalizePlan, type PaidPlan, isPlanAtLeast } from "@/lib/plans";
import { getShopTheme, normalizeShopTheme } from "@/lib/shop";
import { prisma } from "@/lib/prisma";
import { grantReferralRewardForSubscriber } from "@/lib/referrals";
import {
    resolvePlanFromPriceId,
    resolvePlansFromPriceIds,
    verifyWebhookSignature,
} from "@/lib/paddle";
import {
    createSubscriptionGrant,
    refreshGrants,
    deleteOldExpiredGrants,
} from "@/lib/access-engine";

/**
 * Paddle Webhook Handler
 *
 * Handles the following events:
 * - subscription.activated: User upgraded to a paid plan
 * - subscription.canceled: User downgraded to FREE
 * - subscription.updated: Subscription details updated
 * - transaction.completed: Payment confirmation
 */
export async function POST(request: NextRequest) {
    try {
        // Get the raw body for signature verification
        const body = await request.text();

        // Get signature from header
        const signature = request.headers.get("paddle-signature") || "";

        // Verify webhook signature
        const isValid = await verifyWebhookSignature(signature, body);

        if (!isValid) {
            console.error("Invalid webhook signature");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 },
            );
        }

        // Parse the webhook payload
        const payload = JSON.parse(body);
        const eventType = payload.event_type;
        const eventData = payload.data;

        console.log(`Received Paddle webhook: ${eventType}`);

        // Handle different event types
        switch (eventType) {
            case "subscription.activated":
                await handleSubscriptionActivated(eventData);
                break;

            case "subscription.canceled":
                await handleSubscriptionCanceled(eventData);
                break;

            case "subscription.updated":
                await handleSubscriptionUpdated(eventData);
                break;

            case "transaction.completed":
                await handleTransactionCompleted(eventData);
                break;

            default:
                console.log(`Unhandled webhook event type: ${eventType}`);
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

function resolvePaidPlanFromWebhookData(data: {
    custom_data?: { userId?: string; plan?: string };
    items?: Array<{
        price?: { id?: string | null };
        price_id?: string | null;
    }>;
}): PaidPlan | null {
    const customPlan = normalizePlan(data.custom_data?.plan);

    if (customPlan === "STANDARD" || customPlan === "PREMIUM" || customPlan === "BASIC") {
        return customPlan;
    }

    const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id;
    return resolvePlanFromPriceId(priceId);
}

function resolvePlansFromWebhookData(data: {
    custom_data?: {
        userId?: string;
        purchasedPlans?: string[];
        plan?: string;
    };
    items?: Array<{
        price?: { id?: string | null };
        price_id?: string | null;
    }>;
}): PaidPlan[] {
    // Check for multi-plan custom_data first
    if (data.custom_data?.purchasedPlans) {
        return data.custom_data.purchasedPlans
            .map(normalizePlan)
            .filter(
                (p): p is PaidPlan =>
                    ["BASIC", "STANDARD", "PREMIUM"].includes(p),
            );
    }

    // Fallback: resolve from price IDs in items
    const priceIds =
        data.items?.map((item) => item.price?.id || item.price_id) || [];
    const plans = resolvePlansFromPriceIds(priceIds);
    if (plans.length > 0) {
        return plans;
    }

    // Single plan fallback
    const singlePlan = resolvePaidPlanFromWebhookData(data);
    if (singlePlan) {
        return [singlePlan];
    }

    // Cannot determine plan — return empty array so caller handles it gracefully
    return [];
}

async function resolveUserIdFromCustomerId(
    customerId: string,
): Promise<string | null> {
    const user = await prisma.user.findFirst({
        where: { paddleCustomerId: customerId },
        select: { id: true },
    });

    return user?.id || null;
}

/**
 * Handle subscription.activated event
 * Upgrade user to a paid plan via AccessGrant
 */
async function handleSubscriptionActivated(data: {
    id: string;
    customer_id: string;
    custom_data?: { userId?: string; plan?: string };
    items?: Array<{
        price?: { id?: string | null };
        price_id?: string | null;
    }>;
}) {
    const { id: subscriptionId, customer_id: customerId, custom_data } = data;
    const nextPlan = resolvePaidPlanFromWebhookData(data);

    if (!nextPlan) {
        console.error(
            `Could not resolve plan for subscription ${subscriptionId} (customer ${customerId})`,
        );
        return;
    }

    // Get userId from custom_data or find by paddleCustomerId
    let userId: string | null = custom_data?.userId || null;

    if (!userId) {
        userId = await resolveUserIdFromCustomerId(customerId);
    }

    if (!userId) {
        console.error(`No user found for customer ID: ${customerId}`);
        return;
    }

    await prisma.$transaction(async (tx) => {
        // Expire any existing non-permanent grants for clean slate
        await tx.accessGrant.updateMany({
            where: {
                userId,
                status: { in: ["PENDING", "ACTIVE"] as const },
                type: { not: "SUBSCRIPTION" as const },
            },
            data: {
                status: "EXPIRED" as const,
                updatedAt: new Date(),
            },
        });

        // Create the subscription grant (ACTIVE immediately)
        await createSubscriptionGrant(
            {
                userId,
                paddleSubscriptionId: subscriptionId,
                plan: nextPlan,
                months: 1,
            },
            tx,
        );

        // Store Paddle identifiers and plan on the user record so
        // subscription.canceled / subscription.updated can find the user
        // even when custom_data is absent from the webhook payload.
        await tx.user.update({
            where: { id: userId },
            data: {
                paddleCustomerId: customerId,
                paddleSubscriptionId: subscriptionId,
                plan: nextPlan,
                planSource: "SUBSCRIPTION",
            },
        });
    });

    try {
        await grantReferralRewardForSubscriber(userId);
    } catch (error) {
        console.error(
            `Failed to grant referral reward for subscriber ${userId}:`,
            error,
        );
    }

    console.log(`User ${userId} upgraded to ${nextPlan}`);
}

/**
 * Handle subscription.canceled event
 * Expire the subscription grant — pending grants will auto-activate via refreshGrants
 */
async function handleSubscriptionCanceled(data: {
    id: string;
    customer_id: string;
    custom_data?: { userId?: string; plan?: string };
}) {
    const { id: subscriptionId, customer_id: customerId, custom_data } = data;

    // Get userId from custom_data or find by paddleSubscriptionId
    let userId: string | null = custom_data?.userId || null;

    if (!userId) {
        // Find user by paddleSubscriptionId
        const user = await prisma.user.findFirst({
            where: { paddleSubscriptionId: subscriptionId },
            select: { id: true },
        });
        userId = user?.id || null;
    }

    if (!userId) {
        // Try finding by customer ID
        userId = await resolveUserIdFromCustomerId(customerId);
    }

    if (!userId) {
        console.error(`No user found for subscription ID: ${subscriptionId}`);
        return;
    }

    // Mark the subscription grant as EXPIRED (not deleted for audit trail)
    await prisma.accessGrant.updateMany({
        where: {
            userId,
            type: "SUBSCRIPTION",
            status: "ACTIVE",
        },
        data: {
            status: "EXPIRED",
            updatedAt: new Date(),
        },
    });

    // Clear the Paddle subscription reference on the user
    await prisma.user.update({
        where: { id: userId },
        data: {
            paddleSubscriptionId: null,
            plan: "BASIC",
            planSource: "NONE",
        },
    });

    // Trigger grant refresh — PENDING grants (referral, coupon) will auto-activate if needed
    await refreshGrants(userId);

    // Clean up old expired grants from DB
    await deleteOldExpiredGrants();

    console.log(`User ${userId} subscription canceled`);
}

/**
 * Handle subscription.updated event
 * Update subscription details if needed
 */
async function handleSubscriptionUpdated(data: {
    id: string;
    customer_id: string;
    status: string;
    custom_data?: { userId?: string; plan?: string };
    items?: Array<{
        price?: { id?: string | null };
        price_id?: string | null;
    }>;
}) {
    const {
        id: subscriptionId,
        customer_id: customerId,
        status,
        custom_data,
    } = data;
    const nextPlan = resolvePaidPlanFromWebhookData(data);

    if (!nextPlan) {
        console.error(
            `Could not resolve plan for subscription update ${subscriptionId} (customer ${customerId})`,
        );
        return;
    }

    // Get userId from custom_data or find by paddleCustomerId
    let userId: string | null = custom_data?.userId || null;

    if (!userId) {
        userId = await resolveUserIdFromCustomerId(customerId);
    }

    if (!userId) {
        console.error(`No user found for customer ID: ${customerId}`);
        return;
    }

    // If subscription is active, ensure user is on the correct paid plan
    // If subscription is paused/canceled, handle accordingly
    if (status === "active") {
        await prisma.$transaction(async (tx) => {
            // Update user plan
            await tx.user.update({
                where: { id: userId },
                data: {
                    plan: nextPlan,
                    planSource: "SUBSCRIPTION",
                    paddleCustomerId: customerId,
                    paddleSubscriptionId: subscriptionId,
                },
            });

            // Create/activate the subscription grant
            await createSubscriptionGrant(
                {
                    userId,
                    paddleSubscriptionId: subscriptionId,
                    plan: nextPlan,
                    months: 1,
                },
                tx,
            );
        });

        try {
            await grantReferralRewardForSubscriber(userId);
        } catch (error) {
            console.error(
                `Failed to grant referral reward for subscriber ${userId}:`,
                error,
            );
        }
        console.log(
            `User ${userId} subscription updated - status: active (${nextPlan})`,
        );
    } else if (status === "canceled" || status === "expired") {
        // Same logic as handleSubscriptionCanceled
        await prisma.accessGrant.updateMany({
            where: {
                userId,
                type: "SUBSCRIPTION",
                status: "ACTIVE",
            },
            data: {
                status: "EXPIRED",
                updatedAt: new Date(),
            },
        });

        await prisma.user.update({
            where: { id: userId },
            data: {
                paddleSubscriptionId: null,
                plan: "BASIC",
                planSource: "NONE",
            },
        });

        await refreshGrants(userId);
        console.log(`User ${userId} subscription updated - status: ${status}`);
    }
}

/**
 * Handle transaction.completed event
 * Payment confirmation
 */
async function handleTransactionCompleted(data: {
    id: string;
    customer_id: string;
    subscription_id?: string;
    status: string;
    custom_data?: {
        userId?: string;
        plan?: string;
        purchaseType?: string;
        themeId?: string;
        continueUrl?: string;
    };
    items?: Array<{
        price?: { id?: string | null };
        price_id?: string | null;
    }>;
}) {
    const {
        id: transactionId,
        customer_id: customerId,
        subscription_id: subscriptionId,
        status,
        custom_data,
    } = data;

    if (custom_data?.purchaseType === "THEME") {
        const userId =
            custom_data.userId ||
            (await resolveUserIdFromCustomerId(customerId));
        const themeId = normalizeShopTheme(custom_data.themeId);
        const theme = getShopTheme(themeId);

        if (!userId || theme.priceEuroCents <= 0 || theme.id === "DEFAULT") {
            console.error(
                `Invalid theme transaction payload for transaction ${transactionId}`,
            );
            return;
        }

        await prisma.$transaction(async (tx) => {
            const existingPurchase = await tx.themePurchase.findUnique({
                where: { userId_theme: { userId, theme: theme.id } },
                select: { id: true },
            });

            if (!existingPurchase) {
                await tx.themePurchase.create({
                    data: {
                        userId,
                        theme: theme.id,
                        priceCents: theme.priceEuroCents,
                        paddleTransactionId: transactionId,
                    },
                });
            }

            await tx.user.update({
                where: { id: userId },
                data: {
                    activeTheme: theme.id,
                },
            });
        });

        console.log(
            `Transaction ${transactionId} unlocked theme ${theme.id} for user ${userId}`,
        );
        return;
    }

    // Handle multi-plan subscription purchases
    if (custom_data?.purchaseType === "MULTI_PLAN_SUBSCRIPTION") {
        const userId =
            custom_data.userId ||
            (await resolveUserIdFromCustomerId(customerId));

        if (!userId) {
            console.error(
                `No user found for multi-plan transaction ${transactionId}`,
            );
            return;
        }

        const purchasedPlans = resolvePlansFromWebhookData(data);

        if (purchasedPlans.length === 0) {
            console.error(
                `Could not resolve any plans for multi-plan transaction ${transactionId}`,
            );
            return;
        }

        const highestPlan = purchasedPlans.reduce<PaidPlan>(
            (highest, p) =>
                isPlanAtLeast(highest, p) ? highest : p,
            purchasedPlans[0],
        );

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true, planSource: true },
        });

        if (user && !isPlanAtLeast(user.plan, highestPlan)) {
            await prisma.$transaction(async (tx) => {
                // Expire all existing non-subscription grants
                await tx.accessGrant.updateMany({
                    where: {
                        userId,
                        type: { not: "SUBSCRIPTION" as const },
                        status: { in: ["PENDING", "ACTIVE"] as const },
                    },
                    data: {
                        status: "EXPIRED" as const,
                        updatedAt: new Date(),
                    },
                });

                // Create subscription grant
                await createSubscriptionGrant(
                    {
                        userId,
                        paddleSubscriptionId:
                            data.subscription_id || `multi-${transactionId}`,
                        plan: highestPlan,
                        months: 1,
                    },
                    tx,
                );
            });

            await grantReferralRewardForSubscriber(userId);
            console.log(
                `User ${userId} upgraded to ${highestPlan} via multi-plan transaction`,
            );
        }
        return;
    }

    const nextPlan = resolvePaidPlanFromWebhookData(data);

    console.log(
        `Transaction ${transactionId} completed for customer ${customerId}, status: ${status}`,
    );

    // If there's a subscription ID, ensure user is on the correct paid plan
    if (subscriptionId) {
        const user = await prisma.user.findFirst({
            where: { paddleCustomerId: customerId },
            select: { id: true, plan: true },
        });

        if (
            user &&
            nextPlan &&
            user.plan !== nextPlan
        ) {
            await createSubscriptionGrant({
                userId: user.id,
                paddleSubscriptionId: subscriptionId,
                plan: nextPlan,
                months: 1,
            });

            // Store the subscription ID on the user for future cancellation lookups
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    paddleSubscriptionId: subscriptionId,
                },
            });

            try {
                await grantReferralRewardForSubscriber(user.id);
            } catch (error) {
                console.error(
                    `Failed to grant referral reward for subscriber ${user.id}:`,
                    error,
                );
            }
            console.log(
                `User ${user.id} upgraded to ${nextPlan} via transaction.completed`,
            );
        }
    }
}