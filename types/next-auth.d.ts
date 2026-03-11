import { Plan, PlanSource } from "@prisma/client";

declare module "next-auth" {
    interface User {
        id: string;
        plan: Plan;
        planSource: PlanSource;
        isAdmin: boolean;
        hasActiveAccess?: boolean;
    }

    interface Session {
        user: User;
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id: string;
        plan: Plan;
        planSource: PlanSource;
        isAdmin: boolean;
    }
}
