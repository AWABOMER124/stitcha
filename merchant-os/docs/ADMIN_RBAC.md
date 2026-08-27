# Platform administration and RBAC

WASLA separates platform-team permissions from merchant-staff permissions. A platform role never inherits access to a merchant tenant, and merchant invitations reject platform and retired distributor roles.

## Platform roles

| Role | Dashboard | Merchants | Finance and subscription payments | Delivery partners | Platform team | Settings |
| --- | --- | --- | --- | --- | --- | --- |
| `PLATFORM_OWNER` | Full | Manage | Manage | Manage | Manage | Manage |
| `PLATFORM_ADMIN` | Full | Manage | Manage | Manage | No team-role changes | Manage |
| `PLATFORM_OPERATIONS` | Full | Manage | No | Manage | No | No |
| `PLATFORM_FINANCE` | Full | Read | Review and manage | No | No | No |
| `PLATFORM_SUPPORT` | Full | Read only | No | No | No | No |

Navigation is filtered for usability, but every sensitive server action also calls `requirePlatformPermission`; hiding a link is never treated as authorization.

## Merchant roles

At sign-in, WASLA resolves the effective merchant role from `MerchantUser.role`, then loads permissions from the assigned custom role. If no custom role is assigned, the built-in role matrix is used. The legacy global `User.role` is not trusted over an active merchant membership.

Merchant invitation validation accepts merchant roles only. Values such as `PLATFORM_OWNER` and retired distributor roles are rejected before the service is called.

## Safe deployment

Migration `20260827090000_add_platform_staff_roles` adds four PostgreSQL enum values. It is additive and does not remove legacy data. Deploy only after a verified database backup, then confirm `/api/health` reports the expected `APP_RELEASE`.

The retired distributor schema remains temporarily for migration safety, while its registration and portal navigation are disabled. Removal of legacy tables must be handled by a separately reviewed data-retention migration.
