import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        });

        if (error || !data.user) {
          return null;
        }

        return {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.name || data.user.email,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      try {
        // Check if user exists in our database
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single();

        if (!existingUser) {
          // Create new user in Supabase with pending status
          const { error } = await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            avatar: user.image,
            role: "student", // Default role for all new users
            account_status: "pending", // Requires approval
            xp: 0,
            level: 1,
            streak_days: 0,
            lessons_completed: 0,
          });

          if (error) {
            console.error("Error creating user:", error);
            // Don't fail signin, just log the error
          }
        } else if (existingUser.account_status === 'pending') {
          // Block signin for pending accounts awaiting approval
          console.log(`⏳ Signin blocked for ${user.email}: Account pending approval`);
          return false;
        } else if (existingUser.account_status === 'rejected' || existingUser.account_status === 'suspended') {
          // Block signin for rejected or suspended accounts
          console.log(`⛔ Signin blocked for ${user.email}: ${existingUser.account_status}`);
          return false;
        }
      } catch (error) {
        console.error("Error in signIn callback:", error);
      }
      return true;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub;
        
        console.log('🔐 Session callback - token.sub:', token.sub);
        console.log('🔐 Session callback - user email:', session.user.email);

        // Fetch user data from database
        try {
          const { data: userData } = await supabase
            .from("users")
            .select("xp, level, streak_days, role, organization_id, student_id, account_status")
            .eq("id", token.sub)
            .single();

          console.log('🔐 User data by ID:', userData);

          if (userData) {
            session.user.xp = userData.xp;
            session.user.level = userData.level;
            session.user.streakDays = userData.streak_days;
            session.user.role = userData.role;
            session.user.organizationId = userData.organization_id;
            session.user.studentId = userData.student_id;
            session.user.accountStatus = userData.account_status;
          } else {
            console.log('⚠️ No user found by ID, trying email lookup...');
            // If no user data found, try fetching by email
            const { data: userByEmail } = await supabase
              .from("users")
              .select("id, xp, level, streak_days, role, organization_id, student_id, account_status")
              .eq("email", session.user.email)
              .single();

            console.log('🔐 User data by email:', userByEmail);

            if (userByEmail) {
              console.log('✅ Found user by email! Updating session.user.id');
              console.log('Old ID:', session.user.id, '→ New ID:', userByEmail.id);
              session.user.id = userByEmail.id;
              session.user.xp = userByEmail.xp;
              session.user.level = userByEmail.level;
              session.user.streakDays = userByEmail.streak_days;
              session.user.role = userByEmail.role;
              session.user.organizationId = userByEmail.organization_id;
              session.user.studentId = userByEmail.student_id;
              session.user.accountStatus = userByEmail.account_status;
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Set defaults if user not found
          session.user.xp = 0;
          session.user.level = 1;
          session.user.streakDays = 0;
          session.user.role = "student";
        }
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt" as const,
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
