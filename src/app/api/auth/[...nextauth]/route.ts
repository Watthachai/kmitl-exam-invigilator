import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string;
            email?: string;
            image?: string;
        };
    }
}

// สร้าง Prisma Client
const prisma = new PrismaClient();

const handler = NextAuth({
    adapter: PrismaAdapter(prisma), // ใช้ Prisma Adapter
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ account, profile }) {
            if (account?.provider === "google") {
                // อนุญาตเฉพาะอีเมลที่ลงท้ายด้วย "@kmitl.ac.th"
                return profile?.email?.endsWith("@kmitl.ac.th") || false;
            }
            return true;
        },
        async redirect({ baseUrl }: { baseUrl: string }) {
            // Redirect หลังจากล็อกอินไปที่ "/dashboard"
            return `${baseUrl}/dashboard`;
        },
        async session({ session, user }) {
            // เพิ่ม user ID ลงใน session object
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET, // ระบุ Secret Key
});

export { handler as GET, handler as POST };
