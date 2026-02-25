'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserStatsCache, invalidateUserStatsCache } from '@/lib/cache';
import type { WidgetData, UserStatsResponse, TrendData, SubjectBreakdownItem, DailyTrendItem, WidgetType } from '@/types/widget';
import { DEFAULT_WIDGETS, WIDGET_DEFINITIONS } from '@/types/widget';
import { triggerImmediateSync } from '@/lib/sync';

// Constants for plan limits
const FREE_MAX_WIDGETS = 5;

/**
 * Get premium widget types
 */
function getPremiumWidgetTypes(): WidgetType[] {
  return (Object.keys(WIDGET_DEFINITIONS) as WidgetType[]).filter(
    (type) => WIDGET_DEFINITIONS[type].isPremium
  );
}

/**
 * Validate widget layout based on user's plan
 */
function validateWidgetLayout(
  widgets: WidgetData[],
  userPlan: 'FREE' | 'PREMIUM'
): { valid: boolean; error?: string } {
  // Check widget count limit for FREE users
  if (userPlan === 'FREE' && widgets.length > FREE_MAX_WIDGETS) {
    return {
      valid: false,
      error: `Free plan is limited to ${FREE_MAX_WIDGETS} widgets. Please remove some widgets or upgrade to Premium.`,
    };
  }

  // Check premium widgets for FREE users
  if (userPlan === 'FREE') {
    const premiumTypes = getPremiumWidgetTypes();
    const hasPremiumWidget = widgets.some((widget) =>
      premiumTypes.includes(widget.type as WidgetType)
    );

    if (hasPremiumWidget) {
      return {
        valid: false,
        error: 'Some widgets require Premium. Please upgrade to Premium or remove these widgets.',
      };
    }
  }

  return { valid: true };
}

/**
 * Get the current user's stats
 * Uses LRU cache for performance
 */
export async function getUserStats(useCache: boolean = true): Promise<UserStatsResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    console.log('[getUserStats] No session or user ID');
    return null;
  }

  const userId = session.user.id;
  const cacheKey = `user:${userId}:stats`;

  // Try to get from cache if useCache is true
  if (useCache) {
    const cache = getUserStatsCache();
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      console.log('[getUserStats] Cache hit for user:', userId);
      return cachedStats as UserStatsResponse;
    }
    console.log('[getUserStats] Cache miss for user:', userId);
  } else {
    console.log('[getUserStats] Cache bypassed for user:', userId);
  }

  console.log('[getUserStats] Fetching stats for user:', session.user.id);

  const userStats = await prisma.userStats.findUnique({
    where: { userId: session.user.id },
  });

  if (!userStats) {
    console.log('[getUserStats] No userStats found in database for user:', session.user.id);
    
    // Debug: Check if user has an UntisConnection
    const connection = await prisma.untisConnection.findUnique({
      where: { userId: session.user.id },
    });
    console.log('[getUserStats] User has UntisConnection:', !!connection, connection ? { isActive: connection.isActive, lastSyncAt: connection.lastSyncAt } : 'N/A');
    
    return null;
  }

  console.log('[getUserStats] Found userStats:', { absences7Days: userStats.absences7Days, lastCalculated: userStats.lastCalculated });

  // Parse JSON fields with proper typing
  const trend7Days = userStats.trend7Days as TrendData | null;
  const trend14Days = userStats.trend14Days as TrendData | null;
  const trend30Days = userStats.trend30Days as TrendData | null;
  
  // Handle subjectBreakdown - can be either array or object
  let subjectBreakdown: SubjectBreakdownItem[] = [];
  if (Array.isArray(userStats.subjectBreakdown)) {
    subjectBreakdown = userStats.subjectBreakdown as unknown as SubjectBreakdownItem[];
  } else if (userStats.subjectBreakdown && typeof userStats.subjectBreakdown === 'object') {
    // Convert from Record format to array
    subjectBreakdown = Object.entries(userStats.subjectBreakdown as Record<string, any>).map(
      ([subject, data]) => ({
        subject,
        total: data.total || 0,
        attended: data.attended || 0,
        absences: data.absences || 0,
        cancelled: data.cancelled || 0,
        absenceRate: data.absenceRate || 0,
      })
    );
  }
  
  // Handle dailyTrend - ensure it's an array
  let dailyTrend: DailyTrendItem[] = [];
  if (Array.isArray(userStats.dailyTrend)) {
    dailyTrend = (userStats.dailyTrend as unknown as Array<{date: string; absenceRate: number; totalLessons?: number; absences?: number}>).map(item => ({
      date: item.date,
      absenceRate: item.absenceRate,
      totalLessons: item.totalLessons || 0,
      absences: item.absences || 0,
    }));
  }

  const result = {
    absences7Days: userStats.absences7Days,
    absences14Days: userStats.absences14Days,
    absences30Days: userStats.absences30Days,
    absencesAllTime: userStats.absencesAllTime,
    trend7Days,
    trend14Days,
    trend30Days,
    subjectBreakdown: subjectBreakdown || [],
    dailyTrend: dailyTrend || [],
  };

  // Cache the result if useCache is true
  if (useCache) {
    const cache = getUserStatsCache();
    cache.set(cacheKey, result);
  }

  return result;
}

/**
 * Get the current user's widget layout
 */
export async function getUserWidgets(): Promise<WidgetData[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return DEFAULT_WIDGETS;
  }

  const widgets = await prisma.widget.findMany({
    where: { userId: session.user.id },
    orderBy: { order: 'asc' },
  });

  if (widgets.length === 0) {
    return DEFAULT_WIDGETS;
  }

  return widgets.map((widget: { id: string; type: string; layoutData: unknown; config: unknown }) => {
    const layoutData = widget.layoutData as { x: number; y: number; w: number; h: number };
    return {
      id: widget.id,
      type: widget.type as WidgetData['type'],
      x: layoutData.x,
      y: layoutData.y,
      w: layoutData.w,
      h: layoutData.h,
      config: (widget.config as Record<string, unknown>) || undefined,
    };
  });
}

/**
 * Save the user's widget layout
 */
export async function saveWidgetLayout(widgets: WidgetData[]): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get user's current plan
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    const userPlan = user?.plan || 'FREE';

    // Validate widget layout based on user's plan
    const validation = validateWidgetLayout(widgets, userPlan);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Delete existing widgets and create new ones in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Delete all existing widgets for this user
      await tx.widget.deleteMany({
        where: { userId: session.user.id },
      });

      // Create new widgets
      for (let i = 0; i < widgets.length; i++) {
        const widget = widgets[i];
        await tx.widget.create({
          data: {
            userId: session.user.id,
            type: widget.type,
            layoutData: {
              x: widget.x,
              y: widget.y,
              w: widget.w,
              h: widget.h,
            },
            config: widget.config || null,
            order: i,
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save widget layout:', error);
    return { success: false, error: 'Failed to save layout' };
  }
}

/**
 * Check if user has an UntisConnection
 */
export async function hasUntisConnection(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const connection = await prisma.untisConnection.findUnique({
    where: { userId: session.user.id },
  });

  return !!connection;
}

/**
 * Get the current user's plan
 */
export async function getUserPlan(): Promise<'FREE' | 'PREMIUM'> {
  const session = await auth();
  if (!session?.user?.id) {
    return 'FREE';
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });

  return user?.plan || 'FREE';
}

/**
 * Manually trigger a sync for the current user
 */
export async function triggerManualSync(): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const userId = session.user.id;
  console.log('[triggerManualSync] Starting manual sync for user:', userId);
  
  const result = await triggerImmediateSync(userId);
  
  // Invalidate cache after sync to ensure fresh data
  if (result.success) {
    console.log('[triggerManualSync] Sync successful, invalidating cache for user:', userId);
    invalidateUserStatsCache(userId);
  }
  
  return result;
}

/**
 * Get user stats without using cache - forces fresh data from database
 * Use this when user wants to reload data without triggering a full sync
 */
export async function getUserStatsNoCache(): Promise<UserStatsResponse | null> {
  return getUserStats(false);
}
