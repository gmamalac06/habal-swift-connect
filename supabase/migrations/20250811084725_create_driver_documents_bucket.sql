-- Create storage bucket for driver documents
-- This migration sets up the storage bucket and RLS policies for document uploads

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket

-- Policy: Users can upload their own documents
CREATE POLICY "Users can upload own driver documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own driver documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all driver documents
CREATE POLICY "Admins can view all driver documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-documents' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own driver documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'driver-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'driver-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own driver documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'driver-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
