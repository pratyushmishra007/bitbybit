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
      // NEW: Academic system fields
      registrationId?: string;
      batchId?: string;
      programId?: string;
      departmentId?: string;
      enrollmentNumber?: string;
      currentSemester?: number;
      division?: string;
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
    // NEW: Academic system fields
    registrationId?: string;
    batchId?: string;
    programId?: string;
    departmentId?: string;
    enrollmentNumber?: string;
    currentSemester?: number;
    division?: string;
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
    // NEW: Academic system fields
    registrationId?: string;
    batchId?: string;
    programId?: string;
    departmentId?: string;
    enrollmentNumber?: string;
    currentSemester?: number;
    division?: string;
  }
}
