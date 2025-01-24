import type { NextAuthOptions, Account } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { GithubProfile } from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { Profile } from "next-auth";

interface ExtendedProfile extends Profile {
    picture?: string; // Include the picture field as optional
}
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
    async signIn({ account, profile }: { account: Account | null; profile?: ExtendedProfile }) {
        if (account?.provider === "google") {
            if (profile?.email?.endsWith("@kmitl.ac.th")) {
                const user = await prisma.user.findUnique({
                    where: { email: profile.email },
                });

                const defaultImage = "https://example.com/default-avatar.png";

                if (user) {
                    if (!user.image && profile.picture) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { image: profile.picture },
                        });
                    }
                } else {
                    const newUser = await prisma.user.create({
                        data: {
                            name: profile.name ?? "Unknown",
                            email: profile.email,
                            image: profile.picture ?? defaultImage,
                            accounts: {
                                create: {
                                    type: account.type,
                                    provider: account.provider,
                                    providerAccountId: account.providerAccountId,
                                    refresh_token: account.refresh_token,
                                    access_token: account.access_token,
                                    expires_at: account.expires_at,
                                    token_type: account.token_type,
                                    scope: account.scope,
                                    id_token: account.id_token,
                                    session_state: account.session_state,
                                },
                            },
                        },
                    });

                    await prisma.invigilator.create({
                        data: {
                            name: profile.name ?? "Unknown",
                            positionType: "INTERNAL",
                            user: { // Use the 'user' relation
                                connect: { id: newUser.id }, // Connect to the existing User
                            }
                        }
                    });
                }

                return true;
            }

            return false; // Deny login for non-KMITL emails
        }

        return true; // Allow other providers
    },
},
   
    pages: {
        signIn: '/auth/login', // Customize the sign-in page
        error: '/auth/error', // Redirect to a custom error page
    },
         
    secret: process.env.NEXTAUTH_SECRET,
};
