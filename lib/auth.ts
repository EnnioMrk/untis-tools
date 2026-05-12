import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Plan } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { refreshGrants } from "./access-engine";

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/signin",
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.password) {
                    return null;
                }

                const passwordMatch = await bcrypt.compare(
                    password,
                    user.password,
                );

                if (!passwordMatch) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    plan: user.plan,
                    planSource: user.planSource,
                    isAdmin: user.isAdmin,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.plan = user.plan;
                token.planSource = user.planSource;
                token.isAdmin = user.isAdmin;
            }

            if (!token.id && token.sub) {
                token.id = token.sub;
            }

            if (token.id) {
                try {
                    const currentUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            plan: true,
                            planSource: true,
                            isAdmin: true,
                        },
                    });

                    if (currentUser) {
                        token.plan = currentUser.plan;
                        token.planSource = currentUser.planSource;
                        token.isAdmin = currentUser.isAdmin;
                    }

                    // Refresh grants to auto-activate any pending grants
                    await refreshGrants(token.id as string);
                } catch (error) {
                    console.error(
                        "[AUTH] Error in jwt callback for user",
                        token.id,
                        ":",
                        error,
                    );
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = (token.id || token.sub) as string;

                try {
                    // Refresh grants and get current user state
                    const currentUser = await prisma.user.findUnique({
                        where: { id: session.user.id },
                        select: {
                            plan: true,
                            planSource: true,
                            isAdmin: true,
                        },
                    });

                    if (currentUser) {
                        const accessState = await refreshGrants(
                            session.user.id,
                        );

                        session.user.plan = accessState.effectivePlan as Plan;
                        session.user.planSource = currentUser.planSource;
                        session.user.isAdmin = currentUser.isAdmin;
                        session.user.hasActiveAccess = accessState.hasAccess;
                        (session.user as any).accessExpiresAt =
                            accessState.expiresAt ?? null;
                    } else {
                        session.user.plan = (token.plan || "BASIC") as Plan;
                        session.user.planSource = (token.planSource ||
                            "NONE") as typeof session.user.planSource;
                        session.user.isAdmin = Boolean(token.isAdmin);
                        session.user.hasActiveAccess = false;
                    }
                } catch (error) {
                    console.error(
                        "[AUTH] Error in session callback for user",
                    session.user.id,
                    ":",
                    error,
                );
                    // Fallback to token values on error
                    session.user.plan = (token.plan || "BASIC") as Plan;
                    session.user.planSource = (token.planSource ||
                        "NONE") as typeof session.user.planSource;
                    session.user.isAdmin = Boolean(token.isAdmin);
                    session.user.hasActiveAccess = false;
                }
            }
            return session;
        },
    },
});

