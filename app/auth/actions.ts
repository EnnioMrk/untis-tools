"use server";

import { signIn, signOut } from "@/lib/auth";
import { findAvailableReferralCode, normalizeCode } from "@/lib/referrals";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

function getReferralTrialEndDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
}

const signupSchema = z.object({
    email: z.string().email("Ungültige E-Mail-Adresse"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
    name: z.string().optional(),
    referralCode: z.string().optional(),
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
    const referralCodeInput = formData.get("referralCode") as string | null;
    const normalizedReferralCode = normalizeCode(referralCodeInput);

    const validation = signupSchema.safeParse({
        email,
        password,
        name,
        referralCode: normalizedReferralCode || undefined,
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
        const referralCode = normalizedReferralCode
            ? await findAvailableReferralCode(normalizedReferralCode)
            : null;

        if (normalizedReferralCode && !referralCode) {
            return {
                success: false,
                error: "Referral-Code ist ungültig oder abgelaufen",
            };
        }

        await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || null,
                    plan: "BASIC",
                    planSource: referralCode ? "TRIAL" : "NONE",
                    trialEndsAt: referralCode
                        ? getReferralTrialEndDate()
                        : null,
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
