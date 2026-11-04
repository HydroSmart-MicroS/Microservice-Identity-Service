export type ProfileType = 'propietario' | 'inquilino';
export const permissions: Record<ProfileType, readonly string[]> = {
  propietario: ['property:manage:own', 'unit:manage:own', 'tenancy:manage:own', 'device:manage:own', 'consumption:read:own', 'goal:manage:own', 'report:read:own'],
  inquilino: ['consumption:read:assigned', 'goal:manage:own', 'report:read:assigned'],
};
export function isProfileType(value: unknown): value is ProfileType {
  return typeof value === 'string' && Object.hasOwn(permissions, value);
}
