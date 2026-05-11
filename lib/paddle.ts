import {
    Paddle,
    Environment,
    type Customer,
    type Transaction,
    type Payment,
} from "@paddle/paddle-node-sdk";
import { WebhooksValidator } from "@paddle/paddle-node-sdk";
import type { PaidPlan } from "@/lib/plans";
import type { ShopThemeId } from "@/lib/shop";
import { inferServerPaddleEnvironment } from "@/lib/paddle-environment";

// Initialize Paddle SDK client
const paddleApiKey = process.env.PADDLE_API_KEY;
const paddleEnvironment = inferServerPaddleEnvironment(
    paddleApiKey,
    process.env.PADDLE_ENVIRONMENT,
) as Environment;

if (!paddleApiKey) {
    console.warn(
        "PADDLE_API_KEY is not set. Paddle integration will not work.",
    );
}

// Create Paddle client instance
export const paddleClient = paddleApiKey
    ? new Paddle(paddleApiKey, {
          environment: paddleEnvironment,
      })
    : null;

/**
 * Create a Paddle customer
 */
export async function createCustomer(
    email: string,
    userId: string,
): Promise<Customer | null> {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        const customer = await paddleClient.customers.create({
            email,
            customData: {
                userId,
            },
        });

        return customer;
    } catch (error) {
        console.error("Failed to create Paddle customer:", error);
        throw error;
    }
}

/**
 * Get an existing Paddle customer by ID
 */
export async function getCustomer(
    customerId: string,
): Promise<Customer | null> {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        const customer = await paddleClient.customers.get(customerId);
        return customer;
    } catch (error) {
        console.error("Failed to get Paddle customer:", error);
        return null;
    }
}

/**
 * Create a checkout transaction for a subscription
 */
export async function createCheckout(
    customerId: string,
    priceId: string,
    options: {
        userId: string;
        plan: PaidPlan;
        continueUrl?: string;
    },
): Promise<Transaction | null> {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        const transaction = await paddleClient.transactions.create({
            customerId,
            items: [
                {
                    priceId,
                    quantity: 1,
                },
            ],
            customData: {
                customerId,
                userId: options.userId,
                plan: options.plan,
                purchaseType: "SUBSCRIPTION",
                continueUrl: options.continueUrl,
            },
        });

        return transaction;
    } catch (error) {
        console.error("Failed to create checkout transaction:", error);
        throw error;
    }
}

export async function createThemeCheckout(
    customerId: string,
    priceId: string,
    options: {
        userId: string;
        themeId: ShopThemeId;
        continueUrl?: string;
    },
): Promise<Transaction | null> {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        const transaction = await paddleClient.transactions.create({
            customerId,
            items: [
                {
                    priceId,
                    quantity: 1,
                },
            ],
            customData: {
                customerId,
                userId: options.userId,
                themeId: options.themeId,
                purchaseType: "THEME",
                continueUrl: options.continueUrl,
            },
        });

        return transaction;
    } catch (error) {
        console.error("Failed to create theme checkout transaction:", error);
        throw error;
    }
}

/**
 * Get a transaction by ID
 */
export async function getTransaction(
    transactionId: string,
): Promise<Transaction | null> {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        const transaction = await paddleClient.transactions.get(transactionId);
        return transaction;
    } catch (error) {
        console.error("Failed to get transaction:", error);
        return null;
    }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
    subscriptionId: string,
): Promise<void> {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        await paddleClient.subscriptions.cancel(subscriptionId, {
            effectiveFrom: "next_billing_period",
        });
    } catch (error) {
        console.error("Failed to cancel subscription:", error);
        throw error;
    }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
    if (!paddleClient) {
        throw new Error("Paddle client is not initialized");
    }

    try {
        const subscription =
            await paddleClient.subscriptions.get(subscriptionId);
        return subscription;
    } catch (error) {
        console.error("Failed to get subscription:", error);
        return null;
    }
}

/**
 * Verify Paddle webhook signature
 * Returns true if the webhook is valid
 */
export async function verifyWebhookSignature(
    signature: string,
    body: string,
): Promise<boolean> {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("PADDLE_WEBHOOK_SECRET is not set");
        return false;
    }

    try {
        const validator = new WebhooksValidator();
        return await validator.isValidSignature(body, webhookSecret, signature);
    } catch (error) {
        console.error("Failed to verify webhook signature:", error);
        return false;
    }
}

/**
 * Get the price ID from environment
 */
export function getPriceId(
    plan: PaidPlan,
    billingPeriod: "monthly" | "yearly" = "monthly",
): string {
    const prefix = billingPeriod === "yearly" ? "PADDLE_YEARLY" : "PADDLE";

    let priceId: string | undefined;

    if (plan === "BASIC") {
        priceId =
            process.env[`${prefix}_BASIC_PRICE_ID`] ||
            process.env[`${prefix}_PRICE_ID`];
    } else if (plan === "STANDARD") {
        priceId =
            process.env[`${prefix}_STANDARD_PRICE_ID`] ||
            process.env[`${prefix}_PRICE_ID`];
    } else {
        priceId =
            process.env[`${prefix}_PREMIUM_PRICE_ID`] ||
            process.env[`${prefix}_PRICE_ID`];
    }

    if (!priceId) {
        throw new Error(
            `${prefix}_${plan}_PRICE_ID or ${prefix}_PRICE_ID is not set`,
        );
    }
    return priceId;
}

/**
 * Create a multi-plan checkout transaction
 */
export async function createMultiCheckout(
    customerId: string,
    checkoutItems: { priceId: string; quantity: number }[],
    options: { userId: string; purchasedPlans: PaidPlan[]; continueUrl?: string },
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
                continueUrl: options.continueUrl,
            },
        });
        return transaction;
    } catch (error) {
        console.error("Failed to create multi-plan checkout transaction:", error);
        throw error;
    }
}

export function getThemePriceId(themeId: ShopThemeId): string {
    const priceMap: Record<
        Exclude<ShopThemeId, "DEFAULT">,
        string | undefined
    > = {
        MIDNIGHT: process.env.PADDLE_THEME_MIDNIGHT_PRICE_ID,
        SUNSET: process.env.PADDLE_THEME_SUNSET_PRICE_ID,
        FOREST: process.env.PADDLE_THEME_FOREST_PRICE_ID,
        AURORA: process.env.PADDLE_THEME_AURORA_PRICE_ID,
    };

    if (themeId === "DEFAULT") {
        throw new Error("Default theme does not require a price ID");
    }

    const priceId = priceMap[themeId];

    if (!priceId) {
        throw new Error(`Price ID for theme ${themeId} is not set`);
    }

    return priceId;
}

export function resolvePlanFromPriceId(
    priceId: string | null | undefined,
): PaidPlan | null {
    if (!priceId) {
        return null;
    }

    // Check monthly price IDs
    if (priceId === process.env.PADDLE_BASIC_PRICE_ID) {
        return "BASIC";
    }

    if (priceId === process.env.PADDLE_STANDARD_PRICE_ID) {
        return "STANDARD";
    }

    if (
        priceId === process.env.PADDLE_PREMIUM_PRICE_ID ||
        priceId === process.env.PADDLE_PRICE_ID
    ) {
        return "PREMIUM";
    }

    // Check yearly price IDs
    if (priceId === process.env.PADDLE_YEARLY_BASIC_PRICE_ID) {
        return "BASIC";
    }

    if (priceId === process.env.PADDLE_YEARLY_STANDARD_PRICE_ID) {
        return "STANDARD";
    }

    if (
        priceId === process.env.PADDLE_YEARLY_PREMIUM_PRICE_ID ||
        priceId === process.env.PADDLE_YEARLY_PRICE_ID
    ) {
        return "PREMIUM";
    }

    return null;
}

export function resolvePlansFromPriceIds(
    priceIds: (string | null | undefined)[],
): PaidPlan[] {
    return priceIds.map(resolvePlanFromPriceId).filter(Boolean) as PaidPlan[];
}
