
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
  const { session, isAdmin, loading, roles } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Debug logging
  console.log('AdminPanel Debug:', {
    loading,
    hasSession: !!session,
    userId: session?.user?.id,
    isAdmin,
    roles
  });

  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ totalDrivers: 0, totalRiders: 0, totalUsers: 0 });
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
      return;
    }
    if (!loading && session && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges to access this page.",
        variant: "destructive"
      });
      navigate("/dashboard");
      return;
    }
  }, [loading, session, isAdmin, navigate, toast]);

  useEffect(() => {
    if (session && isAdmin) {
      refresh();
    }
  }, [session, isAdmin]);

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
    
    // Load all users from profiles table and determine their roles
    console.log('Starting to load all users...');
    
    // First, let's test a simple query to see if we can access the table at all
    console.log('Testing basic table access...');
    
    // Test 1: Simple profiles query
    const { data: testProfiles, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    console.log('Test profiles query result:', { data: testProfiles, error: testError });
    
    // Test 2: Simple user_roles query
    const { data: testRoles, error: testRolesError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);
    
    console.log('Test user_roles query result:', { data: testRoles, error: testRolesError });
    
    // Get all profiles (this should work since profiles are created for all users)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('Error loading profiles:', profilesError);
    } else {
      console.log('Profiles loaded:', profiles);
    }
    
    // Get all user roles to map them
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .order('created_at', { ascending: false });
    
    if (userRolesError) {
      console.error('Error loading user roles:', userRolesError);
    } else {
      console.log('User roles loaded:', userRoles);
    }
    
    // Get all drivers to determine who is a driver
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('user_id, approval_status')
      .order('created_at', { ascending: false });
    
    if (driversError) {
      console.error('Error loading drivers:', driversError);
    } else {
      console.log('Drivers loaded:', drivers);
    }
    
    if (profiles && profiles.length > 0) {
      console.log('Processing', profiles.length, 'profiles');
      
      // Create a map of user roles
      const roleMap = new Map();
      if (userRoles) {
        console.log('Processing', userRoles.length, 'user roles');
        userRoles.forEach(ur => {
          roleMap.set(ur.user_id, ur.role);
        });
      }
      
      // Create a map of driver status
      const driverMap = new Map();
      if (drivers) {
        console.log('Processing', drivers.length, 'drivers');
        drivers.forEach(d => {
          driverMap.set(d.user_id, d.approval_status);
        });
      }
      
      console.log('Role map size:', roleMap.size);
      console.log('Driver map size:', driverMap.size);
      
      // Combine profiles with roles and driver info
      const usersWithRoles = profiles.map(profile => {
        // Check if user has a role in user_roles table
        const explicitRole = roleMap.get(profile.id);
        
        // Check if user is a driver (has entry in drivers table)
        const isDriver = driverMap.has(profile.id);
        
        // Determine role: explicit role > driver > rider (default)
        let role;
        if (explicitRole) {
          role = explicitRole; // Use explicit role (admin, driver, etc.)
        } else if (isDriver) {
          role = 'driver'; // User is in drivers table but no explicit role
        } else {
          role = 'rider'; // Default for regular users
        }
        
        const driverStatus = driverMap.get(profile.id);
        
        return {
          user_id: profile.id,
          role: role,
          profiles: profile,
          driver_status: driverStatus
        };
      });
      
      console.log('Combined users with roles:', usersWithRoles);
      
      // Debug role distribution
      const roleDistribution = {};
      usersWithRoles.forEach(user => {
        roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
      });
      console.log('Role distribution:', roleDistribution);
      
      setUsers(usersWithRoles);
      
      // Calculate stats
      const drivers = usersWithRoles.filter(u => u.role === 'driver').length;
      const riders = usersWithRoles.filter(u => u.role === 'rider').length;
      const admins = usersWithRoles.filter(u => u.role === 'admin').length;
      const total = usersWithRoles.length;
      
      console.log('Calculated stats:', { drivers, riders, admins, total });
      setUserStats({ totalDrivers: drivers, totalRiders: riders, totalUsers: total });
    } else {
      console.log('No profiles found');
      
      // Fallback: try to get auth users directly
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
          console.error('Error loading auth users:', authError);
        } else {
          console.log('Auth users found:', authUsers?.users?.length || 0);
          if (authUsers?.users) {
            const basicUsers = authUsers.users.map(user => ({
              user_id: user.id,
              role: 'unknown',
              profiles: { full_name: user.email, phone: 'N/A', created_at: user.created_at }
            }));
            setUsers(basicUsers);
            setUserStats({ 
              totalDrivers: 0, 
              totalRiders: basicUsers.length, 
              totalUsers: basicUsers.length 
            });
          }
        }
      } catch (error) {
        console.error('Error with auth admin:', error);
      }
    }
  };

  const approve = async (driver: any, approve: boolean) => {
    const status = approve ? 'approved' : 'rejected';
    const { error } = await supabase.from("drivers").update({ approval_status: status }).eq("id", driver.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (approve) {
      // Use the admin function to assign driver role
      const { error: roleError } = await supabase.rpc('assign_user_role', {
        target_user_id: driver.user_id,
        role_to_assign: 'driver'
      });
      
      if (roleError) {
        console.error('Failed to add driver role:', roleError);
        toast({ 
          title: "Warning", 
          description: "Driver approved but role assignment failed. Please check manually.", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Driver approved and role assigned" });
      }
    } else {
      toast({ title: "Driver rejected" });
    }
    refresh();
  };

  const setPaymentStatus = async (paymentId: string, status: 'pending' | 'paid' | 'failed' | 'refunded') => {
    const { error } = await supabase.from('payments').update({ status }).eq('id', paymentId);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Payment updated' });
    setPayments((list) => list.map((p) => (p.id === paymentId ? { ...p, status } : p)));
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete user roles first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (roleError) throw roleError;
      
      // Delete driver record if exists
      const { error: driverError } = await supabase
        .from('drivers')
        .delete()
        .eq('user_id', userId);
      
      if (driverError) throw driverError;
      
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      toast({ title: "User deleted successfully" });
      refresh();
    } catch (error: any) {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    }
  };

  const banUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user? They will not be able to access the platform.')) {
      return;
    }
    
    try {
      // Add a 'banned' role to the user
      const { error } = await supabase.rpc('assign_user_role', {
        target_user_id: userId,
        role_to_assign: 'banned'
      });
      
      if (error) throw error;
      
      toast({ title: "User banned successfully" });
      refresh();
    } catch (error: any) {
      toast({ title: "Failed to ban user", description: error.message, variant: "destructive" });
    }
  };

  const viewUserDetails = async (userId: string) => {
    try {
      // Get comprehensive user data
      const { data: userData } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner(full_name, phone, created_at),
          drivers(vehicle_make, vehicle_model, plate_number, license_number, approval_status, or_document_url, cr_document_url)
        `)
        .eq('user_id', userId)
        .single();
      
      if (userData) {
        setSelectedUser(userData);
        setShowUserDetails(true);
      }
    } catch (error: any) {
      toast({ title: "Failed to load user details", description: error.message, variant: "destructive" });
    }
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

  // Show loading state while checking permissions
  if (loading) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="text-center">Loading...</div>
      </main>
    );
  }

  // Show message if not admin
  if (!isAdmin) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have admin privileges to access this page.</p>
        </div>
      </main>
    );
  }

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
            <CardTitle className="text-green-700">Total Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{userStats.totalDrivers}</div>
            <p className="text-green-600/70 text-sm">Approved drivers</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700">Total Riders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{userStats.totalRiders}</div>
            <p className="text-orange-600/70 text-sm">Registered riders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-700">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{userStats.totalUsers}</div>
            <p className="text-purple-600/70 text-sm">All users</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-indigo-700">Base Fare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">₱{pricing?.base_fare || 25}</div>
            <p className="text-indigo-600/70 text-sm">Current setting</p>
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
                  <div className="space-y-4">
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
                    
                    {/* Document Links */}
                    <div className="border-t pt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</div>
                      <div className="flex gap-3">
                        {d.or_document_url && (
                          <a 
                            href={d.or_document_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            📄 Official Receipt (OR)
                          </a>
                        )}
                        {d.cr_document_url && (
                          <a 
                            href={d.cr_document_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            📄 Certificate of Registration (CR)
                          </a>
                        )}
                        {!d.or_document_url && !d.cr_document_url && (
                          <span className="text-sm text-red-600">⚠️ No documents uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            User Management
          </CardTitle>
          <CardDescription>View and manage all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">👥</div>
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.user_id} className="p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-white border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-gray-900">
                          {user.profiles?.full_name || 'Unknown User'}
                        </div>
                        <Badge variant={
                          user.role === 'admin' ? 'default' :
                          user.role === 'driver' ? 'secondary' :
                          user.role === 'rider' ? 'outline' : 'destructive'
                        }>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        ID: {user.user_id.slice(0, 8)}... • Phone: {user.profiles?.phone || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined: {new Date(user.profiles?.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => viewUserDetails(user.user_id)}
                      >
                        👁️ View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => banUser(user.user_id)}
                        disabled={user.role === 'admin'}
                      >
                        🚫 Ban User
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteUser(user.user_id)}
                        disabled={user.role === 'admin'}
                      >
                        🗑️ Delete
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

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">User Details</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                  }}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                      <p className="text-gray-900">{selectedUser.profiles?.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Phone</Label>
                      <p className="text-gray-900">{selectedUser.profiles?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">User ID</Label>
                      <p className="text-gray-900 font-mono text-sm">{selectedUser.user_id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Role</Label>
                      <Badge variant={
                        selectedUser.role === 'admin' ? 'default' :
                        selectedUser.role === 'driver' ? 'secondary' :
                        selectedUser.role === 'rider' ? 'outline' : 'destructive'
                      }>
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Joined Date</Label>
                      <p className="text-gray-900">{new Date(selectedUser.profiles?.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Driver Information */}
                {selectedUser.role === 'driver' && selectedUser.drivers && selectedUser.drivers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Driver Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Vehicle</Label>
                        <p className="text-gray-900">{selectedUser.drivers[0].vehicle_make} {selectedUser.drivers[0].vehicle_model}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Plate Number</Label>
                        <p className="text-gray-900">{selectedUser.drivers[0].plate_number}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">License Number</Label>
                        <p className="text-gray-900">{selectedUser.drivers[0].license_number}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Approval Status</Label>
                        <Badge variant={
                          selectedUser.drivers[0].approval_status === 'approved' ? 'default' :
                          selectedUser.drivers[0].approval_status === 'pending' ? 'outline' : 'destructive'
                        }>
                          {selectedUser.drivers[0].approval_status}
                        </Badge>
                      </div>
                    </div>

                    {/* Driver Documents */}
                    <div className="mt-4">
                      <Label className="text-sm font-medium text-gray-600">Documents</Label>
                      <div className="flex gap-3 mt-2">
                        {selectedUser.drivers[0].or_document_url && (
                          <a 
                            href={selectedUser.drivers[0].or_document_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            📄 Official Receipt (OR)
                          </a>
                        )}
                        {selectedUser.drivers[0].cr_document_url && (
                          <a 
                            href={selectedUser.drivers[0].cr_document_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            📄 Certificate of Registration (CR)
                          </a>
                        )}
                        {!selectedUser.drivers[0].or_document_url && !selectedUser.drivers[0].cr_document_url && (
                          <span className="text-sm text-red-600">⚠️ No documents uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={() => banUser(selectedUser.user_id)}
                    disabled={selectedUser.role === 'admin'}
                  >
                    🚫 Ban User
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => deleteUser(selectedUser.user_id)}
                    disabled={selectedUser.role === 'admin'}
                  >
                    🗑️ Delete User
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowUserDetails(false);
                      setSelectedUser(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminPanel;
