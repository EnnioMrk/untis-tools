import { prisma } from "../lib/prisma";

/**
 * Migration script to convert old access fields (trialEndsAt, accessEndsAt, referralBonusMonths)
 * to the new AccessGrant ledger system.
 *
 * NOTE: This migration should have been run BEFORE the schema changes were pushed.
 * The old columns have already been removed from the database during `prisma db push`.
 * 
 * For development: Users can re-acquire access through:
 * - New subscriptions via Paddle
 * - Referrals (create new referral codes)
 * - Coupon codes
 * - Admin grants
 */
async function main() {
    console.log("AccessGrants migration script");
    console.log("================================\n");

    // Check current state
    const userCount = await prisma.user.count();
    const grantCount = await prisma.accessGrant.count();
    
    console.log(`Current state:`);
    console.log(`- Users: ${userCount}`);
    console.log(`- AccessGrants: ${grantCount}`);
    console.log("\nNote: Old access fields (trialEndsAt, accessEndsAt, referralBonusMonths)");
    console.log("were dropped from the database during schema push.");
    console.log("\nUsers can re-acquire premium access through:");
    console.log("  - Paddle subscription checkout");
    console.log("  - Redeeming referral codes");
    console.log("  - Admin-created grants");
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });