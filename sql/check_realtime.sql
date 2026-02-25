-- ตรวจสอบว่า Realtime เปิดใช้งานสำหรับตาราง bookings หรือไม่

-- วิธี 1: ดู publication tables (ถ้าใช้ publication ชื่อ 'supabase_realtime')
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'bookings';

-- วิธี 2: ดูทุก publication และ tables ที่อยู่ในนั้น
SELECT 
    p.pubname as publication_name,
    c.relname as table_name,
    n.nspname as schema_name
FROM pg_publication p
JOIN pg_publication_rel pr ON p.oid = pr.prpubid
JOIN pg_class c ON pr.prrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'bookings';

-- วิธี 3: ตรวจสอบว่า supabase_realtime publication มี tables อะไรบ้าง
SELECT 
    c.relname as table_name,
    n.nspname as schema_name
FROM pg_publication p
JOIN pg_publication_rel pr ON p.oid = pr.prpubid
JOIN pg_class c ON pr.prrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE p.pubname = 'supabase_realtime';

-- วิธี 4: ถ้าไม่มี ต้องเพิ่ม bookings เข้าไป
-- ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
