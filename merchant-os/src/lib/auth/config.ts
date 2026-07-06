import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import type { UserRole } from '@prisma/client';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // The field is still named "email" for the credentials provider
        // (kept the key stable for the one existing caller), but accepts
        // either an email address or a phone number as the login identifier.
        const identifier = (credentials.email as string).trim();
        const password = credentials.password as string;

        const user = await prisma.user.findFirst({
          where: { OR: [{ email: identifier }, { phone: identifier }] },
          include: {
            merchantUsers: {
              where: { isActive: true },
              include: { merchant: { select: { id: true, slug: true } } },
              take: 1,
            },
            distributorUsers: {
              where: { isActive: true },
              include: { distributor: { select: { id: true, slug: true } } },
              take: 1,
            },
          },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        const merchantUser = user.merchantUsers[0] ?? null;
        const distributorUser = user.distributorUsers[0] ?? null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          merchantId: merchantUser?.merchant.id ?? null,
          merchantSlug: merchantUser?.merchant.slug ?? null,
          distributorId: distributorUser?.distributor.id ?? null,
          distributorSlug: distributorUser?.distributor.slug ?? null,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: UserRole }).role;
        token.merchantId = (user as { merchantId?: string | null }).merchantId ?? null;
        token.merchantSlug = (user as { merchantSlug?: string | null }).merchantSlug ?? null;
        token.distributorId = (user as { distributorId?: string | null }).distributorId ?? null;
        token.distributorSlug = (user as { distributorSlug?: string | null }).distributorSlug ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.merchantId = token.merchantId ?? null;
      session.user.merchantSlug = token.merchantSlug ?? null;
      session.user.distributorId = token.distributorId ?? null;
      session.user.distributorSlug = token.distributorSlug ?? null;
      return session;
    },
  },
});
