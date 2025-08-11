import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { cleanupAuthState } from "@/utils/authCleanup";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const { session, isAdmin, isDriver, loading } = useSession();
  const location = useLocation();

  const signOut = async () => {
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' as any }); } catch {}
    } finally {
      window.location.href = "/auth";
    }
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
