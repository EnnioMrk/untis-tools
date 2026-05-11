import type { Prisma, Plan, GrantType, GrantStatus, PlanSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addMonths } from "./subscription";
import { isPlanAtLeast, type PaidPlan } from "./plans";
import { formatPlanSource } from "./subscription";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Priority order for grant types when resolving effective access.
 * Lower number = higher priority (checked first).
 */
const GRANT_PRIORITY: Record<GrantType, number> = {
  SUBSCRIPTION: 0,
  TRIAL: 1,
  REFERRAL: 2,
  COUPON: 3,
  ADMIN: 4,
};

/**
 * How many months each grant type adds by default.
 */
const DEFAULT_GRANT_MONTHS: Record<GrantType, number> = {
  SUBSCRIPTION: 1,
  TRIAL: 1,
  REFERRAL: 1,
  COUPON: 1,
  ADMIN: 1,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccessState {
  /** Does the user currently have usable access? */
  hasAccess: boolean;
  /** The effective plan the user is on right now. */
  effectivePlan: Plan;
  /** When the current access expires (null = ongoing subscription). */
  expiresAt: Date | null;
  /** The human-readable source of the current access. */
  source: string;
  /** All grants that contributed to this access state. */
  sourceGrants: Prisma.AccessGrantGetPayload<{
    include: { user: true };
  }>[];
}

export interface AccessGrantWithTimeline extends Prisma.AccessGrantGetPayload<{} > {
    /** Computed timeline position (start of this grant's contribution). */
    timelineStart?: Date;
    /** Computed timeline position (end of this grant's contribution). */
    timelineEnd?: Date;
}

/**
 * Format a GrantType for display.
 */
function formatGrantType(grantType: GrantType): string {
    switch (grantType) {
        case "SUBSCRIPTION":
            return "subscription";
        case "TRIAL":
            return "trial";
        case "REFERRAL":
        case "COUPON":
        case "ADMIN":
            return "bonus month";
        default:
            return "unknown";
    }
}

export async function getUserAccessState(userId: string): Promise<AccessState> {
    return refreshGrants(userId);
}

/**
 * Map GrantType to PlanSource for user.planSource field.
 */
function grantTypeToPlanSource(grantType: GrantType): PlanSource {
    switch (grantType) {
        case "SUBSCRIPTION":
            return "SUBSCRIPTION";
        case "TRIAL":
            return "TRIAL";
        case "ADMIN":
        case "REFERRAL":
        case "COUPON":
            return "BONUS";
        default:
            return "NONE";
    }
}

// ---------------------------------------------------------------------------
// Core Engine
// ---------------------------------------------------------------------------

/**
 * Delete expired grants that are older than 30 days.
 * This keeps the grants table clean and prevents stale data from accumulating.
 */
export async function deleteOldExpiredGrants(): Promise<number> {
  const THIRTY_DAYS_AGO = new Date();
  THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

  const result = await prisma.accessGrant.deleteMany({
    where: {
      status: "EXPIRED",
      updatedAt: { lt: THIRTY_DAYS_AGO },
    },
  });

  return result.count;
}

/**
 * Fetch all non-EXPIRED grants for a user, sorted by priority then createdAt.
 */
async function fetchUserGrants(
  userId: string,
): Promise<Prisma.AccessGrantGetPayload<{ include: { user: true } }>[]> {
  return prisma.accessGrant.findMany({
    where: {
      userId,
      status: { not: "EXPIRED" as GrantStatus },
    },
    include: { user: true },
    orderBy: [
      { status: "asc" }, // ACTIVE before PENDING
      { createdAt: "asc" },
    ],
  });
}

/**
 * Compute the user's effective access from their chronological grant ledger.
 *
 * Algorithm:
 *  1. Fetch all ACTIVE + PENDING grants.
 *  2. Sort by priority (SUBSCRIPTION > TRIAL > REFERRAL/COUPON/ADMIN), then createdAt.
 *  3. Build a timeline starting from `now`.
 *  4. For each ACTIVE grant, extend the timeline by (expiresAt - now).
 *  5. For each PENDING grant:
 *     - If the user currently has no access (timeline tail <= now) OR
 *       their access ends within 1 hour, auto-activate this grant
 *       and set expiresAt = tailOfTimeline + months.
 *  6. Return the access state.
 */
export async function resolveAccessState(
  userId: string,
): Promise<AccessState> {
  const now = new Date();
  const grants = await fetchUserGrants(userId);

  // Separate ACTIVE and PENDING
  const activeGrants = grants.filter(
    (g) => g.status === "ACTIVE" && g.expiresAt && g.expiresAt > now,
  );
  const pendingGrants = grants.filter((g) => g.status === "PENDING");

// Sort by priority then createdAt
   const sortGrants = (
     a: Prisma.AccessGrantGetPayload<{}>,
     b: Prisma.AccessGrantGetPayload<{}>,
   ) => {
    const pa = GRANT_PRIORITY[a.type as GrantType] ?? 99;
    const pb = GRANT_PRIORITY[b.type as GrantType] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.createdAt.getTime() - b.createdAt.getTime();
  };

  activeGrants.sort(sortGrants);
  pendingGrants.sort(sortGrants);

  // --- Build the timeline from ACTIVE grants ---
  // timelineEnd = the furthest point in the future that active grants cover
  let timelineEnd = now;
  for (const grant of activeGrants) {
    if (grant.expiresAt && grant.expiresAt > timelineEnd) {
      timelineEnd = grant.expiresAt;
    }
  }

  const hasActiveAccess = timelineEnd > now;

  // --- Auto-activate PENDING grants if the user is expired or expiring soon ---
  // "Soon" = within 1 hour, giving a small grace window for webhook delays.
  const GRACE_WINDOW_MS = 60 * 60 * 1000;

  if (!hasActiveAccess || timelineEnd.getTime() - now.getTime() < GRACE_WINDOW_MS) {
    for (const grant of pendingGrants) {
      // Determine how many months this grant provides
      const months = grant.months || DEFAULT_GRANT_MONTHS[grant.type as GrantType] || 1;

      const newExpiresAt = addMonths(timelineEnd, months);

      // Atomic activation inside a transaction to prevent double-spending
      await prisma.$transaction(async (tx) => {
        // Re-read the grant to ensure it's still PENDING (prevent race conditions)
        const currentGrant = await tx.accessGrant.findUnique({
          where: { id: grant.id },
          select: { id: true, status: true, months: true, userId: true },
        });

        if (!currentGrant || currentGrant.status !== "PENDING") {
          return; // Another process already activated it
        }

        await tx.accessGrant.update({
          where: { id: grant.id },
          data: {
            status: "ACTIVE" as GrantStatus,
            activatedAt: now,
            expiresAt: newExpiresAt,
            updatedAt: now,
          },
        });

        // Also promote the user's plan if this grant is higher priority
        const grantPlan = grant.plan ?? "PREMIUM";
        const currentPlan = grant.user?.plan ?? "BASIC";
        if (isPlanAtLeast(grantPlan, currentPlan)) {
          await tx.user.update({
            where: { id: userId },
            data: {
              plan: grantPlan,
              planSource: grantTypeToPlanSource(grant.type as GrantType),
              updatedAt: now,
            },
          });
        }
      });

      // Push the timeline forward
      timelineEnd = newExpiresAt;

      // Only auto-activate the FIRST eligible pending grant per call.
      // Subsequent grants remain PENDING and will activate on future calls.
      break;
    }
  }

  // --- Compute the final effective plan ---
  const effectivePlan =
    activeGrants.length > 0
      ? activeGrants.sort(sortGrants)[0].plan ?? "BASIC"
      : "BASIC";

// --- Compute source description ---
   const sourceLabel =
     activeGrants.length > 0
       ? formatGrantType(activeGrants.sort(sortGrants)[0].type as GrantType)
       : "inactive";

  return {
    hasAccess: timelineEnd > now,
    effectivePlan: effectivePlan as Plan,
    expiresAt: timelineEnd > now ? timelineEnd : null,
    source: sourceLabel,
    sourceGrants: grants,
  };
}

/**
 * Refresh/activate grants for a user.
 * Call this in layout.tsx or middleware to ensure access is up to date.
 *
 * Returns the current access state after refresh.
 */
export async function refreshGrants(userId: string): Promise<AccessState> {
  // Expire any grants that have passed their expiry
  await prisma.accessGrant.updateMany({
    where: {
      userId,
      status: "ACTIVE" as GrantStatus,
      expiresAt: { not: null, lt: new Date() },
    },
    data: {
      status: "EXPIRED" as GrantStatus,
      updatedAt: new Date(),
    },
  });

  // Clean up old expired grants periodically (keeps DB tidy)
  await deleteOldExpiredGrants();

  return resolveAccessState(userId);
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Check if a user has access to at least the given plan tier.
 * Uses refreshGrants internally for up-to-date results.
 */
export async function userHasPlanAccess(
  userId: string,
  requiredPlan: PaidPlan,
): Promise<boolean> {
  const access = await refreshGrants(userId);
  return (
    access.hasAccess && isPlanAtLeast(access.effectivePlan, requiredPlan)
  );
}

/**
 * Get the current effective plan for a user.
 */
export async function getEffectivePlan(userId: string): Promise<Plan> {
  const access = await refreshGrants(userId);
  return access.effectivePlan;
}

// ---------------------------------------------------------------------------
// Paddle webhook helpers
// ---------------------------------------------------------------------------

/**
 * Create an ACTIVE subscription grant from a Paddle webhook.
 *
 * If a grant with the same paddleId already exists, this is a no-op
 * (prevents duplicate creation from replayed webhooks).
 *
 * If existing PENDING grants conflict, they are pushed forward in time.
 */
export async function createSubscriptionGrant(
  data: {
    userId: string;
    paddleSubscriptionId: string;
    plan: PaidPlan;
    months?: number;
  },
  txClient?: Prisma.TransactionClient,
): Promise<Prisma.AccessGrantGetPayload<{}>> {
  const { userId, paddleSubscriptionId, plan, months = 1 } = data;
  const client = txClient || prisma;
  const now = new Date();
  const expiresAt = addMonths(now, months);

  // Conflict resolution: if a grant with this paddleId already exists, return it
  const existing = await client.accessGrant.findUnique({
    where: { paddleId: paddleSubscriptionId },
  });

  if (existing) {
    // Update the existing grant if it's expired or pending
    if (existing.status === "EXPIRED" || existing.status === "PENDING") {
      return client.accessGrant.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE" as GrantStatus,
          activatedAt: now,
          expiresAt: addMonths(now, existing.months),
          updatedAt: now,
        },
      });
    }
    return existing;
  }

  // Create the new subscription grant
  return client.accessGrant.create({
    data: {
      userId,
      type: "SUBSCRIPTION" as GrantType,
      status: "ACTIVE" as GrantStatus,
      plan,
      months,
      paddleId: paddleSubscriptionId,
      activatedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    },
  });
}

/**
 * Create a PENDING referral grant.
 * Triggered when a referred user pays.
 */
export async function createReferralGrant(
  data: {
    sourceUserId: string;
    userId: string;
    referralRedemptionId: string;
    months?: number;
  },
  txClient?: Prisma.TransactionClient,
): Promise<Prisma.AccessGrantGetPayload<{}>> {
  const { sourceUserId, userId, referralRedemptionId, months = 1 } = data;
  const client = txClient || prisma;
  const now = new Date();

  return client.accessGrant.create({
    data: {
      userId: sourceUserId, // Grant goes to the referrer
      type: "REFERRAL" as GrantType,
      status: "PENDING" as GrantStatus,
      plan: "PREMIUM" as Plan,
      months,
      sourceUserId: userId,
      createdAt: now,
      updatedAt: now,
    },
  });
}

/**
 * Create a PENDING coupon grant.
 */
export async function createCouponGrant(
  data: {
    userId: string;
    couponRedemptionId: string;
    months: number;
    plan?: PaidPlan;
  },
  txClient?: Prisma.TransactionClient,
): Promise<Prisma.AccessGrantGetPayload<{}>> {
  const { userId, couponRedemptionId, months, plan = "PREMIUM" } = data;
  const client = txClient || prisma;
  const now = new Date();

  return client.accessGrant.create({
    data: {
      userId,
      type: "COUPON" as GrantType,
      status: "PENDING" as GrantStatus,
      plan: plan as Plan,
      months,
      createdAt: now,
      updatedAt: now,
    },
  });
}

/**
 * Create an ADMIN grant (used by admin panel).
 */
export async function createAdminGrant(
  data: {
    userId: string;
    plan: PaidPlan;
    months?: number;
  },
  txClient?: Prisma.TransactionClient,
): Promise<Prisma.AccessGrantGetPayload<{}>> {
  const { userId, plan, months = 1 } = data;
  const client = txClient || prisma;
  const now = new Date();

  return client.accessGrant.create({
    data: {
      userId,
      type: "ADMIN" as GrantType,
      status: "ACTIVE" as GrantStatus,
      plan: plan as Plan,
      months,
      activatedAt: now,
      expiresAt: addMonths(now, months),
      createdAt: now,
      updatedAt: now,
    },
  });
}