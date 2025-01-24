import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export const options: NextAuthOptions = {
  // 1) Connect NextAuth to Prisma via the official adapter
  adapter: PrismaAdapter(prisma),

  // 2) Define your Auth Providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // 3) NextAuth callbacks
  callbacks: {
    /**
     * signIn: Control if a user is allowed to sign in.
     * Here, we only allow Google sign-ins with a "@kmitl.ac.th" domain.
     */
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Check if the user’s email ends with "@kmitl.ac.th"
        if (profile?.email?.endsWith("@kmitl.ac.th")) {
          return true; // Allow sign-in
        }
        // Otherwise, block sign-in
        return false;
      }
      // For other providers, allow sign-in by default
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
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },

  // 4) NextAuth events
  events: {
    /**
     * createUser: Triggered *once* when a new User record is first created in your DB.
     * Perfect for automatically creating an Invigilator record linked to the user.
     */
    async createUser({ user }) {
      // Only create an Invigilator if the user has a kmitl email (or any condition you choose).
      if (user.email && user.email.endsWith("@kmitl.ac.th")) {
        const existingInvigilator = await prisma.invigilator.findUnique({
          where: { userId: user.id },
        });

        if (!existingInvigilator) {
          await prisma.invigilator.create({
            data: {
              name: user.name ?? "Unknown",
              userId: user.id,
              // Fill in other necessary fields (positionType, etc.)
            },
          });
        }
      }
    },
  },

  // 5) Make sure you set a secret for NextAuth
  secret: process.env.NEXTAUTH_SECRET,
};
