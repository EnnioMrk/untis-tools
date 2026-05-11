import { prisma } from "@/lib/prisma";

export function normalizeCouponCode(value: string | null | undefined): string {
    return (value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "");
}

export async function findAvailableCouponCode(
    rawCode: string,
    userId: string,
) {
    const code = normalizeCouponCode(rawCode);

    if (!code) {
        return null;
    }

    const couponCode = await prisma.couponCode.findUnique({
        where: { code, isActive: true },
        include: {
            _count: {
                select: {
                    redemptions: true,
                },
            },
        },
    });

    if (!couponCode) {
        return null;
    }

    // Check if the coupon has expired
    if (couponCode.expiresAt && couponCode.expiresAt <= new Date()) {
        return null;
    }

    // Check global max redemptions
    if (
        couponCode.maxRedemptions !== null &&
        couponCode.maxRedemptions !== undefined &&
        couponCode._count.redemptions >= couponCode.maxRedemptions
    ) {
        return null;
    }

    // Check if this user has already redeemed this coupon
    const existingRedemption = await prisma.couponRedemption.findUnique({
        where: {
            redeemedUserId: userId,
        },
    });

    if (existingRedemption) {
        return null;
    }

    return couponCode;
}