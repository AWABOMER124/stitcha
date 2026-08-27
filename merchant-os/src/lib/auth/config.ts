import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import type { UserRole } from '@prisma/client';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { ROLE_PERMISSIONS } from '@/lib/permissions/constants';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // The field is still named "email" for the credentials provider
        // (kept the key stable for the one existing caller), but accepts
        // either an email address or a phone number as the login identifier.
        const identifier = (credentials.email as string).trim();
        const password = credentials.password as string;

        // Two independent limits: coarse per-IP (catches credential-stuffing
        // across many accounts from one source) and per-identifier (catches
        // targeted brute-force against one account regardless of IP rotation).
        enforceRateLimit(`login-ip:${getClientIp(request)}`, 20, 15 * 60_000);
        enforceRateLimit(`login-id:${identifier.toLowerCase()}`, 8, 15 * 60_000);

        const user = await prisma.user.findFirst({
          where: { OR: [{ email: { equals: identifier, mode: 'insensitive' } }, { phone: identifier }] },
          include: {
            merchantUsers: {
              where: { isActive: true },
              include: {
                merchant: { select: { id: true, slug: true } },
                assignedRole: { include: { permissions: { include: { permission: true } } } },
              },
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
        const effectiveRole = user.role === 'PLATFORM_OWNER'
          ? user.role
          : merchantUser?.role ?? distributorUser?.role ?? user.role;
        const customPermissions = merchantUser?.assignedRole?.permissions.map((entry) => entry.permission.name) ?? [];
        const permissions = customPermissions.length > 0
          ? customPermissions
          : [...(ROLE_PERMISSIONS[effectiveRole] ?? [])];

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: effectiveRole,
          permissions,
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
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
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
      session.user.permissions = token.permissions ?? [];
      return session;
    },
  },
});
