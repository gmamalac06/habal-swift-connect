import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    try {
      // Try to read roles directly (works when RLS allows it)
      const { data, error, count } = await supabase
        .from("user_roles")
        .select("role", { count: 'exact' })
        .eq("user_id", userId);

      if (!error && data) {
        setRoles((data ?? []).map((r: any) => r.role));
        return;
      }

      if (error) {
        console.warn('useSession.fetchRoles: direct select failed, attempting RPC fallbacks', error);
        // Fall back to calling has_role RPC for common roles so we can still detect admin/driver
        try {
          const { data: isAdminResp, error: adminErr } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
          const { data: isDriverResp, error: driverErr } = await supabase.rpc('has_role', { _user_id: userId, _role: 'driver' });

          const fallbackRoles: string[] = [];
          if (adminErr) console.warn('useSession.fetchRoles: has_role(admin) RPC error', adminErr);
          if (driverErr) console.warn('useSession.fetchRoles: has_role(driver) RPC error', driverErr);

          if (isAdminResp === true) fallbackRoles.push('admin');
          if (isDriverResp === true) fallbackRoles.push('driver');

          setRoles(fallbackRoles);
          return;
        } catch (rpcErr) {
          console.error('useSession.fetchRoles RPC fallback failed:', rpcErr);
          setRoles([]);
          return;
        }
      }
    } catch (err) {
      console.error('useSession.fetchRoles unexpected error:', err);
      setRoles([]);
    }
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer fetching roles to avoid deadlocks
        setTimeout(() => {
          fetchRoles(sess.user.id);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isDriver = roles.includes("driver");

  return { session, user, roles, isAdmin, isDriver, loading };
}
