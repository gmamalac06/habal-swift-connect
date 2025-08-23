import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminPanel = () => {
  const { session, isAdmin, loading } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
      return;
    }
    if (!loading && session && !isAdmin) {
      navigate("/dashboard");
      return;
    }
  }, [loading, session, isAdmin, navigate]);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const { data: drv } = await supabase.from("drivers").select("*").eq("approval_status", "pending");
    setPendingDrivers(drv ?? []);
    const ps = await supabase.from("pricing_settings").select("*").maybeSingle?.();
    setPricing((ps as any)?.data ?? ps ?? null);
    const { data: pays } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setPayments(pays ?? []);
  };

  const approve = async (driver: any, approve: boolean) => {
    const status = approve ? 'approved' : 'rejected';
    const { error } = await supabase.from("drivers").update({ approval_status: status }).eq("id", driver.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (approve) {
      // ensure driver role exists
      await supabase.from("user_roles").insert({ user_id: driver.user_id, role: 'driver' }).select().then(async ({ error }) => {
        if (error && !String(error.message || '').includes('duplicate')) {
          console.error(error);
        }
      });
    }
    toast({ title: approve ? "Driver approved" : "Driver rejected" });
    refresh();
  };

  const setPaymentStatus = async (paymentId: string, status: 'pending' | 'paid' | 'failed' | 'refunded') => {
    const { error } = await supabase.from('payments').update({ status }).eq('id', paymentId);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Payment updated' });
    setPayments((list) => list.map((p) => (p.id === paymentId ? { ...p, status } : p)));
  };

  const savePricing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const update = {
      base_fare: Number(form.get('base_fare') || 0),
      per_km: Number(form.get('per_km') || 0),
      surge_multiplier: Number(form.get('surge_multiplier') || 1),
    };
    const { error } = await supabase.from("pricing_settings").upsert({ id: 1, ...update });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Pricing updated" });
    refresh();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      paid: "default",
      failed: "destructive",
      refunded: "secondary"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <main className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Manage drivers, pricing, and payments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-700">Pending Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{pendingDrivers.length}</div>
            <p className="text-blue-600/70 text-sm">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{payments.length}</div>
            <p className="text-green-600/70 text-sm">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-700">Base Fare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">₱{pricing?.base_fare || 25}</div>
            <p className="text-purple-600/70 text-sm">Current setting</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Drivers Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Pending Driver Applications
          </CardTitle>
          <CardDescription>Review and approve new driver applications</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">✅</div>
              <p>No pending applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDrivers.map((d) => (
                <div key={d.id} className="p-4 rounded-lg border bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{d.user_id}</div>
                      <div className="text-sm text-muted-foreground">
                        {d.vehicle_make} {d.vehicle_model} • {d.plate_number}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        License: {d.license_number}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => approve(d, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✅ Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => approve(d, false)}
                      >
                        ❌ Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Fare & Pricing Settings
          </CardTitle>
          <CardDescription>Configure base fares and pricing multipliers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePricing} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="base_fare" className="text-sm font-medium">Base Fare (₱)</Label>
                <Input 
                  id="base_fare" 
                  name="base_fare" 
                  type="number" 
                  step="0.01" 
                  defaultValue={pricing?.base_fare ?? 25}
                  className="border-blue-200 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">Minimum fare for any ride</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="per_km" className="text-sm font-medium">Per Kilometer (₱)</Label>
                <Input 
                  id="per_km" 
                  name="per_km" 
                  type="number" 
                  step="0.01" 
                  defaultValue={pricing?.per_km ?? 10}
                  className="border-green-200 focus:border-green-500"
                />
                <p className="text-xs text-muted-foreground">Rate per kilometer traveled</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surge_multiplier" className="text-sm font-medium">Surge Multiplier</Label>
                <Input 
                  id="surge_multiplier" 
                  name="surge_multiplier" 
                  type="number" 
                  step="0.1" 
                  defaultValue={pricing?.surge_multiplier ?? 1}
                  className="border-purple-200 focus:border-purple-500"
                />
                <p className="text-xs text-muted-foreground">Peak hour multiplier</p>
              </div>
            </div>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              💾 Save Pricing Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Recent Payments
          </CardTitle>
          <CardDescription>Monitor and manage payment statuses</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">💰</div>
              <p>No payments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Created</th>
                    <th className="py-3 pr-4 font-medium">Ride ID</th>
                    <th className="py-3 pr-4 font-medium">Payer</th>
                    <th className="py-3 pr-4 font-medium">Method</th>
                    <th className="py-3 pr-4 font-medium">Amount</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{String(p.ride_id).slice(0, 8)}…</td>
                      <td className="py-3 pr-4 font-mono text-xs">{String(p.payer_id).slice(0, 8)}…</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="uppercase">{p.method}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-semibold">₱{Number(p.amount).toFixed(2)}</td>
                      <td className="py-3 pr-4">{getStatusBadge(p.status)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setPaymentStatus(p.id, 'pending')}>⏳</Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setPaymentStatus(p.id, 'paid')}>✅</Button>
                          <Button size="sm" variant="destructive" onClick={() => setPaymentStatus(p.id, 'failed')}>❌</Button>
                          <Button size="sm" variant="outline" onClick={() => setPaymentStatus(p.id, 'refunded')}>↩️</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminPanel;
