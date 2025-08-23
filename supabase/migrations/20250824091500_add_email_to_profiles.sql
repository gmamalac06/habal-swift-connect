-- Add email column to profiles and backfill from auth.users (idempotent)
DO $$
BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
    COMMENT ON COLUMN public.profiles.email IS 'User email cached from auth.users for admin lookup';
  END IF;
END$$;

-- Backfill email for existing profiles where null
DO $$
BEGIN
  -- Only run if auth.users table exists (supabase) and profiles.email is null for some rows
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.email IS NULL AND p.id = u.id;
  END IF;
END$$;

-- Grant select on profiles.email to authenticated (policy will still control visibility)
-- Note: this doesn't change RLS policies; ensure your profiles SELECT policy allows the admin to view email when needed.

