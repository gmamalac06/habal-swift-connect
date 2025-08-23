-- Add rider_online column to profiles table
-- Run this in your Supabase SQL editor if you want rider online/offline functionality

-- Add the column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rider_online BOOLEAN DEFAULT true;

-- Add RLS policy for rider_online column
DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Profiles: users can update own rider_online" ON public.profiles;
  
  -- Create new policy
  CREATE POLICY "Profiles: users can update own rider_online" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);
  
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;

-- Add policy for reading rider_online
DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Profiles: authenticated can read rider_online" ON public.profiles;
  
  -- Create new policy
  CREATE POLICY "Profiles: authenticated can read rider_online" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.role() = 'authenticated');
  
EXCEPTION WHEN duplicate_object THEN 
  NULL;
END $$;
