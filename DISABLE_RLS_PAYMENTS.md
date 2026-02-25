# ปิด RLS บนตาราง payments

ทำตามขั้นตอนนี้เพื่อแก้ไขข้อผิดพลาด "new row violates row-level security policy":

## วิธีที่ 1: ใช้ Supabase Dashboard (ง่ายที่สุด)

1. ไปที่ **Supabase Dashboard** → เลือก Project
2. ไปที่ **Authentication** → **Policies** 
3. หรือไปที่ **Table Editor** → เลือกตาราง **payments**
4. คลิก **RLS** ที่ขวาบน
5. เลือก **Disable RLS on this table**

## วิธีที่ 2: ใช้ SQL Editor

1. ไปที่ **SQL Editor** ใน Supabase Dashboard
2. รัน SQL ต่อไปนี้:

```sql
-- Disable RLS on payments table
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'payments';
```

## วิธีที่ 3: ลบ RLS Policies ทั้งหมด (ถ้าต้องการเก็บ RLS)

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
DROP POLICY IF EXISTS "Allow insert for all" ON payments;
DROP POLICY IF EXISTS "Allow select for all" ON payments;
DROP POLICY IF EXISTS "Allow service role" ON payments;

-- Create new policy for service role
CREATE POLICY "Allow service role to insert" ON payments
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR auth.role() = 'service_role');

CREATE POLICY "Allow service role to select" ON payments
  FOR SELECT
  USING (auth.uid() IS NULL OR auth.role() = 'service_role');
```

## ✅ หลังจากทำเสร็จ

ลองกดปุ่ม "ยืนยันการชำระเงิน" อีกครั้ง มันควรจะทำงานแล้ว
