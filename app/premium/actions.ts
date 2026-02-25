'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createCustomer,
  createCheckout,
  getCustomer,
  getPriceId,
} from '@/lib/paddle';

/**
 * Subscription status response
 */
export interface SubscriptionStatus {
  plan: 'FREE' | 'PREMIUM';
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
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
      paddleCustomerId: true,
      paddleSubscriptionId: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    plan: user.plan,
    paddleCustomerId: user.paddleCustomerId,
    paddleSubscriptionId: user.paddleSubscriptionId,
  };
}

/**
 * Open checkout - creates/updates Paddle customer and returns checkout URL
 */
export async function openCheckout(): Promise<{
  success: boolean;
  checkoutId?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        paddleCustomerId: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    let customerId = user.paddleCustomerId;

    // Create or get Paddle customer
    if (!customerId) {
      const customer = await createCustomer(user.email, session.user.id);
      if (!customer) {
        return { success: false, error: 'Failed to create customer' };
      }
      customerId = customer.id;

      // Store customer ID in database
      await prisma.user.update({
        where: { id: session.user.id },
        data: { paddleCustomerId: customerId },
      });
    } else {
      // Verify customer exists in Paddle
      const existingCustomer = await getCustomer(customerId);
      if (!existingCustomer) {
        // Customer doesn't exist in Paddle, create new one
        const customer = await createCustomer(user.email, session.user.id);
        if (!customer) {
          return { success: false, error: 'Failed to create customer' };
        }
        customerId = customer.id;

        await prisma.user.update({
          where: { id: session.user.id },
          data: { paddleCustomerId: customerId },
        });
      }
    }

    // Get price ID from environment
    const priceId = getPriceId();

    // Create checkout transaction
    const transaction = await createCheckout(customerId, priceId);
    if (!transaction) {
      return { success: false, error: 'Failed to create checkout' };
    }

    return {
      success: true,
      checkoutId: transaction.id,
    };
  } catch (error) {
    console.error('Failed to open checkout:', error);
    return { success: false, error: 'Failed to open checkout' };
  }
}

/**
 * Check if user is premium
 */
export async function isPremium(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });

  return user?.plan === 'PREMIUM';
}
