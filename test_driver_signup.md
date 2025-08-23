# Driver Signup Test Guide

## Prerequisites
1. Run the SQL migration: `fix_user_roles_insert_policy.sql` in your Supabase SQL editor
2. Make sure the new migration file is applied: `20250811084722_add_user_roles_insert_policy.sql`

## Test Steps

### 1. Test Driver Signup
1. Go to the app and click "Create account"
2. Fill in the form:
   - Full name: "Test Driver"
   - Phone: "09123456789"
   - Email: "testdriver@example.com"
   - Password: "password123"
3. **Important**: Check "Sign up as a driver"
4. Fill in driver details:
   - Vehicle make: "Honda"
   - Vehicle model: "Wave 110"
   - Plate number: "ABC123"
   - License number: "L123456789"
5. Click "Create account"

### 2. Verify Database Entries
After signup, check these tables in Supabase:

#### Check `profiles` table:
```sql
SELECT * FROM profiles WHERE full_name = 'Test Driver';
```

#### Check `drivers` table:
```sql
SELECT * FROM drivers WHERE user_id = (SELECT id FROM auth.users WHERE email = 'testdriver@example.com');
```
Should show: `approval_status = 'pending'`

#### Check `user_roles` table:
```sql
SELECT * FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'testdriver@example.com');
```
Should show: `role = 'driver'`

### 3. Test Login and Redirection
1. Sign out and sign back in with the driver account
2. Should be automatically redirected to `/driver` (Driver Panel)
3. Should see "Driver application submitted" message

### 4. Test Admin Approval
1. Login as admin
2. Go to Admin Panel
3. Should see the pending driver in the "Pending Driver Applications" section
4. Click "Approve" 
5. Check that `drivers.approval_status` changes to 'approved'

## Expected Results
- ✅ Driver account created successfully
- ✅ Entry created in `profiles` table
- ✅ Entry created in `drivers` table with `approval_status = 'pending'`
- ✅ Entry created in `user_roles` table with `role = 'driver'`
- ✅ User redirected to Driver Panel after login
- ✅ Admin can see and approve the driver application

## Troubleshooting
If role creation fails:
1. Check if the INSERT policy exists: `SELECT * FROM pg_policies WHERE tablename = 'user_roles';`
2. Run the SQL migration manually if needed
3. Check browser console for any error messages
