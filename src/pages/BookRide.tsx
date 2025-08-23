import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

interface Pricing { base_fare: number; per_km: number; surge_multiplier: number; }

const BookRide = () => {
  const { session, user, loading } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [datetime, setDatetime] = useState("");
  const [distance, setDistance] = useState<number>(5);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [preferredDriver, setPreferredDriver] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate("/auth");
  }, [loading, session, navigate]);

  useEffect(() => {
    supabase
      .from("drivers")
      .select("user_id, is_available")
      .eq("approval_status", "approved")
      .eq("is_available", true)
      .then(({ data }) => setDrivers(data ?? []));
    supabase.from("pricing_settings").select("base_fare, per_km, surge_multiplier").maybeSingle?.()
      .then((res: any) => {
        const d = res?.data ?? res; setPricing(d);
      });
  }, []);

  const estimatedFare = useMemo(() => {
    if (!pricing) return 0;
    return (pricing.base_fare + pricing.per_km * distance) * pricing.surge_multiplier;
  }, [pricing, distance]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      // Basic auto-assign: if no preferred driver, pick the first available driver (if any)
      const autoAssignedDriverId = preferredDriver || (drivers.length > 0 ? drivers[0].user_id : null);

      const { error } = await supabase.from("rides").insert({
        rider_id: user.id,
        driver_id: autoAssignedDriverId,
        pickup_address: pickup,
        dropoff_address: dropoff,
        scheduled_at: datetime ? new Date(datetime).toISOString() : null,
        estimated_distance_km: distance,
        estimated_fare: estimatedFare,
        status: autoAssignedDriverId ? 'assigned' : 'requested',
      });
      if (error) throw error;
      toast({
        title: autoAssignedDriverId ? "Driver assigned" : "Ride requested",
        description: autoAssignedDriverId ? "A driver has been assigned. Awaiting acceptance." : "We sent your request to drivers.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Failed to book", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-2xl py-10">
      <h1 className="text-3xl font-semibold">Book a Ride</h1>
      <p className="mt-1 text-muted-foreground">Set your trip details and see your estimated fare.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pickup">Pickup</Label>
            <Input id="pickup" value={pickup} onChange={e => setPickup(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dropoff">Drop-off</Label>
            <Input id="dropoff" value={dropoff} onChange={e => setDropoff(e.target.value)} required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="datetime">Date & time</Label>
            <Input id="datetime" type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="distance">Estimated distance (km)</Label>
            <Input id="distance" type="number" min={1} step={0.1} value={distance} onChange={e => setDistance(Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Preferred driver (optional)</Label>
          <Select onValueChange={setPreferredDriver}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-match with available drivers" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.user_id} value={d.user_id}>{d.user_id.slice(0, 8)}… {d.is_available ? '• Available' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <div className="text-sm text-muted-foreground">Estimated fare</div>
            <div className="text-2xl font-semibold">₱{estimatedFare.toFixed(2)}</div>
          </div>
          <Button type="submit" disabled={submitting} variant="hero">{submitting ? 'Booking…' : 'Confirm ride'}</Button>
        </div>
      </form>
    </main>
  );
};

export default BookRide;
