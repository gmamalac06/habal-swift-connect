import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

const AdminPanel = () => {
  const { session, isAdmin, loading } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!session || !isAdmin)) navigate("/auth");
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

  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-semibold">Admin Panel</h1>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Pending driver applications</h2>
        {pendingDrivers.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No pending applications.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pendingDrivers.map((d) => (
              <li key={d.id} className="rounded-md border p-4">
                <div className="font-medium">{d.user_id}</div>
                <div className="text-sm text-muted-foreground">{d.vehicle_make} {d.vehicle_model} • {d.plate_number}</div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => approve(d, true)}>Approve</Button>
                  <Button variant="destructive" onClick={() => approve(d, false)}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 max-w-lg">
        <h2 className="text-xl font-medium">Fare & pricing</h2>
        <form onSubmit={savePricing} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="base_fare">Base fare</Label>
            <Input id="base_fare" name="base_fare" type="number" step="0.01" defaultValue={pricing?.base_fare ?? 25} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="per_km">Per km</Label>
            <Input id="per_km" name="per_km" type="number" step="0.01" defaultValue={pricing?.per_km ?? 10} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="surge_multiplier">Surge</Label>
            <Input id="surge_multiplier" name="surge_multiplier" type="number" step="0.1" defaultValue={pricing?.surge_multiplier ?? 1} />
          </div>
          <div className="sm:col-span-3"><Button type="submit">Save pricing</Button></div>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-medium">Recent payments</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Ride</th>
                  <th className="py-2 pr-4">Payer</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-4">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{String(p.ride_id).slice(0, 8)}…</td>
                    <td className="py-2 pr-4">{String(p.payer_id).slice(0, 8)}…</td>
                    <td className="py-2 pr-4 uppercase">{p.method}</td>
                    <td className="py-2 pr-4">₱{Number(p.amount).toFixed(2)}</td>
                    <td className="py-2 pr-4">{p.status}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPaymentStatus(p.id, 'pending')}>Pending</Button>
                        <Button size="sm" onClick={() => setPaymentStatus(p.id, 'paid')}>Mark paid</Button>
                        <Button size="sm" variant="destructive" onClick={() => setPaymentStatus(p.id, 'failed')}>Fail</Button>
                        <Button size="sm" variant="outline" onClick={() => setPaymentStatus(p.id, 'refunded')}>Refund</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminPanel;
