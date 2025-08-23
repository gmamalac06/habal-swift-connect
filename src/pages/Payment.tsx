import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const { rideId } = useParams<{ rideId: string }>();
  const { user, session, loading } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ride, setRide] = useState<any | null>(null);
  const [method, setMethod] = useState<"gcash" | "paymaya" | "cod">("cod");
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate("/auth");
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!rideId || !user) return;
    supabase
      .from("rides")
      .select("*")
      .eq("id", rideId)
      .eq("rider_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
        setRide(data ?? null);
        setAmount(Number((data?.final_fare ?? data?.estimated_fare ?? 0)));
      });
  }, [rideId, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ride) return;
    setSubmitting(true);
    try {
      const payload: any = {
        ride_id: ride.id,
        payer_id: user.id,
        method,
        amount,
        status: method === 'cod' ? 'pending' : 'pending',
        // For non-COD, you might store a reference number or proof URL
        reference
      };
      const { error } = await supabase.from('payments').insert(payload);
      if (error) throw error;
      toast({ title: 'Payment recorded', description: method === 'cod' ? 'Please pay your driver in cash.' : 'We will verify your payment shortly.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-lg py-10">
      <h1 className="text-3xl font-semibold">Payment</h1>
      {!ride ? (
        <p className="mt-2 text-muted-foreground">Loading…</p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="rounded-md border p-4 text-sm">
            <div className="font-medium">{ride.pickup_address || 'Pickup'} → {ride.dropoff_address || 'Drop-off'}</div>
            <div className="text-muted-foreground">Fare: ₱{Number((ride.final_fare ?? ride.estimated_fare) || 0).toFixed(2)}</div>
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v: any) => setMethod(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="paymaya">PayMaya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(method === 'gcash' || method === 'paymaya') && (
            <div className="space-y-2">
              <Label htmlFor="reference">Reference number / note</Label>
              <Input id="reference" placeholder="Enter reference or last 4 digits" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Confirm payment'}</Button>
          </div>
        </form>
      )}
    </main>
  );
};

export default Payment;



