import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { logActivity } from "@/app/lib/activity-logger";

const prisma = new PrismaClient();

export const options: NextAuthOptions = {
  // 1) Connect NextAuth to Prisma via the official adapter
  adapter: PrismaAdapter(prisma),

  // 2) Define your Auth Providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        url: "https://accounts.google.com/o/oauth2/auth",
        params: { prompt: "consent", access_type: "offline", response_type: "code" }
      }
    })
  ],

  // 3) NextAuth callbacks
  callbacks: {
    /**
     * signIn: Control if a user is allowed to sign in.
     * Here, we only allow Google sign-ins with a "@kmitl.ac.th" domain.
     */
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") {
        // Check if the user’s email ends with "@kmitl.ac.th"
        if (profile?.email?.endsWith("@kmitl.ac.th")) {
          await logActivity('LOGIN', `User ${user.email} signed in`);
          return true; // Allow sign-in
        }
        // ส่งต่อ error ที่ระบุว่าเป็น domain error
        throw new Error('domain');
      }
      // For other providers, allow sign-in by default
      await logActivity('LOGIN', `User ${user.email} signed in`);
      return true;
    },

    /**
     * redirect: Where to redirect the user after successful login.
     */
    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },

    /**
     * session: Runs whenever a session is checked/created.
     * We attach user.id and user.role to the session object.
     */
    async session({ session, user }) {
      if (session?.user) {
        const invigilator = await prisma.invigilator.findFirst({
          where: { 
            userId: user.id,
            type: 'อาจารย์'
          },
          include: {
            professor: true // เพิ่ม include professor
          }
        });

        console.log('Session debug:', {
          userId: user.id,
          invigilatorId: invigilator?.id,
          professorId: invigilator?.professor?.id,
          type: invigilator?.type
        });

        // Type-safe assignments
        session.user = {
          ...session.user,
          id: user.id,
          role: user.role,
          quota: invigilator?.quota ?? 0,
          maxQuota: invigilator?.quota ?? 0,
          assignedQuota: invigilator?.assignedQuota ?? 0,
          professorId: invigilator?.professor?.id // ตรวจสอบว่าได้ assign ค่านี้ถูกต้อง
        };
      }
      return session;
    },

    /**
     * error: เรียกเมื่อเกิด error ระหว่างการ sign in
     */
    async error({ error, token, account, profile }) {
      // Log errors for debugging
      console.error('Auth error:', { error, token, account, profile });
      
      // ส่ง custom error message
      if (error === 'AccessDenied') {
        return '/login?error=domain';
      }
      return '/login?error=default';
    },
  },

  // 4) NextAuth events
  events: {
    /**
     * createUser: Triggered *once* when a new User record is first created in your DB.
     * Perfect for automatically creating an Invigilator record linked to the user.
     */
    async createUser({ user }) {
      if (user.email?.endsWith("@kmitl.ac.th")) {
        // Get or create default department
        let defaultDepartment = await prisma.department.findFirst({
          where: { code: "00" }
        });

        if (!defaultDepartment) {
          defaultDepartment = await prisma.department.create({
            data: {
              name: "ส่วนกลาง",
              code: "00"
            }
          });
        }

        const existingInvigilator = await prisma.invigilator.findUnique({
          where: { userId: user.id }
        });

        if (!existingInvigilator && defaultDepartment) {
          await prisma.invigilator.create({
            data: {
              name: user.name ?? "Unknown",
              type: "บุคลากร",
              userId: user.id,
              departmentId: defaultDepartment.id,
              quota: 4,
              assignedQuota: 0
            }
          });
        }
      }
    },
  },

  // 5) Make sure you set a secret for NextAuth
  secret: process.env.NEXTAUTH_SECRET,

  // เพิ่ม debug mode เพื่อดูรายละเอียดเพิ่มเติม
  debug: process.env.NODE_ENV === "development",
};