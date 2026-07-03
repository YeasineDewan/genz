// One-shot demo account provisioning. Idempotent.
// Creates admin@genz.shop (admin role) and customer@genz.shop (customer).
// Safe to call multiple times: returns { created: false } after the first run.
import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "admin@genz.shop";
const ADMIN_PASSWORD = "GenZAdmin!2026";
const CUSTOMER_EMAIL = "customer@genz.shop";
const CUSTOMER_PASSWORD = "GenZCustomer!2026";

export const Route = createFileRoute("/api/public/provision-demo")({
  server: {
    handlers: {
      GET: async () => handle(),
      POST: async () => handle(),
    },
  },
});

async function handle() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ensureUser = async (email: string, password: string, name: string) => {
      // Check via listUsers (small project, fine).
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) return { id: existing.id, created: false };
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name },
      });
      if (error) throw error;
      return { id: data.user!.id, created: true };
    };

    const admin = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, "GenZ Admin");
    const customer = await ensureUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD, "Demo Customer");

    // Ensure profiles exist (trigger normally handles it, but be defensive).
    await supabaseAdmin.from("profiles").upsert(
      [
        { id: admin.id, email: ADMIN_EMAIL, name: "GenZ Admin" },
        { id: customer.id, email: CUSTOMER_EMAIL, name: "Demo Customer" },
      ],
      { onConflict: "id" }
    );

    // Grant admin role.
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: admin.id, role: "admin" },
      { onConflict: "user_id,role" }
    );

    return Response.json({
      ok: true,
      admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, created: admin.created, portal: "/admin/login" },
      customer: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, created: customer.created, portal: "/login" },
    });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
