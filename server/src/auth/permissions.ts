import type { UserRole } from '../../../shared/types';

export const permissions: Record<UserRole, readonly string[]> = {
  SUPER_ADMIN: [
    'class:update-name',
    'class:update-score',
    'students:seed-score',
    'users:create:any',
    'users:delete:any',
    'students:create',
    'students:update',
    'students:delete',
    'rules:manage',
    'scores:change',
    'scores:revoke',
    'data:reset',
    'settings:system',
    'logs:read',
    'logs:rollback',
    'logs:delete',
  ],
  TEACHER: [
    'class:update-name',
    'students:seed-score',
    'users:create:officer',
    'users:delete:officer',
    'students:create',
    'students:update',
    'students:delete',
    'rules:manage',
    'scores:change',
    'scores:revoke',
    'data:reset',
    'logs:read',
    'logs:rollback',
  ],
  OFFICER: [
    'students:seed-score',
    'users:create:officer',
    'students:create',
    'students:update',
    'rules:manage',
    'scores:change',
  ],
};

export function hasPermission(role: UserRole, permission: string) {
  return permissions[role].includes(permission);
}

