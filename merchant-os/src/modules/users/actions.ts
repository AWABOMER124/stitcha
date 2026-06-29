'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as usersService from './services/users.service';
import { createUserSchema, inviteUserSchema } from './schemas/users.schemas';
import type { ActionResult } from '@/lib/types';
import type { User } from '@prisma/client';

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
