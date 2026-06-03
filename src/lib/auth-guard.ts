import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUser, getSession, signOut } from "@/lib/store";
import { toast } from "sonner";

/**
 * Role-based route protection.
 *  - { admin: true }  → only admins, non-admins redirected home
 *  - { customer: true } (default) → must be signed in; admins are bounced to /admin
 *  - Polls session expiry every 30s and signs the user out when it lapses
 */
export function useRequireAuth(opts: { admin?: boolean; customer?: boolean; redirectTo?: string } = {}) {
  const { admin = false, redirectTo } = opts;
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // Not signed in → bounce to the matching portal
    if (!user) {
      navigate({ to: admin ? "/admin/login" as any : "/login", search: redirectTo ? { redirect: redirectTo } as any : undefined });
      return;
    }
    // Role mismatch
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

  // Session expiry watchdog
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      const s = getSession();
      if (!s) {
        signOut();
        toast.message("Session expired", { description: "Please sign in again." });
        navigate({ to: admin ? "/admin/login" as any : "/login" });
      }
    };
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [user, admin, navigate]);

  return user;
}
