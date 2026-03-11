"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateUniqueReferralCode, normalizeCode } from "@/lib/referrals";
import { prisma } from "@/lib/prisma";
import { ensureAdminAccess } from "@/lib/subscription";

const referralCodeSchema = z.object({
    code: z.string().optional(),
    label: z.string().max(120).optional(),
    maxRedemptions: z.coerce.number().int().positive().optional(),
});

const couponCodeSchema = z.object({
    code: z.string().optional(),
    description: z.string().max(200).optional(),
    discountPercent: z.coerce.number().int().min(0).max(100).optional(),
    freeMonths: z.coerce.number().int().min(0).max(24).optional(),
});

async function requireAdminUserId() {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    await ensureAdminAccess(session.user.id);

    return session.user.id;
}

export async function createAdminReferralCode(formData: FormData) {
    const adminUserId = await requireAdminUserId();
    const parsed = referralCodeSchema.safeParse({
        code: formData.get("code") || undefined,
        label: formData.get("label") || undefined,
        maxRedemptions: formData.get("maxRedemptions") || undefined,
    });

    if (!parsed.success) {
        throw new Error(
            parsed.error.errors[0]?.message || "Invalid referral code payload",
        );
    }

    const normalizedCode = normalizeCode(parsed.data.code);
    const code = normalizedCode || (await generateUniqueReferralCode("ADMIN"));

    await prisma.referralCode.create({
        data: {
            code,
            label: parsed.data.label || "Admin referral code",
            maxRedemptions: parsed.data.maxRedemptions,
            createdByAdminId: adminUserId,
        },
    });

    revalidatePath("/admin");
}

export async function createCouponCode(formData: FormData) {
    const adminUserId = await requireAdminUserId();
    const parsed = couponCodeSchema.safeParse({
        code: formData.get("code") || undefined,
        description: formData.get("description") || undefined,
        discountPercent: formData.get("discountPercent") || undefined,
        freeMonths: formData.get("freeMonths") || undefined,
    });

    if (!parsed.success) {
        throw new Error(
            parsed.error.errors[0]?.message || "Invalid coupon payload",
        );
    }

    const normalizedCode = normalizeCode(parsed.data.code);
    const code =
        normalizedCode ||
        normalizeCode(`COUPON-${crypto.randomUUID().slice(0, 8)}`);

    await prisma.couponCode.create({
        data: {
            code,
            description: parsed.data.description,
            discountPercent: parsed.data.discountPercent,
            freeMonths: parsed.data.freeMonths || 0,
            createdByAdminId: adminUserId,
        },
    });

    revalidatePath("/admin");
}

export async function toggleUserAdmin(formData: FormData) {
    await requireAdminUserId();

    const userId = String(formData.get("userId") || "");
    const nextValue = String(formData.get("nextValue") || "") === "true";

    if (!userId) {
        throw new Error("Missing user id");
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            isAdmin: nextValue,
        },
    });

    revalidatePath("/admin");
}

export async function updateUserSubscription(formData: FormData) {
    await requireAdminUserId();

    const userId = String(formData.get("userId") || "");
    const plan = String(formData.get("plan") || "BASIC");
    const planSource = String(formData.get("planSource") || "NONE");

    if (!userId) {
        throw new Error("Missing user id");
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            plan: plan as "BASIC" | "STANDARD" | "PREMIUM",
            planSource: planSource as
                | "NONE"
                | "SUBSCRIPTION"
                | "TRIAL"
                | "BONUS",
            trialEndsAt:
                planSource === "TRIAL"
                    ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
                    : null,
            accessEndsAt:
                planSource === "BONUS"
                    ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
                    : null,
        },
    });

    revalidatePath("/admin");
}
