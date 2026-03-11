'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import {
  createCustomer,
  createThemeCheckout,
  getCustomer,
  getThemePriceId,
} from '@/lib/paddle';
import { prisma } from '@/lib/prisma';
import {
  formatEuroCents,
  getShopTheme,
  normalizeShopTheme,
  type ShopThemeId,
} from '@/lib/shop';

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CheckoutActionResult extends ActionResult {
  checkoutId?: string;
}

async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      activeTheme: true,
      paddleCustomerId: true,
    },
  });
}

async function ensurePaddleCustomerId(user: {
  id: string;
  email: string;
  paddleCustomerId: string | null;
}) {
  if (!user.paddleCustomerId) {
    const customer = await createCustomer(user.email, user.id);

    if (!customer) {
      throw new Error('Failed to create customer');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { paddleCustomerId: customer.id },
    });

    return customer.id;
  }

  const existingCustomer = await getCustomer(user.paddleCustomerId);

  if (existingCustomer) {
    return user.paddleCustomerId;
  }

  const customer = await createCustomer(user.email, user.id);

  if (!customer) {
    throw new Error('Failed to create customer');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { paddleCustomerId: customer.id },
  });

  return customer.id;
}

export async function openThemeCheckout(themeId: ShopThemeId): Promise<CheckoutActionResult> {
  const normalizedTheme = normalizeShopTheme(themeId);
  const theme = getShopTheme(normalizedTheme);

  if (theme.priceEuroCents === 0) {
    return { success: false, error: 'The default theme is already included.' };
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: 'Not authenticated.' };
  }

  const existingPurchase = await prisma.themePurchase.findUnique({
    where: {
      userId_theme: {
        userId: user.id,
        theme: normalizedTheme,
      },
    },
    select: { id: true },
  });

  if (existingPurchase) {
    return { success: false, error: 'Theme already owned.' };
  }

  try {
    const customerId = await ensurePaddleCustomerId(user);
    const priceId = getThemePriceId(normalizedTheme);
    const transaction = await createThemeCheckout(customerId, priceId, {
      userId: user.id,
      themeId: normalizedTheme,
    });

    if (!transaction) {
      return { success: false, error: 'Failed to start checkout.' };
    }

    return { success: true, checkoutId: transaction.id };
  } catch (error) {
    console.error(`Failed to open checkout for ${theme.name} (${formatEuroCents(theme.priceEuroCents)}):`, error);
    return { success: false, error: 'Failed to start checkout.' };
  }
}

export async function activateOwnedTheme(themeId: ShopThemeId): Promise<ActionResult> {
  const normalizedTheme = normalizeShopTheme(themeId);
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: 'Not authenticated.' };
  }

  if (normalizedTheme !== 'DEFAULT') {
    const existingPurchase = await prisma.themePurchase.findUnique({
      where: {
        userId_theme: {
          userId: user.id,
          theme: normalizedTheme,
        },
      },
      select: { id: true },
    });

    if (!existingPurchase) {
      return { success: false, error: 'Theme not owned yet.' };
    }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        activeTheme: normalizedTheme,
      },
    });

    revalidatePath('/shop');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Failed to activate theme:', error);
    return { success: false, error: 'Failed to activate theme.' };
  }
}
