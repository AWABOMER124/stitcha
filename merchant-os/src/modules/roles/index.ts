/**
 * Roles Module — Public API
 */

export {
  getRolesAction,
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  assignPermissionsAction,
} from './actions';

export {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
} from './services/roles.service';

export {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
} from './schemas/roles.schemas';

export type { CreateRoleInput, UpdateRoleInput, AssignPermissionsInput, Role, Permission, RolePermission } from './types';
