import { NextRequest, NextResponse } from "next/server";
import { normalizePlan, type PaidPlan } from "@/lib/plans";
import { getShopTheme, normalizeShopTheme } from "@/lib/shop";
import { prisma } from "@/lib/prisma";
import { grantReferralRewardForSubscriber } from "@/lib/referrals";
import { resolvePlanFromPriceId, verifyWebhookSignature } from "@/lib/paddle";
import { addMonths } from "@/lib/subscription";

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
}): PaidPlan {
    const customPlan = normalizePlan(data.custom_data?.plan);

    if (customPlan === "STANDARD" || customPlan === "PREMIUM") {
        return customPlan;
    }

    const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id;
    return resolvePlanFromPriceId(priceId) || "PREMIUM";
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
 * Upgrade user to a paid plan
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

    // Get userId from custom_data or find by paddleCustomerId
    let userId: string | null = custom_data?.userId || null;

    if (!userId) {
        userId = await resolveUserIdFromCustomerId(customerId);
    }

    if (!userId) {
        console.error(`No user found for customer ID: ${customerId}`);
        return;
    }

    // Update user to paid plan
    await prisma.user.update({
        where: { id: userId },
        data: {
            plan: nextPlan,
            planSource: "SUBSCRIPTION",
            trialEndsAt: null,
            accessEndsAt: null,
            paddleCustomerId: customerId,
            paddleSubscriptionId: subscriptionId,
        },
    });

    await grantReferralRewardForSubscriber(userId);

    console.log(`User ${userId} upgraded to ${nextPlan}`);
}

/**
 * Handle subscription.canceled event
 * Downgrade user to FREE
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

    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            planSource: true,
            accessEndsAt: true,
            referralBonusMonths: true,
        },
    });

    const hasBonusMonths = Boolean(currentUser?.referralBonusMonths);
    const bonusAccessEndsAt = hasBonusMonths
        ? addMonths(
              currentUser?.accessEndsAt && currentUser.accessEndsAt > new Date()
                  ? currentUser.accessEndsAt
                  : new Date(),
              currentUser?.referralBonusMonths || 0,
          )
        : null;

    await prisma.user.update({
        where: { id: userId },
        data:
            currentUser?.planSource === "SUBSCRIPTION"
                ? hasBonusMonths
                    ? {
                          planSource: "BONUS",
                          accessEndsAt: bonusAccessEndsAt,
                          referralBonusMonths: 0,
                          paddleSubscriptionId: null,
                      }
                    : {
                          planSource: "NONE",
                          accessEndsAt: null,
                          paddleSubscriptionId: null,
                      }
                : {
                      paddleSubscriptionId: null,
                  },
    });

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
        await prisma.user.update({
            where: { id: userId },
            data: {
                plan: nextPlan,
                planSource: "SUBSCRIPTION",
                trialEndsAt: null,
                accessEndsAt: null,
                paddleCustomerId: customerId,
                paddleSubscriptionId: subscriptionId,
            },
        });
        await grantReferralRewardForSubscriber(userId);
        console.log(
            `User ${userId} subscription updated - status: active (${nextPlan})`,
        );
    } else if (status === "canceled" || status === "expired") {
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                planSource: true,
                accessEndsAt: true,
                referralBonusMonths: true,
            },
        });

        const hasBonusMonths = Boolean(currentUser?.referralBonusMonths);
        const bonusAccessEndsAt = hasBonusMonths
            ? addMonths(
                  currentUser?.accessEndsAt &&
                      currentUser.accessEndsAt > new Date()
                      ? currentUser.accessEndsAt
                      : new Date(),
                  currentUser?.referralBonusMonths || 0,
              )
            : null;

        await prisma.user.update({
            where: { id: userId },
            data:
                currentUser?.planSource === "SUBSCRIPTION"
                    ? hasBonusMonths
                        ? {
                              planSource: "BONUS",
                              accessEndsAt: bonusAccessEndsAt,
                              referralBonusMonths: 0,
                              paddleSubscriptionId: null,
                          }
                        : {
                              planSource: "NONE",
                              accessEndsAt: null,
                              paddleSubscriptionId: null,
                          }
                    : {
                          paddleSubscriptionId: null,
                      },
        });
        console.log(`User ${userId} subscription updated - status: ${status}`);
    }
}

/**
 * Handle transaction.completed event
 * Payment confirmation (optional logging)
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

        if (user && user.plan !== nextPlan) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    plan: nextPlan,
                    planSource: "SUBSCRIPTION",
                    trialEndsAt: null,
                    accessEndsAt: null,
                    paddleSubscriptionId: subscriptionId,
                },
            });
            await grantReferralRewardForSubscriber(user.id);
            console.log(
                `User ${user.id} upgraded to ${nextPlan} via transaction.completed`,
            );
        }
    }
}
