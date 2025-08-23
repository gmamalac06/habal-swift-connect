import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cleanupAuthState } from "@/utils/authCleanup";

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDriverSignup, setIsDriverSignup] = useState(false);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' as any }); } catch {}
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: { full_name: fullName, phone } },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName, phone });
        if (isDriverSignup) {
          if (!vehicleMake || !vehicleModel || !plateNumber || !licenseNumber) {
            throw new Error("Please complete all driver details.");
          }
          const { error: drvErr } = await supabase.from("drivers").insert({
            user_id: data.user.id,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            plate_number: plateNumber,
            license_number: licenseNumber,
          });
          if (drvErr) throw drvErr;
          toast({ title: "Driver application submitted", description: "Await admin approval." });
        } else {
          toast({ title: "Welcome!", description: "Account created successfully." });
        }
        window.location.href = "/dashboard";
      } else {
        toast({ title: "Check your email", description: "Confirm your email to finish sign up." });
      }
    } catch (error: any) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto max-w-md py-16">
      <h1 className="mb-2 text-3xl font-semibold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <p className="mb-8 text-muted-foreground">Secure access to Habal-Habal Cotabato</p>
      <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
        {mode === 'signup' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Sign up as a driver</div>
                  <div className="text-xs text-muted-foreground">Includes vehicle and license details for admin approval.</div>
                </div>
                <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setIsDriverSignup(v => !v)}>
                  {isDriverSignup ? 'Switch to rider' : 'Switch to driver'}
                </button>
              </div>
              {isDriverSignup && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_make">Vehicle make</Label>
                    <Input id="vehicle_make" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} required={isDriverSignup} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_model">Vehicle model</Label>
                    <Input id="vehicle_model" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} required={isDriverSignup} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate_number">Plate number</Label>
                    <Input id="plate_number" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} required={isDriverSignup} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_number">License number</Label>
                    <Input id="license_number" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required={isDriverSignup} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading} variant="hero">
          {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm">
        {mode === 'signin' ? (
          <button className="text-primary underline-offset-4 hover:underline" onClick={() => setMode('signup')}>New here? Create an account</button>
        ) : (
          <button className="text-primary underline-offset-4 hover:underline" onClick={() => setMode('signin')}>Already have an account? Sign in</button>
        )}
      </div>
    </main>
  );
};

export default Auth;
