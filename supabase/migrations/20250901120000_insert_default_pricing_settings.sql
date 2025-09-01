-- Insert default pricing settings if none exist
INSERT INTO pricing_settings (id, base_fare, per_km, surge_multiplier, created_at, updated_at)
VALUES (1, 25.00, 10.00, 1.00, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;