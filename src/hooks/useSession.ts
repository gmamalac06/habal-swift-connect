import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data ?? []).map((r: any) => r.role));
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
