import { Paddle, Environment, type Customer, type Transaction } from '@paddle/paddle-node-sdk';
import { WebhooksValidator } from '@paddle/paddle-node-sdk';

// Initialize Paddle SDK client
const paddleApiKey = process.env.PADDLE_API_KEY;
const paddleEnvironment = (process.env.PADDLE_ENVIRONMENT as Environment) || 'sandbox';

if (!paddleApiKey) {
  console.warn('PADDLE_API_KEY is not set. Paddle integration will not work.');
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
  userId: string
): Promise<Customer | null> {
  if (!paddleClient) {
    throw new Error('Paddle client is not initialized');
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
    console.error('Failed to create Paddle customer:', error);
    throw error;
  }
}

/**
 * Get an existing Paddle customer by ID
 */
export async function getCustomer(customerId: string): Promise<Customer | null> {
  if (!paddleClient) {
    throw new Error('Paddle client is not initialized');
  }

  try {
    const customer = await paddleClient.customers.get(customerId);
    return customer;
  } catch (error) {
    console.error('Failed to get Paddle customer:', error);
    return null;
  }
}

/**
 * Create a checkout transaction for a subscription
 */
export async function createCheckout(
  customerId: string,
  priceId: string
): Promise<Transaction | null> {
  if (!paddleClient) {
    throw new Error('Paddle client is not initialized');
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
      },
    });

    return transaction;
  } catch (error) {
    console.error('Failed to create checkout transaction:', error);
    throw error;
  }
}

/**
 * Get a transaction by ID
 */
export async function getTransaction(transactionId: string): Promise<Transaction | null> {
  if (!paddleClient) {
    throw new Error('Paddle client is not initialized');
  }

  try {
    const transaction = await paddleClient.transactions.get(transactionId);
    return transaction;
  } catch (error) {
    console.error('Failed to get transaction:', error);
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  if (!paddleClient) {
    throw new Error('Paddle client is not initialized');
  }

  try {
    await paddleClient.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'next_billing_period',
    });
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  if (!paddleClient) {
    throw new Error('Paddle client is not initialized');
  }

  try {
    const subscription = await paddleClient.subscriptions.get(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return null;
  }
}

/**
 * Verify Paddle webhook signature
 * Returns true if the webhook is valid
 */
export async function verifyWebhookSignature(signature: string, body: string): Promise<boolean> {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('PADDLE_WEBHOOK_SECRET is not set');
    return false;
  }

  try {
    const validator = new WebhooksValidator();
    return await validator.isValidSignature(body, webhookSecret, signature);
  } catch (error) {
    console.error('Failed to verify webhook signature:', error);
    return false;
  }
}

/**
 * Get the price ID from environment
 */
export function getPriceId(): string {
  const priceId = process.env.PADDLE_PRICE_ID;
  if (!priceId) {
    throw new Error('PADDLE_PRICE_ID is not set');
  }
  return priceId;
}
