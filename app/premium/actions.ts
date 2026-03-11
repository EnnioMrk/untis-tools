'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { isPlanAtLeast, type AppPlan, type PaidPlan } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { generateUniqueReferralCode } from '@/lib/referrals';
import {
  createCustomer,
  createCheckout,
  getCustomer,
  getPriceId,
} from '@/lib/paddle';
import { getUserAccessState } from '@/lib/subscription';

/**
 * Subscription status response
 */
export interface SubscriptionStatus {
  plan: AppPlan;
  selectedPlan: AppPlan;
  planSource: string;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  trialEndsAt: Date | null;
  accessEndsAt: Date | null;
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
      trialEndsAt: true,
      accessEndsAt: true,
      referralBonusMonths: true,
    },
  });

  if (!user) {
    return null;
  }

  const accessState = getUserAccessState({
    id: session.user.id,
    plan: user.plan,
    planSource: user.planSource,
    isAdmin: false,
    trialEndsAt: user.trialEndsAt,
    accessEndsAt: user.accessEndsAt,
    referralBonusMonths: user.referralBonusMonths,
  });

  return {
    plan: accessState.effectivePlan,
    selectedPlan: user.plan,
    planSource: user.planSource,
    paddleCustomerId: user.paddleCustomerId,
    paddleSubscriptionId: user.paddleSubscriptionId,
    trialEndsAt: user.trialEndsAt,
    accessEndsAt: user.accessEndsAt,
    hasActiveAccess: accessState.hasAccess,
  };
}

/**
 * Open checkout - creates/updates Paddle customer and returns checkout URL
 */
export async function openCheckout(targetPlan: PaidPlan): Promise<{
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
        plan: true,
        planSource: true,
        paddleCustomerId: true,
        trialEndsAt: true,
        accessEndsAt: true,
        referralBonusMonths: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const accessState = getUserAccessState({
      id: session.user.id,
      plan: user.plan,
      planSource: user.planSource,
      isAdmin: false,
      trialEndsAt: user.trialEndsAt,
      accessEndsAt: user.accessEndsAt,
      referralBonusMonths: user.referralBonusMonths,
    });

    if (accessState.hasAccess && user.planSource === 'SUBSCRIPTION' && user.plan === targetPlan) {
      return {
        success: false,
        error: `${targetPlan === 'BASIC' ? 'Basic' : targetPlan === 'STANDARD' ? 'Standard' : 'Premium'} is already active.`,
      };
    }

    if (
      accessState.hasAccess &&
      user.planSource === 'SUBSCRIPTION' &&
      user.plan !== targetPlan &&
      isPlanAtLeast(user.plan, targetPlan)
    ) {
      return {
        success: false,
        error: 'Switching to a lower subscription tier is not available from checkout.',
      };
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
    const priceId = getPriceId(targetPlan);

    // Create checkout transaction
    const transaction = await createCheckout(customerId, priceId, {
      userId: session.user.id,
      plan: targetPlan,
    });
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

export async function createPersonalReferralCode(): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const existingCode = await prisma.referralCode.findUnique({
      where: { ownerUserId: session.user.id },
      select: { code: true },
    });

    if (existingCode) {
      return { success: true, code: existingCode.code };
    }

    const code = await generateUniqueReferralCode('REF');

    await prisma.referralCode.create({
      data: {
        code,
        ownerUserId: session.user.id,
        label: 'Personal referral code',
      },
    });

    revalidatePath('/premium');

    return { success: true, code };
  } catch (error) {
    console.error('Failed to create referral code:', error);
    return { success: false, error: 'Failed to create referral code' };
  }
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
