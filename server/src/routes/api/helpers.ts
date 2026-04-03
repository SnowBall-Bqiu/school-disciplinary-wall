export function canManageTargetUser(currentRole: string | undefined, targetRole: string) {
  if (currentRole === 'SUPER_ADMIN') return true;
  if (currentRole === 'TEACHER') return targetRole === 'OFFICER';
  return false;
}
