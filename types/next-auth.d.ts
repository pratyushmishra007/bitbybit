import { User as NextAuthUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      xp?: number;
      level?: number;
      streakDays?: number;
      role?: string;
      organizationId?: string;
      studentId?: string;
      accountStatus?: string;
    };
  }

  interface User extends NextAuthUser {
    xp?: number;
    level?: number;
    streakDays?: number;
    role?: string;
    organizationId?: string;
    studentId?: string;
    accountStatus?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    xp?: number;
    level?: number;
    streakDays?: number;
    role?: string;
    organizationId?: string;
    studentId?: string;
    accountStatus?: string;
  }
}
