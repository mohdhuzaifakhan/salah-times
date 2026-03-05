const rawSuperAdminEmail =
  process.env.EXPO_PUBLIC_SUPER_ADMIN_EMAIL ||
  "mohdhuzaifa8126195456@gmail.com";

export const SUPER_ADMIN_EMAIL = rawSuperAdminEmail.trim().toLowerCase();

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
