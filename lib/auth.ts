import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Account, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import LinkedIn from "next-auth/providers/linkedin";
import { prisma } from "./prisma";

if (!process.env.LINKEDIN_CLIENT_ID) {
  throw new Error("Missing LINKEDIN_CLIENT_ID environment variable");
}

if (!process.env.LINKEDIN_CLIENT_SECRET) {
  throw new Error("Missing LINKEDIN_CLIENT_SECRET environment variable");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email w_member_social",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User; account?: Account | null }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account && user && account.access_token && user.id) {
        // Store LinkedIn-specific data
        await prisma.linkedInAccount.upsert({
          where: { linkedInId: account.providerAccountId },
          create: {
            userId: user.id,
            linkedInId: account.providerAccountId,
            name: user.name ?? "LinkedIn User",
            email: user.email,
            profileUrl: user.image,
            profilePicture: user.image,
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null, // Handle potential undefined expires_at
            scope: account.scope ?? null,
          },
          update: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope ?? null,
            name: user.name ?? undefined,
            profilePicture: user.image,
          },
        });
      }
    },
  },
});

// Export authOptions for backward compatibility with API routes
export const authOptions = {};