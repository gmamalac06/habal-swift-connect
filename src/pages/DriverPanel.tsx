import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import LiveMap from "@/components/LiveMap";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { Switch } from "@/components/ui/switch";
import { Label as UILabel } from "@/components/ui/label";

const DriverPanel = () => {
  const { session, user, isDriver, loading } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [driver, setDriver] = useState<any | null>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const { coords: myCoords } = useLiveLocation();
  const [driverOnline, setDriverOnline] = useState<boolean>(false);

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

  useEffect(() => {
    if (!user) return;
    // Show requested rides that are unassigned so the driver can accept them
    supabase
      .from('rides')
      .select('*')
      .is('driver_id', null)
      .eq('status', 'requested')
      .order('created_at', { ascending: false })
      .then(({ data }) => setIncoming(data ?? []));
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

  const acceptRide = async (rideId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('rides')
      .update({ driver_id: user.id, status: 'accepted' })
      .eq('id', rideId)
      .is('driver_id', null)
      .eq('status', 'requested');
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ride accepted' });
      setIncoming((list) => list.filter((r) => r.id !== rideId));
      setRides((list) => list);
    }
  };

  const acceptAssigned = async (rideId: string) => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'accepted' })
      .eq('id', rideId)
      .eq('status', 'assigned');
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ride accepted' });
      setRides((list) => list.map((r) => (r.id === rideId ? { ...r, status: 'accepted' } : r)));
    }
  };

  const rejectAssigned = async (rideId: string) => {
    const { error } = await supabase
      .from('rides')
      .update({ driver_id: null, status: 'requested' })
      .eq('id', rideId)
      .eq('status', 'assigned');
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ride rejected' });
      setRides((list) => list.filter((r) => r.id !== rideId));
      // Optionally refresh incoming list
      supabase
        .from('rides')
        .select('*')
        .is('driver_id', null)
        .eq('status', 'requested')
        .order('created_at', { ascending: false })
        .then(({ data }) => setIncoming(data ?? []));
    }
  };

  const startRide = async (rideId: string) => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'in_progress' })
      .eq('id', rideId)
      .eq('status', 'accepted');
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ride started' });
      setRides((list) => list.map((r) => (r.id === rideId ? { ...r, status: 'in_progress' } : r)));
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
          {/* Pending Approval Banner */}
          {driver?.approval_status === 'pending' && (
            <div className="mb-6 p-4 rounded-lg border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <div className="flex items-center gap-3">
                <div className="text-2xl">⏳</div>
                <div>
                  <h3 className="font-semibold text-orange-800">Application Pending Approval</h3>
                  <p className="text-sm text-orange-700">
                    Your driver application is currently under review. You'll be able to accept rides once approved by an admin.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <section className="mt-6">
            <h2 className="text-xl font-medium">Incoming ride requests</h2>
            {incoming.length === 0 ? (
              <p className="mt-2 text-muted-foreground">No new requests.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {incoming.map((r) => (
                  <li key={r.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.pickup_address || 'Pickup'} → {r.dropoff_address || 'Drop-off'}</div>
                        <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString()} • {r.status}</div>
                      </div>
                      <Button size="sm" onClick={() => acceptRide(r.id)}>Accept</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="mt-6 flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="text-sm text-muted-foreground">Availability</div>
              <div className="text-xl font-semibold">{driver.is_available ? 'Available' : 'Offline'}</div>
              <div className="text-sm text-muted-foreground">
                Status: 
                <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                  driver.approval_status === 'pending' 
                    ? 'bg-orange-100 text-orange-800' 
                    : driver.approval_status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {driver.approval_status === 'pending' ? '⏳ Pending Approval' : 
                   driver.approval_status === 'approved' ? '✅ Approved' : 
                   '❌ Rejected'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="driver-online" checked={driver.is_available} onCheckedChange={async (checked) => {
                  await toggleAvailability();
                }} />
                <UILabel htmlFor="driver-online">{driver.is_available ? 'Online' : 'Offline'}</UILabel>
              </div>
              <Button 
                onClick={toggleAvailability} 
                disabled={driver.approval_status !== 'approved'}
                className={driver.approval_status !== 'approved' ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {driver.approval_status !== 'approved' 
                  ? 'Awaiting Approval' 
                  : (driver.is_available ? 'Go offline' : 'Go available')
                }
              </Button>
            </div>
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
                      <div className="flex items-center gap-2">
                        {r.status === 'assigned' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => rejectAssigned(r.id)}>Reject</Button>
                            <Button size="sm" onClick={() => acceptAssigned(r.id)}>Accept</Button>
                          </>
                        )}
                        {r.status === 'accepted' && (
                          <Button size="sm" onClick={() => startRide(r.id)}>Start ride</Button>
                        )}
                        {r.status === 'in_progress' && (
                          <Button size="sm" onClick={() => completeRide(r.id)}>Complete</Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-medium">Your location</h2>
            <p className="mt-1 text-sm text-muted-foreground">Live map centered on your current position.</p>
            <div className="mt-4">
              <LiveMap center={myCoords} markers={myCoords ? [{ id: 'me', lat: myCoords.lat, lng: myCoords.lng, label: 'You' }] : []} />
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default DriverPanel;
