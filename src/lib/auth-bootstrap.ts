// Hydrates the local user cache from Supabase Auth.
// Subscribes ONCE to onAuthStateChange and updates `KEYS.user` whenever
// the session changes. The rest of the app keeps reading via useUser().
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMeWithRole } from "@/lib/auth.functions";
import { writeCachedUser } from "@/lib/store";

let started = false;

export function useAuthBootstrap() {
  useEffect(() => {
    if (started) return;
    started = true;

    const refresh = async () => {
      try {
        const me = await getMeWithRole();
        writeCachedUser({
          id: me.id,
          email: me.email,
          name: me.name || me.email.split("@")[0],
          isAdmin: me.isAdmin,
        });
      } catch {
        writeCachedUser(null);
      }
    };

    // Initial hydration
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) refresh();
      else writeCachedUser(null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        writeCachedUser(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        refresh();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);
}
