-- ===========================================
-- PROMOTION SYSTEM MIGRATION
-- รันทีละส่วนเพื่อตรวจสอบ error
-- ===========================================

-- Step 1: ตรวจสอบว่าตารางมีอยู่หรือไม่
SELECT 'Checking existing tables...' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'promotions';

-- Step 2: ลบตารางเก่า (ถ้าต้องการเริ่มใหม่ - รันก่อน step 3)
-- ⚠️ ระวัง: จะลบข้อมูลทั้งหมด!
DROP TABLE IF EXISTS promotions;

-- Step 3: สร้างตาราง promotions (แก้ไข timestamp type)
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: ตรวจสอบว่าตารางสร้างสำเร็จ
SELECT 'Table created successfully!' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'promotions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Insert ข้อมูลเริ่มต้น (ถ้าต้องการเพิ่มข้อมูลจำลอง)
-- ตัวอย่าง: INSERT INTO promotions (name, description, discount_percentage, discount_amount, valid_from, valid_until, status) VALUES ('SUMMER200', 'ส่วนลดฤดูร้อน 200 บาท', NULL, 200.00, '2025-01-01 00:00:00', '2026-12-31 23:59:59', 'active');

-- Step 6: ตรวจสอบข้อมูลที่ insert (ถ้ามี)
-- SELECT name, description, discount_amount, discount_percentage, status FROM promotions;

-- Step 7: สร้าง index
CREATE INDEX IF NOT EXISTS idx_promotions_name ON promotions(name);
CREATE INDEX IF NOT EXISTS idx_promotions_status_valid ON promotions(status, valid_from, valid_until);

-- Step 8: ตรวจสอบ index
SELECT 'Indexes created successfully!' as status;
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename = 'promotions';

-- Step 9: ทดสอบ query
SELECT 'Testing query...' as status;
SELECT * FROM promotions WHERE name = 'SUMMER200';

-- ===========================================
-- PAYMENT TABLE MIGRATION
-- ===========================================

-- Step 10: สร้าง table payment
CREATE TABLE IF NOT EXISTS payment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id BIGINT NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  slip_url TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Step 11: สร้าง index สำหรับ payment table
CREATE INDEX IF NOT EXISTS idx_payment_booking_id ON payment(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_method ON payment(payment_method);

-- Step 12: ตรวจสอบว่า payment table สร้างสำเร็จ
SELECT 'Payment table created successfully!' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 13: Enable RLS (Row Level Security) สำหรับ payment table
-- ปิด RLS ชั่วคราวเพื่อทดสอบ
ALTER TABLE payment DISABLE ROW LEVEL SECURITY;

-- Step 14: สร้าง policy สำหรับ payment table (สำหรับอนาคต)
DROP POLICY IF EXISTS "Users can view their own payments" ON payment;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payment;
DROP POLICY IF EXISTS "Admins can view all payments" ON payment;
DROP POLICY IF EXISTS "Users can insert payments" ON payment;
DROP POLICY IF EXISTS "Users can view all payments" ON payment;

-- หลังจากทดสอบเสร็จแล้ว ให้เปิด RLS และใช้ policy นี้:
-- ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow insert for all"
--   ON payment FOR INSERT
--   WITH CHECK (true);
-- CREATE POLICY "Allow select for all"
--   ON payment FOR SELECT
--   USING (true);
