import type { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { GithubProfile } from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const options: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GitHubProvider({
            profile(profile: GithubProfile) {
                //console.log(profile)
                return {
                    ...profile,
                    role: profile.role ?? "user",
                    id: profile.id.toString(),
                    image: profile.avatar_url,
                }
            },
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: {
                    label: "Username:",
                    type: "text",
                    placeholder: "your username"
                },
                password: {
                    label: "Password:",
                    type: "password",
                    placeholder: "your password"
                }
            },
            async authorize(credentials) {
                // This is where you need to retrieve user data 
                // to verify with credentials
                // Docs: https://next-auth.js.org/configuration/providers/credentials
                const user = { id: "999999", name: "Aun", password: "1234", role: "admin" }
                if (credentials?.username === user.name && credentials?.password === user.password) {
                    return user
                } else {
                    return null
                }
            }
        })
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
};