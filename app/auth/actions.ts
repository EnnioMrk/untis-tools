"use server";

import { signIn, signOut } from "@/lib/auth";
import { findAvailableReferralCode, normalizeCode } from "@/lib/referrals";
import { findAvailableCouponCode } from "@/lib/coupon";
import { prisma } from "@/lib/prisma";
import { addMonths } from "@/lib/subscription";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

const signupSchema = z.object({
    email: z.string().email("Ungültige E-Mail-Adresse"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
    name: z.string().optional(),
    promoCode: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email("Ungültige E-Mail-Adresse"),
    password: z.string().min(1, "Passwort ist erforderlich"),
});

export async function signupAction(
    formData: FormData,
): Promise<{ success: boolean; error?: string }> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string | null;
    const promoCodeInput = formData.get("promoCode") as string | null;
    const normalizedPromoCode = normalizeCode(promoCodeInput);

    const validation = signupSchema.safeParse({
        email,
        password,
        name,
        promoCode: normalizedPromoCode || undefined,
    });

    if (!validation.success) {
        return { success: false, error: validation.error.errors[0]?.message };
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return { success: false, error: "E-Mail wird bereits verwendet" };
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const now = new Date();

        // 1. Try to find a referral code
        const referralCode = normalizedPromoCode
            ? await findAvailableReferralCode(normalizedPromoCode)
            : null;

        await prisma.$transaction(async (tx) => {
            // Create the user
            const createdUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || null,
                    plan: "BASIC",
                    planSource: "NONE",
                },
            });

            // 2. Try to find a coupon code
            const availableCoupon = normalizedPromoCode
                ? await findAvailableCouponCode(normalizedPromoCode, "")
                : null;

            if (referralCode) {
                // Create referral redemption
                await tx.referralRedemption.create({
                    data: {
                        codeId: referralCode.id,
                        referredUserId: createdUser.id,
                    },
                });

                // Create ACTIVE TRIAL grant (12 months for referral signups)
                await tx.accessGrant.create({
                    data: {
                        userId: createdUser.id,
                        type: "TRIAL",
                        status: "ACTIVE",
                        plan: "PREMIUM",
                        months: 12,
                        activatedAt: now,
                        expiresAt: addMonths(now, 12),
                    },
                });
            } else if (availableCoupon && availableCoupon.freeMonths > 0) {
                // Create coupon redemption
                await tx.couponRedemption.create({
                    data: {
                        couponId: availableCoupon.id,
                        redeemedUserId: createdUser.id,
                    },
                });

                // Create ACTIVE COUPON grant
                await tx.accessGrant.create({
                    data: {
                        userId: createdUser.id,
                        type: "COUPON",
                        status: "ACTIVE",
                        plan: "PREMIUM",
                        months: availableCoupon.freeMonths,
                        activatedAt: now,
                        expiresAt: addMonths(now, availableCoupon.freeMonths),
                    },
                });
            }

            if (normalizedPromoCode && !referralCode && !availableCoupon) {
                throw new Error("Code ist ungültig oder abgelaufen");
            }
        });

        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        return { success: true };
    } catch (error) {
        console.error("Signup error:", error);
        return { success: false, error: "Ein Fehler ist aufgetreten" };
    }
}

export async function loginAction(
    formData: FormData,
): Promise<{ success: boolean; error?: string }> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const validation = loginSchema.safeParse({ email, password });

    if (!validation.success) {
        return { success: false, error: validation.error.errors[0]?.message };
    }

    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { success: false, error: "Ungültige Anmeldedaten" };
                default:
                    return {
                        success: false,
                        error: "Ein Fehler ist aufgetreten",
                    };
            }
        }
        throw error;
    }
}

export async function logoutAction(): Promise<void> {
    await signOut({ redirectTo: "/auth/signin" });
}
