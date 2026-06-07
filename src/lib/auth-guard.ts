import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUser } from "@/lib/store";
import { toast } from "sonner";

/**
 * Role-based route protection.
 *  - { admin: true }  → only admins, non-admins redirected home
 *  - { customer: true } → admins are bounced to /admin
 *  Supabase manages session expiry; we only react to identity changes.
 */
export function useRequireAuth(opts: { admin?: boolean; customer?: boolean; redirectTo?: string } = {}) {
  const { admin = false, redirectTo } = opts;
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate({
        to: admin ? "/admin/login" as any : "/login",
        search: redirectTo ? { redirect: redirectTo } as any : undefined,
      });
      return;
    }
    if (admin && !user.isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/" });
      return;
    }
    if (!admin && user.isAdmin && opts.customer) {
      navigate({ to: "/admin" });
      return;
    }
  }, [user, admin, redirectTo, navigate, opts.customer]);

  return user;
}

