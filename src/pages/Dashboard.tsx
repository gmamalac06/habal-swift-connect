import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { session, isAdmin, isDriver, loading, user } = useSession();
  const navigate = useNavigate();
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !session) navigate("/auth");
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rides")
      .select("*")
      .eq("rider_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRides(data ?? []));
  }, [user]);

  const recent = useMemo(() => rides.slice(0, 5), [rides]);

  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome back! What would you like to do today?</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-medium">Book a Ride</h2>
          <p className="mt-1 text-sm text-muted-foreground">Plan your next trip now.</p>
          <Link to="/book"><Button className="mt-4">Book</Button></Link>
        </div>
        {isDriver && (
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-medium">Driver Panel</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage availability and rides.</p>
            <Link to="/driver"><Button className="mt-4">Open</Button></Link>
          </div>
        )}
        {isAdmin && (
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-medium">Admin Panel</h2>
            <p className="mt-1 text-sm text-muted-foreground">Verify drivers and pricing.</p>
            <Link to="/admin"><Button className="mt-4">Open</Button></Link>
          </div>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-medium">Recent rides</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No rides yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {recent.map((r) => (
              <li key={r.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.pickup_address || 'Pickup'} → {r.dropoff_address || 'Drop-off'}</div>
                    <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString()} • {r.status}</div>
                  </div>
                  {r.estimated_fare && <div className="font-semibold">₱{Number(r.estimated_fare).toFixed(2)}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Dashboard;
