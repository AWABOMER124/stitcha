'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as usersService from './services/users.service';
import { createUserSchema, inviteUserSchema } from './schemas/users.schemas';
import type { ActionResult } from '@/lib/types';
import type { User } from '@prisma/client';

const inviteDistributorUserSchema = inviteUserSchema.extend({ isOwner: z.boolean().optional() });

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/dashboard');
  return session.user.distributorId;
}

// ============================================================================
// Users Module — Server Actions
// ============================================================================

/** List all users for the current merchant */
export async function getUsersAction(): Promise<ActionResult<unknown[]>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'users:read');
    const users = await usersService.getUsers(auth.merchantId);
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get users' };
  }
}

/** Get a single user */
export async function getUserAction(id: string): Promise<ActionResult<User>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'users:read');
    const user = await usersService.getUser(id);
    return { success: true, data: user as unknown as User };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user' };
  }
}

/** Create a new user */
export async function createUserAction(formData: unknown): Promise<ActionResult<User>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'users:create');
    const parsed = createUserSchema.parse(formData);
    const user = await usersService.createUser(parsed);
    return { success: true, data: user as User };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create user' };
  }
}

/** Invite a user to the merchant */
export async function inviteUserAction(formData: unknown): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'users:create');
    const parsed = inviteUserSchema.parse(formData);
    const result = await usersService.inviteUser(auth.merchantId, parsed.email, parsed.role);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to invite user' };
  }
}

/** Update a user's role within the merchant */
export async function updateUserRoleAction(userId: string, newRole: string): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'users:update');
    const result = await usersService.updateUserRole(auth.merchantId, userId, newRole);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update user role' };
  }
}

/** Deactivate a user within the merchant */
export async function deactivateUserAction(userId: string): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'users:delete');
    const result = await usersService.deactivateUser(auth.merchantId, userId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to deactivate user' };
  }
}

// ============================================================================
// Distributor staff — same User model, DistributorUser link instead of MerchantUser
// ============================================================================

/** List all staff users for the current distributor */
export async function getDistributorUsersAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await usersService.getDistributorUsers(distributorId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get users' };
  }
}

/** Invite a user to the distributor's staff */
export async function inviteDistributorUserAction(formData: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = inviteDistributorUserSchema.parse(formData);
    const result = await usersService.inviteDistributorUser(distributorId, parsed.email, parsed.role, parsed.isOwner ?? false);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to invite user' };
  }
}

/** Update a distributor staff member's role */
export async function updateDistributorUserRoleAction(userId: string, newRole: string): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const result = await usersService.updateDistributorUserRole(distributorId, userId, newRole);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update user role' };
  }
}

/** Toggle whether a distributor staff member is an owner */
export async function setDistributorUserOwnerAction(userId: string, isOwner: boolean): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const result = await usersService.setDistributorUserOwner(distributorId, userId, isOwner);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update owner status' };
  }
}

/** Activate or deactivate a distributor staff member */
export async function setDistributorUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const result = await usersService.setDistributorUserActive(distributorId, userId, isActive);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update user status' };
  }
}
