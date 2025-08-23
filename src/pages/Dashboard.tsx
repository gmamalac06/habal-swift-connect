import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import LiveMap from "@/components/LiveMap";
import { useLiveLocation } from "@/hooks/useLiveLocation";

interface Pricing { base_fare: number; per_km: number; surge_multiplier: number; }

const Dashboard = () => {
  const { session, isAdmin, isDriver, loading, user } = useSession();
  const navigate = useNavigate();
  const [rides, setRides] = useState<any[]>([]);
  const { coords: myCoords } = useLiveLocation();
  const { toast } = useToast();

  // Booking form state
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [datetime, setDatetime] = useState("");
  const [distance, setDistance] = useState<number>(5);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [preferredDriver, setPreferredDriver] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickupLatLng, setPickupLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLatLng, setDropoffLatLng] = useState<{ lat: number; lng: number } | null>(null);

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

  // Load drivers and pricing
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

  const parseLatLng = (value: string) => {
    const parts = value.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
    return null;
  };

  const estimatedFare = useMemo(() => {
    if (!pricing) return 0;
    return (pricing.base_fare + pricing.per_km * distance) * pricing.surge_multiplier;
  }, [pricing, distance]);

  const submitBooking = async (e: React.FormEvent) => {
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
      // Reset form
      setPickup("");
      setDropoff("");
      setDatetime("");
      setDistance(5);
      setPreferredDriver(null);
      setPickupLatLng(null);
      setDropoffLatLng(null);
      // Refresh rides list
      supabase
        .from("rides")
        .select("*")
        .eq("rider_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setRides(data ?? []));
    } catch (err: any) {
      toast({ title: "Failed to book", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const recent = useMemo(() => rides.slice(0, 5), [rides]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome back!
          </h1>
          <p className="mt-2 text-gray-600 text-lg">Ready for your next adventure?</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Booking Section */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <h2 className="text-2xl font-bold text-white">Book a Ride</h2>
                <p className="text-blue-100 mt-1">Plan your next trip with ease</p>
              </div>
              
              <div className="p-6">
                <form onSubmit={submitBooking} className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="pickup" className="text-gray-700 font-medium">Pickup Location</Label>
                      <Input 
                        id="pickup" 
                        value={pickup} 
                        onChange={e => { 
                          const v = e.target.value; 
                          setPickup(v); 
                          setPickupLatLng(parseLatLng(v)); 
                        }} 
                        required 
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        placeholder="Enter pickup address or coordinates"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (myCoords) {
                            setPickup(`${myCoords.lat.toFixed(6)}, ${myCoords.lng.toFixed(6)}`);
                            setPickupLatLng({ lat: myCoords.lat, lng: myCoords.lng });
                          } else {
                            toast({ title: 'Location not available', description: 'Allow location permission to use current location', variant: 'destructive' });
                          }
                        }}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        📍 Use my location
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="dropoff" className="text-gray-700 font-medium">Drop-off Location</Label>
                      <Input 
                        id="dropoff" 
                        value={dropoff} 
                        onChange={e => { 
                          const v = e.target.value; 
                          setDropoff(v); 
                          setDropoffLatLng(parseLatLng(v)); 
                        }} 
                        required 
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        placeholder="Enter destination address or coordinates"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="datetime" className="text-gray-700 font-medium">Date & Time</Label>
                      <Input 
                        id="datetime" 
                        type="datetime-local" 
                        value={datetime} 
                        onChange={e => setDatetime(e.target.value)} 
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="distance" className="text-gray-700 font-medium">Distance (km)</Label>
                      <Input 
                        id="distance" 
                        type="number" 
                        min={1} 
                        step={0.1} 
                        value={distance} 
                        onChange={e => setDistance(Number(e.target.value))} 
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">Preferred Driver</Label>
                    <Select onValueChange={setPreferredDriver}>
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl">
                        <SelectValue placeholder="Auto-match with available drivers" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.user_id} value={d.user_id}>
                            {d.user_id.slice(0, 8)}… {d.is_available ? '• Available' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600 font-medium">Estimated Fare</div>
                        <div className="text-3xl font-bold text-green-600">₱{estimatedFare.toFixed(2)}</div>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={submitting} 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg"
                      >
                        {submitting ? '🚀 Booking...' : '🚗 Confirm Ride'}
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="mt-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📍 Route Preview</h3>
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                    <LiveMap
                      center={pickupLatLng ?? myCoords ?? null}
                      markers={[
                        ...(myCoords ? [{ id: 'me', lat: myCoords.lat, lng: myCoords.lng, label: 'You' }] : []),
                        ...(pickupLatLng ? [{ id: 'pickup', lat: pickupLatLng.lat, lng: pickupLatLng.lng, label: 'Pickup' }] : []),
                        ...(dropoffLatLng ? [{ id: 'dropoff', lat: dropoffLatLng.lat, lng: dropoffLatLng.lng, label: 'Drop-off' }] : []),
                      ]}
                    />
                  </div>
                  <p className="mt-3 text-sm text-gray-500 italic">💡 Tip: Enter coordinates like "7.2045, 124.2407" for precise locations</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">⚡ Quick Actions</h2>
              <div className="space-y-3">
                <Link to="/profile">
                  <Button variant="outline" className="w-full justify-start border-gray-200 hover:bg-blue-50 hover:border-blue-300 rounded-xl py-3">
                    👤 Edit Profile
                  </Button>
                </Link>
                <Link to="/payment/history">
                  <Button variant="outline" className="w-full justify-start border-gray-200 hover:bg-green-50 hover:border-green-300 rounded-xl py-3">
                    💳 Payment History
                  </Button>
                </Link>
              </div>
        </div>
            
        {isDriver && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl shadow-lg border border-orange-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🚗 Driver Panel</h2>
                <p className="text-gray-600 mb-4">Manage your rides and availability</p>
                <Link to="/driver">
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl py-3 font-semibold">
                    Open Panel
                  </Button>
                </Link>
          </div>
        )}
            
        {isAdmin && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl shadow-lg border border-purple-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">👑 Admin Panel</h2>
                <p className="text-gray-600 mb-4">Manage drivers and system settings</p>
                <Link to="/admin">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl py-3 font-semibold">
                    Open Panel
                  </Button>
                </Link>
          </div>
        )}
          </div>
        </div>

        {/* Recent Rides Section */}
        <section className="mt-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-800">📋 Recent Rides</h2>
              <p className="text-gray-600 mt-1">Your latest trips and bookings</p>
      </div>

            <div className="p-6">
        {recent.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚗</div>
                  <p className="text-gray-500 text-lg">No rides yet. Book your first trip!</p>
                </div>
        ) : (
                <div className="space-y-4">
            {recent.map((r) => (
                    <div key={r.id} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">
                            📍 {r.pickup_address || 'Pickup'} → 🎯 {r.dropoff_address || 'Drop-off'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            📅 {new Date(r.created_at).toLocaleString()} • 🏷️ {r.status}
                          </div>
                        </div>
                        {r.estimated_fare && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">₱{Number(r.estimated_fare).toFixed(2)}</div>
                          </div>
                        )}
                  </div>
                </div>
            ))}
                </div>
        )}
            </div>
          </div>
      </section>
      </div>
    </main>
  );
};

export default Dashboard;
