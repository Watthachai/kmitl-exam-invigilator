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
      role?: string; // Add role to Session
    };
  }

  interface User {
    role?: string; // Add role to User
  }
}

const prisma = new PrismaClient();

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Allow only emails ending with "@kmitl.ac.th"
        if (profile?.email?.endsWith("@kmitl.ac.th")) {
          const user = await prisma.user.findUnique({
            where: { email: profile.email },
          });

          if (user) {
            // Check if the user is already linked to an invigilator
            const invigilator = await prisma.invigilator.findUnique({
              where: { userId: user.id },
            });

            if (!invigilator) {
              // Link the user with the invigilator model
              await prisma.invigilator.create({
                data: {
                  name: profile.name ?? "Unknown",
                  userId: user.id,
                  // Add other necessary fields here
                },
              });
            }
          }

          return true;
        }
        return false;
      }
      return true;
    },
    async redirect({ baseUrl }: { baseUrl: string }) {
      return `${baseUrl}/dashboard`;
    },
    async session({ session, user }) {
      // Add user ID and role to the session object
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role; // Include the role from the user object
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };