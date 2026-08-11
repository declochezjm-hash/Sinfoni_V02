export const DEV_DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

export function getDefaultOrganizationId(): string {
  return import.meta.env.VITE_DEFAULT_ORGANIZATION_ID ?? DEV_DEFAULT_ORGANIZATION_ID;
}
