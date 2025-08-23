import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { cleanupAuthState } from "@/utils/authCleanup";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

const Navbar = () => {
  const { session, isAdmin, isDriver, loading, user } = useSession();
  const location = useLocation();
  const [online, setOnline] = useState<boolean>(true);

  const signOut = async () => {
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' as any }); } catch {}
    } finally {
      window.location.href = "/auth";
    }
  };

  useEffect(() => {
    if (!user) return;
    // Load initial online flag for rider or driver.
    // For driver, use drivers.is_available; for rider, profiles.rider_online if exists.
    (async () => {
      try {
        if (isDriver) {
          const { data } = await supabase.from('drivers').select('is_available').eq('user_id', user.id).maybeSingle();
          if (data) setOnline(!!data.is_available);
        } else {
          const { data } = await supabase.from('profiles').select('rider_online').eq('id', user.id).maybeSingle();
          if (data && typeof data.rider_online === 'boolean') setOnline(data.rider_online);
        }
      } catch {}
    })();
  }, [user, isDriver]);

  const toggleOnline = async (checked: boolean) => {
    setOnline(checked);
    try {
      if (isDriver) {
        await supabase.from('drivers').update({ is_available: checked }).eq('user_id', user?.id ?? '');
      } else {
        await supabase.from('profiles').upsert({ id: user?.id ?? '', rider_online: checked });
      }
    } catch {}
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight">
          Habal Swift Connect
        </Link>
        <div className="flex items-center gap-2">
          {!loading && (
            <>
              <Link to="/book"><Button variant="ghost">Book</Button></Link>
              {isDriver && <Link to="/driver"><Button variant="ghost">Driver</Button></Link>}
              {isAdmin && <Link to="/admin"><Button variant="ghost">Admin</Button></Link>}
              {session ? (
                <>
                  <div className="hidden items-center gap-2 sm:flex">
                    <Switch id="online" checked={online} onCheckedChange={toggleOnline} />
                    <Label htmlFor="online">{online ? 'Online' : 'Offline'}</Label>
                  </div>
                  <Link to="/profile"><Button variant="ghost">Profile</Button></Link>
                  <Link to="/dashboard"><Button variant="outline">Dashboard</Button></Link>
                  <Button onClick={signOut}>Sign out</Button>
                </>
              ) : (
                location.pathname !== "/auth" && (
                  <Link to="/auth"><Button variant="default">Sign in</Button></Link>
                )
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
