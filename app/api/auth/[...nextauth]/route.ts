import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    async signIn({ user, account, profile, credentials }: any) {
      try {
        // Check if user exists in our database by email
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id, email, account_status")
          .eq("email", user.email)
          .single();

        // Determine if this is signup or login based on OAuth provider
        const isOAuthProvider = account?.provider === 'google' || account?.provider === 'github';
        
        if (!existingUser) {
          // NEW USER - Create in public.users
          if (isOAuthProvider) {
            // Generate a proper UUID for the new user
            const newUserId = crypto.randomUUID();
            
            const { error } = await supabaseAdmin.from("users").insert({
              id: newUserId,
              email: user.email,
              name: user.name || user.email?.split('@')[0] || 'User',
              avatar: user.image,
              avatar_url: user.image,
              role: "student",
              account_status: 'approved',
              xp: 0,
              level: 1,
              streak_days: 0,
              created_at: new Date().toISOString(),
              joined_at: new Date().toISOString(),
            });

            if (error) {
              console.error("❌ Error creating user:", error);
              // If it's a duplicate key error, user might exist, continue anyway
              if (!error.message?.includes('duplicate')) {
                return false;
              }
            } else {
              console.log(`✅ Created new user via ${account.provider}: ${user.email} with ID: ${newUserId}`);
              // Update the user object with our generated ID so session callback can use it
              user.id = newUserId;
            }
            return true;
          }
          // Credentials provider handles user creation in authorize function
          return true;
        } else {
          // EXISTING USER - Update user.id to match database and check status
          console.log(`📝 Found existing user: ${user.email} with ID: ${existingUser.id}`);
          user.id = existingUser.id; // Use the ID from database
          
          if (existingUser.account_status === 'pending') {
            console.log(`⏳ Signin blocked for ${user.email}: Account pending approval`);
            return '/auth/pending-approval';
          } else if (existingUser.account_status === 'rejected') {
            console.log(`⛔ Signin blocked for ${user.email}: Account rejected`);
            return '/auth/signin?error=AccountRejected';
          } else if (existingUser.account_status === 'suspended') {
            console.log(`⛔ Signin blocked for ${user.email}: Account suspended`);
            return '/auth/signin?error=AccountSuspended';
          }
          
          console.log(`✅ Existing user signed in: ${user.email}`);
          return true;
        }
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub;
        
        console.log('🔐 Session callback - token.sub:', token.sub);
        console.log('🔐 Session callback - user email:', session.user.email);

        // Fetch user data from database (use supabaseAdmin to bypass RLS)
        try {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("xp, level, streak_days, role, organization_id, student_id, account_status, department_id")
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
            session.user.departmentId = userData.department_id;

            // Fetch student registration data for academic students
            if (userData.role === 'student' && userData.organization_id) {
              const { data: registration } = await supabaseAdmin
                .from("student_registrations")
                .select(`
                  id,
                  batch_id,
                  division,
                  enrollment_number,
                  current_semester,
                  batch:student_batches(
                    id,
                    program_id,
                    department_id
                  )
                `)
                .eq("user_id", token.sub)
                .single();

              if (registration) {
                session.user.registrationId = registration.id;
                session.user.batchId = registration.batch_id;
                session.user.division = registration.division;
                session.user.enrollmentNumber = registration.enrollment_number;
                session.user.currentSemester = registration.current_semester;
                if (registration.batch) {
                  session.user.programId = (registration.batch as any).program_id;
                  session.user.departmentId = (registration.batch as any).department_id;
                }
              }
            }
          } else {
            console.log('⚠️ No user found by ID, trying email lookup...');
            // If no user data found, try fetching by email (use supabaseAdmin to bypass RLS)
            const { data: userByEmail } = await supabaseAdmin
              .from("users")
              .select("id, xp, level, streak_days, role, organization_id, student_id, account_status, department_id")
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
              session.user.departmentId = userByEmail.department_id;

              // Fetch student registration for email-found user
              if (userByEmail.role === 'student' && userByEmail.organization_id) {
                const { data: registration } = await supabaseAdmin
                  .from("student_registrations")
                  .select(`
                    id,
                    batch_id,
                    division,
                    enrollment_number,
                    current_semester,
                    batch:student_batches(
                      id,
                      program_id,
                      department_id
                    )
                  `)
                  .eq("user_id", userByEmail.id)
                  .single();

                if (registration) {
                  session.user.registrationId = registration.id;
                  session.user.batchId = registration.batch_id;
                  session.user.division = registration.division;
                  session.user.enrollmentNumber = registration.enrollment_number;
                  session.user.currentSemester = registration.current_semester;
                  if (registration.batch) {
                    session.user.programId = (registration.batch as any).program_id;
                    session.user.departmentId = (registration.batch as any).department_id;
                  }
                }
              }
            } else {
              // User doesn't exist at all - auto-create them
              console.log('🆕 User not found anywhere, auto-creating:', session.user.email);
              const { error: createError } = await supabaseAdmin.from("users").insert({
                id: token.sub,
                email: session.user.email,
                name: session.user.name || session.user.email?.split('@')[0] || 'User',
                avatar: session.user.image,
                avatar_url: session.user.image,
                role: "admin", // Give admin role for existing sessions
                account_status: 'approved',
                xp: 0,
                level: 1,
                streak_days: 0,
                created_at: new Date().toISOString(),
                joined_at: new Date().toISOString(),
              });

              if (createError) {
                console.error('❌ Failed to auto-create user:', createError);
              } else {
                console.log('✅ Auto-created user:', session.user.email);
                session.user.xp = 0;
                session.user.level = 1;
                session.user.streakDays = 0;
                session.user.role = "admin";
                session.user.accountStatus = "approved";
              }
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
