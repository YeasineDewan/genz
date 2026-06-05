// Email delivery is now handled by Lovable Cloud / Supabase Auth.
// Client-side SMTP/webhook credential storage has been removed for security:
// browsers shouldn't hold SMTP passwords, and any password reset email is sent
// from the server.
//
// This stub remains only so older imports compile during the migration window.
// It is safe to delete every reference to this file.
export const EMAIL_CONFIG_REMOVED = true;
