-- Add document upload fields for driver registration
-- OR (Official Receipt) and CR (Certificate of Registration) documents

-- Add document fields to drivers table
ALTER TABLE public.drivers 
ADD COLUMN or_document_url text,
ADD COLUMN cr_document_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.drivers.or_document_url IS 'URL to uploaded Official Receipt document';
COMMENT ON COLUMN public.drivers.cr_document_url IS 'URL to uploaded Certificate of Registration document';

-- Create storage bucket for driver documents if it doesn't exist
-- Note: This will be created automatically by Supabase when files are uploaded
-- The bucket should be named 'driver-documents' with appropriate RLS policies
