"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
    isPlanAtLeast,
    type AppPlan,
    type PaidPlan,
} from "@/lib/plans";
import type { CheckoutItem, isValidCheckoutItems } from "@/lib/checkout/types";
import {
    createCustomer,
    getCustomer,
    getPriceId,
    createCheckout,
    createMultiCheckout,
} from "@/lib/paddle";
import { getUserAccessState } from "@/lib/access-engine";
import { prisma } from "@/lib/prisma";

/**
 * Subscription status response
 */
export interface SubscriptionStatus {
    plan: AppPlan;
    selectedPlan: AppPlan;
    planSource: string;
    paddleCustomerId: string | null;
    paddleSubscriptionId: string | null;
    hasActiveAccess: boolean;
}

/**
 * Get the current user's subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            plan: true,
            planSource: true,
            paddleCustomerId: true,
            paddleSubscriptionId: true,
        },
    });

    if (!user) {
        return null;
    }

    const accessState = await getUserAccessState(session.user.id);

    return {
        plan: accessState.effectivePlan,
        selectedPlan: user.plan,
        planSource: user.planSource,
        paddleCustomerId: user.paddleCustomerId,
        paddleSubscriptionId: user.paddleSubscriptionId,
        hasActiveAccess: accessState.hasAccess,
    };
}

/**
 * Ensure Paddle customer exists, create if missing
 */
async function ensurePaddleCustomer(
    email: string,
    userId: string,
    existingCustomerId: string | null,
): Promise<string> {
    if (!existingCustomerId) {
        const customer = await createCustomer(email, userId);
        if (!customer) {
            throw new Error("Failed to create customer");
        }

        await prisma.user.update({
            where: { id: userId },
            data: { paddleCustomerId: customer.id },
        });

        return customer.id;
    }

    const existingCustomer = await getCustomer(existingCustomerId);
    if (!existingCustomer) {
        const customer = await createCustomer(email, userId);
        if (!customer) {
            throw new Error("Failed to create customer");
        }

        await prisma.user.update({
            where: { id: userId },
            data: { paddleCustomerId: customer.id },
        });

        return customer.id;
    }

    return existingCustomerId;
}

/**
 * Open checkout - creates/updates Paddle customer and returns checkout URL
 */
export async function openCheckout(targetPlan: PaidPlan, continueUrl?: string): Promise<{
    success: boolean;
    checkoutId?: string;
    error?: string;
}> {
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
            },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        const accessState = await getUserAccessState(session.user.id);

        if (
            accessState.hasAccess &&
            user.planSource === "SUBSCRIPTION" &&
            user.plan === targetPlan
        ) {
            return {
                success: false,
                error: `${targetPlan === "BASIC" ? "Basic" : targetPlan === "STANDARD" ? "Standard" : "Premium"} is already active.`,
            };
        }

        if (
            accessState.hasAccess &&
            user.planSource === "SUBSCRIPTION" &&
            user.plan !== targetPlan &&
            isPlanAtLeast(user.plan, targetPlan)
        ) {
            return {
                success: false,
                error: "Switching to a lower subscription tier is not available from checkout.",
            };
        }

        const customerId = await ensurePaddleCustomer(
            user.email,
            session.user.id,
            user.paddleCustomerId,
        );

        // Get price ID from environment
        const priceId = getPriceId(targetPlan);

        // Create checkout transaction
        const transaction = await createCheckout(customerId, priceId, {
            userId: session.user.id,
            plan: targetPlan,
            continueUrl,
        });
        if (!transaction) {
            return { success: false, error: "Failed to create checkout" };
        }

        return {
            success: true,
            checkoutId: transaction.id,
        };
    } catch (error) {
        console.error("Failed to open checkout:", error);
        return { success: false, error: "Failed to open checkout" };
    }
}

/**
 * Open multi-plan checkout - allows purchasing multiple plan seats in one transaction
 */
export async function openMultiCheckout(
    selectedPlans: unknown,
    continueUrl?: string,
): Promise<{
    success: boolean;
    checkoutId?: string;
    error?: string;
}> {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
        return { success: false, error: "Not authenticated" };
    }

    if (!isValidCheckoutItems(selectedPlans)) {
        return { success: false, error: "Invalid checkout items" };
    }

    const plans = selectedPlans as CheckoutItem[];

    if (plans.length === 0) {
        return { success: false, error: "No plans selected" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                email: true,
                plan: true,
                planSource: true,
                paddleCustomerId: true,
            },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        const accessState = await getUserAccessState(session.user.id);

        // Determine the highest plan being purchased
        const highestPurchasedPlan = plans.reduce<PaidPlan>(
            (highest, item) =>
                isPlanAtLeast(highest, item.plan) ? highest : item.plan,
            plans[0].plan,
        );

        // Block checkout if user already has this tier or higher via active subscription
        if (
            accessState.hasAccess &&
            user.planSource === "SUBSCRIPTION" &&
            isPlanAtLeast(accessState.effectivePlan, highestPurchasedPlan)
        ) {
            return {
                success: false,
                error: "You already have access to this plan tier or higher.",
            };
        }

        // Create / get Paddle customer
        const customerId = await ensurePaddleCustomer(
            user.email,
            session.user.id,
            user.paddleCustomerId,
        );

        // Build items array with price IDs
        const items = await Promise.all(
            plans.map(async (item) => ({
                priceId: getPriceId(item.plan, item.billingPeriod),
                quantity: item.quantity,
            })),
        );

        const purchasedPlans = plans.map((item) => item.plan);
        const transaction = await createMultiCheckout(customerId, items, {
            userId: session.user.id,
            purchasedPlans,
            continueUrl,
        });

        if (!transaction) {
            return { success: false, error: "Failed to create checkout" };
        }

        return { success: true, checkoutId: transaction.id };
    } catch (error) {
        console.error("Failed to open multi-plan checkout:", error);
        return { success: false, error: "Failed to open checkout" };
    }
}

export async function createPersonalReferralCode(): Promise<{
    success: boolean;
    code?: string;
    error?: string;
}> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        const existingCode = await prisma.referralCode.findUnique({
            where: { ownerUserId: session.user.id },
            select: { code: true },
        });

        if (existingCode) {
            return { success: true, code: existingCode.code };
        }

        const code = await generateUniqueReferralCode("REF");

        await prisma.referralCode.create({
            data: {
                code,
                ownerUserId: session.user.id,
                label: "Personal referral code",
            },
        });

        revalidatePath("/premium");

        return { success: true, code };
    } catch (error) {
        console.error("Failed to create referral code:", error);
        return { success: false, error: "Failed to create referral code" };
    }
}

async function generateUniqueReferralCode(prefix: string = "REF"): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        const existing = await prisma.referralCode.findUnique({
            where: { code: candidate },
            select: { id: true },
        });

        if (!existing) {
            return candidate;
        }
    }

    throw new Error("Failed to generate a unique referral code");
}

/**
 * Check if the current user has access to a required plan tier
 */
export async function hasPlanAccess(requiredPlan: AppPlan): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id) {
        return false;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true },
    });

    return isPlanAtLeast(user?.plan, requiredPlan);
}