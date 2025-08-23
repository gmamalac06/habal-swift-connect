-- Add vehicle_photo_url to drivers (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'vehicle_photo_url'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN vehicle_photo_url text;
    COMMENT ON COLUMN public.drivers.vehicle_photo_url IS 'URL to uploaded vehicle photo';
  END IF;
END$$;

-- Note: Backfilling vehicle photos is not possible automatically; upload flow should store the public URL to this column.
