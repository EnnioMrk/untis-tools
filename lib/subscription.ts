import type { Plan, PlanSource } from '@prisma/client';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

type AccessUser = {
  id: string;
  plan: Plan;
  planSource: PlanSource;
  isAdmin: boolean;
  trialEndsAt: Date | null;
  accessEndsAt: Date | null;
  referralBonusMonths: number;
};

export function addMonths(date: Date, months: number): Date {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

export function formatPlanName(plan: Plan): string {
  if (plan === 'PREMIUM') {
    return 'Premium';
  }

  if (plan === 'STANDARD') {
    return 'Standard';
  }

  return 'Basic';
}

export function formatPlanSource(source: PlanSource): string {
  switch (source) {
    case 'SUBSCRIPTION':
      return 'subscription';
    case 'TRIAL':
      return 'trial';
    case 'BONUS':
      return 'bonus month';
    default:
      return 'inactive';
  }
}

export function getUserAccessState(user: AccessUser) {
  const now = new Date();
  const trialActive = user.planSource === 'TRIAL' && Boolean(user.trialEndsAt && user.trialEndsAt > now);
  const bonusActive = user.planSource === 'BONUS' && Boolean(user.accessEndsAt && user.accessEndsAt > now);
  const standardAccess = user.planSource === 'SUBSCRIPTION';
  const hasAccess = standardAccess || trialActive || bonusActive;
  const effectivePlan: Plan = trialActive ? 'PREMIUM' : user.plan;
  const trialExpired = user.planSource === 'TRIAL' && Boolean(user.trialEndsAt && user.trialEndsAt <= now);
  const bonusExpired = user.planSource === 'BONUS' && Boolean(user.accessEndsAt && user.accessEndsAt <= now);

  return {
    hasAccess,
    effectivePlan,
    trialActive,
    bonusActive,
    trialExpired,
    bonusExpired,
    shouldResetExpiredAccess: trialExpired || bonusExpired,
  };
}

export async function getUserAccessSnapshot(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      plan: true,
      planSource: true,
      isAdmin: true,
      trialEndsAt: true,
      accessEndsAt: true,
      referralBonusMonths: true,
    },
  });
}

export async function ensureActiveSubscriptionAccess(userId: string) {
  const user = await getUserAccessSnapshot(userId);

  if (!user) {
    redirect('/auth/signin');
  }

  const accessState = getUserAccessState(user);

  if (!accessState.hasAccess) {
    if (accessState.shouldResetExpiredAccess) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          planSource: 'NONE',
          trialEndsAt: null,
          accessEndsAt: null,
          paddleSubscriptionId: null,
        },
      });
    }

    redirect('/premium/trial-ended');
  }

  return {
    user,
    accessState,
  };
}

export async function ensureAdminAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect('/dashboard');
  }

  return user;
}