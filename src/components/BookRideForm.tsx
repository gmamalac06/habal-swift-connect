import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import LiveMap from "@/components/LiveMap";

interface Pricing { base_fare: number; per_km: number; surge_multiplier: number; }

type Props = {
  onBooked?: () => void;
};

const BookRideForm = ({ onBooked }: Props) => {
  const { session, user } = useSession();
  const { toast } = useToast();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [datetime, setDatetime] = useState("");
  const [distance, setDistance] = useState<number>(5);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [preferredDriver, setPreferredDriver] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { coords: myCoords } = useLiveLocation();
  const [pickupLatLng, setPickupLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLatLng, setDropoffLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const parseLatLng = (value: string) => {
    const parts = value.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
    return null;
  };

  useEffect(() => {
    supabase
      .from("drivers")
      .select("user_id, is_available")
      .eq("approval_status", "approved")
      .eq("is_available", true)
      .then(({ data }) => setDrivers(data ?? []));
    supabase
      .from("pricing_settings")
      .select("base_fare, per_km, surge_multiplier")
      .maybeSingle?.()
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
    if (!user || !session) return;
    setSubmitting(true);
    try {
      const autoAssignedDriverId = preferredDriver || (drivers.length > 0 ? drivers[0].user_id : null);

      const { error } = await supabase.from("rides").insert({
        rider_id: user.id,
        driver_id: autoAssignedDriverId,
        pickup_address: pickup,
        pickup_lat: pickupLatLng?.lat ?? null,
        pickup_lng: pickupLatLng?.lng ?? null,
        dropoff_address: dropoff,
        dropoff_lat: dropoffLatLng?.lat ?? null,
        dropoff_lng: dropoffLatLng?.lng ?? null,
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
      onBooked?.();
    } catch (err: any) {
      toast({ title: "Failed to book", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pickup">Pickup</Label>
          <Input id="pickup" value={pickup} onChange={e => { const v = e.target.value; setPickup(v); setPickupLatLng(parseLatLng(v)); }} required />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => {
              if (myCoords) {
                setPickup(`${myCoords.lat.toFixed(6)}, ${myCoords.lng.toFixed(6)}`);
                setPickupLatLng({ lat: myCoords.lat, lng: myCoords.lng });
              } else {
                toast({ title: 'Location not available', description: 'Allow location permission to use current location', variant: 'destructive' });
              }
            }}>Use my location</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dropoff">Drop-off</Label>
          <Input id="dropoff" value={dropoff} onChange={e => { const v = e.target.value; setDropoff(v); setDropoffLatLng(parseLatLng(v)); }} required />
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

      <div className="space-y-2">
        <Label>Map preview</Label>
        <LiveMap
          center={pickupLatLng ?? myCoords ?? null}
          markers={[
            ...(pickupLatLng ? [{ id: 'pickup', lat: pickupLatLng.lat, lng: pickupLatLng.lng, label: 'Pickup' }] : []),
            ...(dropoffLatLng ? [{ id: 'dropoff', lat: dropoffLatLng.lat, lng: dropoffLatLng.lng, label: 'Drop-off' }] : []),
          ]}
        />
        <p className="text-xs text-muted-foreground">Tip: You can enter coordinates like "7.2045, 124.2407" for precise locations.</p>
      </div>
    </form>
  );
};

export default BookRideForm;


