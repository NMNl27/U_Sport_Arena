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

-- Step 5: Insert ข้อมูลเริ่มต้น (ลองรันทีละบรรทัดถ้า error)
-- ลองรันบรรทัดแรกก่อน: INSERT INTO promotions (name, description, discount_percentage, discount_amount, valid_from, valid_until, status) VALUES ('SUMMER200', 'ส่วนลดฤดูร้อน 200 บาท', NULL, 200.00, '2025-01-01 00:00:00', '2026-12-31 23:59:59', 'active');
-- ถ้าได้ค่อยรันบรรทัดต่อไป

INSERT INTO promotions (name, description, discount_percentage, discount_amount, valid_from, valid_until, status) VALUES
('SUMMER200', 'ส่วนลดฤดูร้อน 200 บาท', NULL, 200.00, '2025-01-01 00:00:00', '2026-12-31 23:59:59', 'active');

INSERT INTO promotions (name, description, discount_percentage, discount_amount, valid_from, valid_until, status) VALUES
('WELCOME20', 'ส่วนลด 20% สำหรับสมาชิกใหม่', 20.00, NULL, '2025-01-01 00:00:00', '2026-12-31 23:59:59', 'active');

INSERT INTO promotions (name, description, discount_percentage, discount_amount, valid_from, valid_until, status) VALUES
('VIPUSER500', 'ส่วนลด 500 บาทสำหรับสมาชิก VIP', NULL, 500.00, '2025-01-01 00:00:00', '2026-12-31 23:59:59', 'active');

INSERT INTO promotions (name, description, discount_percentage, discount_amount, valid_from, valid_until, status) VALUES
('EXPIRED2024', 'โปรโมชั่นที่หมดอายุแล้ว', NULL, 300.00, '2023-01-01 00:00:00', '2024-12-31 23:59:59', 'active');

-- Step 6: ตรวจสอบข้อมูลที่ insert
SELECT 'Data inserted successfully!' as status;
SELECT name, description, discount_amount, discount_percentage, status FROM promotions;

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