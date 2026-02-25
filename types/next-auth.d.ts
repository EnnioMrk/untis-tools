import { Plan } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    plan: Plan;
  }

  interface Session {
    user: User;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    plan: Plan;
  }
}
