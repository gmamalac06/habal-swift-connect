import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

const PaymentHistory = () => {
  const { session, loading } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    if (!loading && !session) navigate("/auth");
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session?.user) return;
    loadPaymentHistory();
  }, [session]);

  const loadPaymentHistory = async () => {
    if (!session?.user) return;
    setLoadingPayments(true);
    
    try {
      // Load payments for the current user
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("payer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Load rides for context
      const { data: ridesData, error: ridesError } = await supabase
        .from("rides")
        .select("*")
        .eq("rider_id", session.user.id)
        .order("created_at", { ascending: false });

      if (ridesError) throw ridesError;

      setPayments(paymentsData || []);
      setRides(ridesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading payment history",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingPayments(false);
    }
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

  const getMethodIcon = (method: string) => {
    const icons: Record<string, string> = {
      gcash: "📱",
      paymaya: "💳",
      cod: "💵"
    };
    return icons[method] || "💰";
  };

  const getRideDetails = (rideId: string) => {
    return rides.find(ride => ride.id === rideId);
  };

  const filteredPayments = payments.filter(payment => {
    const statusMatch = filterStatus === "all" || payment.status === filterStatus;
    const methodMatch = filterMethod === "all" || payment.method === filterMethod;
    return statusMatch && methodMatch;
  });

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const paidAmount = filteredPayments
    .filter(payment => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  if (loadingPayments) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500 text-lg">Loading payment history...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="border-gray-200 hover:bg-gray-50"
            >
              ← Back to Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Payment History
          </h1>
          <p className="mt-2 text-gray-600 text-lg">Track all your payment transactions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{filteredPayments.length}</div>
              <p className="text-blue-600/70 text-sm">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">₱{totalAmount.toFixed(2)}</div>
              <p className="text-green-600/70 text-sm">All transactions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-700">Paid Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">₱{paidAmount.toFixed(2)}</div>
              <p className="text-purple-600/70 text-sm">Successfully paid</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              Filters
            </CardTitle>
            <CardDescription>Filter your payment history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Method</label>
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Filter by method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="paymaya">PayMaya</SelectItem>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Payment Transactions
            </CardTitle>
            <CardDescription>
              {filteredPayments.length} transaction{filteredPayments.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-2">💰</div>
                <p className="text-lg">No payments found</p>
                <p className="text-sm">Try adjusting your filters or book a ride to see payments here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => {
                  const ride = getRideDetails(payment.ride_id);
                  return (
                    <div key={payment.id} className="p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50 border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{getMethodIcon(payment.method)}</span>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {payment.method.toUpperCase()} Payment
                              </div>
                              <div className="text-sm text-gray-600">
                                {ride ? (
                                  <>
                                    📍 {ride.pickup_address || 'Pickup'} → 🎯 {ride.dropoff_address || 'Drop-off'}
                                  </>
                                ) : (
                                  'Ride details not available'
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            📅 {new Date(payment.created_at).toLocaleString()} • ID: {payment.id.slice(0, 8)}...
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            ₱{Number(payment.amount).toFixed(2)}
                          </div>
                          <div className="mb-2">
                            {getStatusBadge(payment.status)}
                          </div>
                          {payment.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/payment/${payment.ride_id}`)}
                              className="text-xs"
                            >
                              Update Payment
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PaymentHistory;
