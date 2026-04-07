"use server";

import { signIn, signOut } from "@/lib/auth";
import { findAvailableReferralCode, normalizeCode } from "@/lib/referrals";
import { prisma } from "@/lib/prisma";
import { addMonths } from "@/lib/subscription";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

function getReferralTrialEndDate() {
    return addMonths(new Date(), 1);
}

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

        // 1. Try to find a referral code
        const referralCode = normalizedPromoCode
            ? await findAvailableReferralCode(normalizedPromoCode)
            : null;

        // 2. Try to find a coupon code
        const couponCode = normalizedPromoCode
            ? await prisma.couponCode.findUnique({
                  where: { code: normalizedPromoCode, isActive: true },
              })
            : null;

        if (normalizedPromoCode && !referralCode && !couponCode) {
            return {
                success: false,
                error: "Code ist ungültig oder abgelaufen",
            };
        }

        await prisma.$transaction(async (tx) => {
            // Determine initial plan and expiration based on referral or coupon
            let initialPlan: "BASIC" | "PREMIUM" = "BASIC";
            let planSource: "NONE" | "TRIAL" | "BONUS" = "NONE";
            let accessEndsAt: Date | null = null;
            let trialEndsAt: Date | null = null;

            if (couponCode && couponCode.freeMonths > 0) {
                initialPlan = "PREMIUM";
                planSource = "BONUS";
                accessEndsAt = addMonths(new Date(), couponCode.freeMonths);
            } else if (referralCode) {
                planSource = "TRIAL";
                trialEndsAt = getReferralTrialEndDate();
            }

            const createdUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || null,
                    plan: initialPlan,
                    planSource,
                    trialEndsAt,
                    accessEndsAt,
                },
            });

            if (referralCode) {
                await tx.referralRedemption.create({
                    data: {
                        codeId: referralCode.id,
                        referredUserId: createdUser.id,
                    },
                });
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
