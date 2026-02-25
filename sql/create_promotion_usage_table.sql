-- Create promotion_usage table to track which users have used which promotions
CREATE TABLE IF NOT EXISTS promotion_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL, -- This should match your user ID type
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(promotion_id, user_id) -- Ensures one user can use a promotion only once
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_user ON promotion_usage(promotion_id, user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_user ON promotion_usage(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for promotion_usage table
-- 1. Allow users to view their own promotion usage
DROP POLICY IF EXISTS "Users can view their own promotion usage" ON promotion_usage;
CREATE POLICY "Users can view their own promotion usage" ON promotion_usage
  FOR SELECT USING (auth.uid()::text = user_id);

-- 2. Allow users to insert their own promotion usage (through service role)
DROP POLICY IF EXISTS "Users can insert promotion usage" ON promotion_usage;
CREATE POLICY "Users can insert promotion usage" ON promotion_usage
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 3. Allow admins to view all promotion usage
DROP POLICY IF EXISTS "Admins can view all promotion usage" ON promotion_usage;
CREATE POLICY "Admins can view all promotion usage" ON promotion_usage
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- 4. Allow service role to bypass RLS (for API calls)
DROP POLICY IF EXISTS "Service role full access" ON promotion_usage;
CREATE POLICY "Service role full access" ON promotion_usage
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Verify table creation
SELECT 'promotion_usage table created successfully!' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'promotion_usage' AND table_schema = 'public'
ORDER BY ordinal_position;
