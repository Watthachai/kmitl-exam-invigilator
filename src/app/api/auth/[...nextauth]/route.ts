import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ account, profile }) {
            if (account?.provider === "google") {
                return profile?.email?.endsWith('@kmitl.ac.th') || false;
            }
            return true;
        },
        async redirect({ baseUrl }: { baseUrl: string }) {
            return `${baseUrl}/dashboard`;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

// ใช้ handler เพื่อจัดการ API และ Export ตาม HTTP Methods
const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;