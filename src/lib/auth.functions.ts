// Server functions for authentication: fetch current user with role,
// and bootstrap the first admin. Roles live in `public.user_roles` and
// are checked server-side — clients cannot fake `isAdmin`.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MeResult {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export const getMeWithRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeResult> => {
    const { supabase, userId, claims } = context;
    // Profile (RLS allows user to read their own row)
    const { data: profile } = await supabase
      .from("profiles")
      .select("email,name")
      .eq("id", userId)
      .maybeSingle();
    // Role (RLS allows user to read their own roles)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return {
      id: userId,
      email: profile?.email ?? (claims.email as string) ?? "",
      name: profile?.name ?? "",
      isAdmin,
    };
  });

// First user to call this becomes admin (only if no admin exists yet).
// Used to bootstrap the very first admin without committing credentials.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ promoted: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("claim_admin_if_none");
    if (error) throw new Error(error.message);
    return { promoted: !!data };
  });
