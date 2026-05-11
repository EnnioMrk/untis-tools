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

const updateReferralCodeSchema = z.object({
    codeId: z.string().min(1),
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

export async function updateReferralCode(formData: FormData) {
    const adminUserId = await requireAdminUserId();
    const parsed = updateReferralCodeSchema.safeParse({
        codeId: formData.get("codeId") || undefined,
        label: formData.get("label") || undefined,
        maxRedemptions: formData.get("maxRedemptions") || undefined,
    });

    if (!parsed.success) {
        throw new Error(
            parsed.error.errors[0]?.message || "Invalid referral code payload",
        );
    }

    const { codeId, label, maxRedemptions } = parsed.data;

    // Verify the referral code exists and was created by an admin
    const existingCode = await prisma.referralCode.findFirst({
        where: {
            id: codeId,
            createdByAdminId: adminUserId,
        },
        select: { id: true, code: true },
    });

    if (!existingCode) {
        throw new Error("Referral code not found or you don't have permission to update it");
    }

    // Build the update data — only include fields that were provided
    const updateData: Record<string, unknown> = {};

    if (label !== undefined) {
        updateData.label = label;
    }

    if (maxRedemptions !== undefined) {
        updateData.maxRedemptions = maxRedemptions;
    }

    if (Object.keys(updateData).length === 0) {
        throw new Error("No fields to update");
    }

    await prisma.referralCode.update({
        where: { id: codeId },
        data: updateData,
    });

    revalidatePath("/admin");
}

export async function deleteReferralCode(formData: FormData) {
    const adminUserId = await requireAdminUserId();

    const id = String(formData.get("id") || "");

    if (!id) {
        throw new Error("Missing referral code id");
    }

    await prisma.referralCode.deleteMany({
        where: {
            id,
            createdByAdminId: adminUserId,
        },
    });

    revalidatePath("/admin");
}

export async function deleteCouponCode(formData: FormData) {
    const adminUserId = await requireAdminUserId();

    const id = String(formData.get("id") || "");

    if (!id) {
        throw new Error("Missing coupon code id");
    }

    await prisma.couponCode.deleteMany({
        where: {
            id,
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
    const months = Number(formData.get("months") || "1");

    if (!userId) {
        throw new Error("Missing user id");
    }

    if (plan !== "BASIC" && months > 0) {
        const { createAdminGrant } = await import("@/lib/access-engine");
        await createAdminGrant({
            userId,
            plan: plan as "BASIC" | "STANDARD" | "PREMIUM",
            months,
        });

        // Also update the user's planSource to reflect the admin grant
        await prisma.user.update({
            where: { id: userId },
            data: {
                plan: plan as "BASIC" | "STANDARD" | "PREMIUM",
                planSource: "BONUS",
            },
        });
    }

    revalidatePath("/admin");
}

export async function cancelAccessGrant(formData: FormData) {
    await requireAdminUserId();

    const grantId = String(formData.get("grantId") || "");

    if (!grantId) {
        throw new Error("Missing grant id");
    }

    await prisma.accessGrant.delete({
        where: { id: grantId },
    });

    revalidatePath("/admin");
}

export async function simulateNextDay(formData: FormData) {
    await requireAdminUserId();

    const days = Number(formData.get("days") || "1");
    const msPerDay = 24 * 60 * 60 * 1000;
    const offsetMs = days * msPerDay;

    const grants = await prisma.accessGrant.findMany({
        where: {
            status: { in: ["ACTIVE", "PENDING"] },
            expiresAt: { not: null },
        },
        select: { id: true, expiresAt: true },
    });

    const now = new Date();
    let updated = 0;

    for (const grant of grants) {
        if (grant.expiresAt && grant.expiresAt > now) {
            const newExpiry = new Date(grant.expiresAt.getTime() - offsetMs);
            if (newExpiry > now) {
                await prisma.accessGrant.update({
                    where: { id: grant.id },
                    data: { expiresAt: newExpiry },
                });
                updated++;
            }
        }
    }

    console.log(`Simulated -${days} day(s): updated ${updated} grants`);
    revalidatePath("/admin");
}
