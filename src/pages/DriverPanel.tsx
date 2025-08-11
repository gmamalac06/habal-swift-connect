import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

const DriverPanel = () => {
  const { session, user, isDriver, loading } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [driver, setDriver] = useState<any | null>(null);
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !session) navigate("/auth");
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("drivers").select("*").eq("user_id", user.id).maybeSingle?.()
      .then((res: any) => setDriver(res?.data ?? res ?? null));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rides")
      .select("*")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRides(data ?? []));
  }, [user]);

  const register = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      user_id: user.id,
      vehicle_make: String(form.get('vehicle_make') || ''),
      vehicle_model: String(form.get('vehicle_model') || ''),
      plate_number: String(form.get('plate_number') || ''),
      license_number: String(form.get('license_number') || ''),
    };
    const { data, error } = await supabase.from("drivers").insert(payload).select("*").single();
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Submitted", description: "Await admin approval." });
      setDriver(data);
    }
  };

  const toggleAvailability = async () => {
    if (!driver) return;
    const { data, error } = await supabase.from("drivers").update({ is_available: !driver.is_available }).eq("id", driver.id).select("*").single();
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      setDriver(data);
    }
  };

  const completeRide = async (rideId: string) => {
    const { error } = await supabase.from("rides").update({ status: 'completed' }).eq("id", rideId);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ride completed" });
      setRides((r) => r.map((x) => (x.id === rideId ? { ...x, status: 'completed' } : x)));
    }
  };

  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-semibold">Driver Panel</h1>

      {!driver ? (
        <section className="mt-6 max-w-2xl">
          <h2 className="text-xl font-medium">Apply as driver</h2>
          <p className="mt-1 text-muted-foreground">Provide your vehicle and license details. Admin will verify.</p>
          <form onSubmit={register} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicle_make">Vehicle make</Label>
              <Input id="vehicle_make" name="vehicle_make" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_model">Vehicle model</Label>
              <Input id="vehicle_model" name="vehicle_model" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate_number">Plate number</Label>
              <Input id="plate_number" name="plate_number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">License number</Label>
              <Input id="license_number" name="license_number" required />
            </div>
            <div className="sm:col-span-2"><Button type="submit" variant="hero">Submit</Button></div>
          </form>
        </section>
      ) : (
        <>
          <section className="mt-6 flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="text-sm text-muted-foreground">Availability</div>
              <div className="text-xl font-semibold">{driver.is_available ? 'Available' : 'Offline'}</div>
              <div className="text-sm text-muted-foreground">Status: {driver.approval_status}</div>
            </div>
            <Button onClick={toggleAvailability} disabled={driver.approval_status !== 'approved'}>
              {driver.is_available ? 'Go offline' : 'Go available'}
            </Button>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-medium">Your rides</h2>
            {rides.length === 0 ? (
              <p className="mt-2 text-muted-foreground">No rides assigned yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {rides.map((r) => (
                  <li key={r.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.pickup_address || 'Pickup'} → {r.dropoff_address || 'Drop-off'}</div>
                        <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString()} • {r.status}</div>
                      </div>
                      {r.status !== 'completed' && (
                        <Button size="sm" onClick={() => completeRide(r.id)}>Mark completed</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default DriverPanel;
