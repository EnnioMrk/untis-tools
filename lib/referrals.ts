import { prisma } from "@/lib/prisma";

export function normalizeCode(value: string | null | undefined): string {
    return (value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "");
}

function buildRandomCode(prefix: string): string {
    return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function generateUniqueReferralCode(
    prefix: string = "REF",
): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = buildRandomCode(prefix);
        const existing = await prisma.referralCode.findUnique({
            where: { code: candidate },
            select: { id: true },
        });

        if (!existing) {
            return candidate;
        }
    }

    throw new Error("Failed to generate a unique referral code");
}

export async function findAvailableReferralCode(rawCode: string) {
    const code = normalizeCode(rawCode);

    if (!code) {
        return null;
    }

    const referralCode = await prisma.referralCode.findUnique({
        where: { code },
        include: {
            _count: {
                select: {
                    redemptions: true,
                },
            },
        },
    });

    if (!referralCode || !referralCode.isActive) {
        return null;
    }

    if (
        referralCode.maxRedemptions !== null &&
        referralCode.maxRedemptions !== undefined &&
        referralCode._count.redemptions >= referralCode.maxRedemptions
    ) {
        return null;
    }

    return referralCode;
}

export async function grantReferralRewardForSubscriber(
    userId: string,
): Promise<void> {
    const redemption = await prisma.referralRedemption.findUnique({
        where: { referredUserId: userId },
        select: {
            id: true,
            rewardGrantedAt: true,
            code: {
                select: {
                    ownerUserId: true,
                },
            },
        },
    });

    if (!redemption || redemption.rewardGrantedAt) {
        return;
    }

    await prisma.$transaction(async (tx) => {
        const currentRedemption = await tx.referralRedemption.findUnique({
            where: { referredUserId: userId },
            select: {
                id: true,
                rewardGrantedAt: true,
                code: {
                    select: {
                        ownerUserId: true,
                    },
                },
            },
        });

        if (!currentRedemption || currentRedemption.rewardGrantedAt) {
            return;
        }

        await tx.referralRedemption.update({
            where: { referredUserId: userId },
            data: {
                rewardGrantedAt: new Date(),
            },
        });

        if (currentRedemption.code.ownerUserId) {
            await tx.user.update({
                where: { id: currentRedemption.code.ownerUserId },
                data: {
                    referralBonusMonths: {
                        increment: 1,
                    },
                },
            });
        }
    });
}
