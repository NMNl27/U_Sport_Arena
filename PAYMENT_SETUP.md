# การตั้งค่า Payment System

## 1. สร้าง Storage Bucket สำหรับสลิป

### สร้าง Bucket "payment-slips"
1. เข้า Supabase Dashboard
2. ไปที่ **Storage** → **Buckets**
3. คลิก **New bucket**
4. ป้อนชื่อ: `payment-slips`
5. คลิก **Create bucket**

### ตั้งค่า Public Access
1. เลือก bucket `payment-slips`
2. คลิก **Policies**
3. สร้าง Policy สำหรับการอ่าน (SELECT):
   - Name: `Allow public read`
   - Target roles: `public`
   - Permissions: `SELECT`
   - USING expression: `true`

4. สร้าง Policy สำหรับการอัพโหลด (INSERT):
   - Name: `Allow authenticated upload`
   - Target roles: `authenticated`
   - Permissions: `INSERT`
   - WITH CHECK: `true`

## 2. สร้าง Payment Table ใน Supabase

ไปที่ **SQL Editor** และรันคำสั่งนี้:

```sql
-- สร้าง payment table
CREATE TABLE IF NOT EXISTS payment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  slip_url TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- สร้าง indexes
CREATE INDEX idx_payment_booking_id ON payment(booking_id);
CREATE INDEX idx_payment_status ON payment(status);
CREATE INDEX idx_payment_method ON payment(payment_method);

-- Enable RLS
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payments"
  ON payment FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payment.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own payments"
  ON payment FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payment.booking_id
      AND bookings.user_id = auth.uid()
    )
  );
```

## 3. อัพเดท Bookings Table (เพิ่มเติม)

เพิ่ม column `status` เพื่อติดตามสถานะการจอง (ถ้ายังไม่มี):

```sql
-- ตรวจสอบว่า column status มีอยู่หรือไม่
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
```

สถานะที่เป็นไปได้:
- `pending` - รอการจอง
- `payment_pending` - รอการชำระเงิน
- `confirmed` - ยืนยันแล้ว
- `completed` - เสร็จสิ้น
- `cancelled` - ยกเลิก

## 4. Flow การชำระเงิน

### PromptPay Flow:
1. ผู้ใช้เลือก **PromptPay** ที่หน้า payment-option
2. ส่งตัวไปยังหน้า `/reservation/payment`
3. แสดง QR Code (จากไฟล์ `public/assets/images/QR_TEST.jpg`)
4. ผู้ใช้สแกน QR โดยใช้แอปธนาคาร และโอนเงิน
5. ผู้ใช้แนบไฟล์สลิป
6. ระบบอัพโหลดสลิปไป `payment-slips` bucket
7. บันทึกข้อมูล payment ลง `payment` table
8. อัพเดท booking status เป็น `payment_pending`
9. นำไปยังหน้า `/bookings`

## 5. ตัวแปรสิ่งแวดล้อม

เพิ่มใน `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 6. Payment Status Tracking (ตัวอย่าง)

ทีมงาน Admin สามารถตรวจสอบสลิปและอัพเดท status:

```sql
-- ดู pending payments
SELECT p.*, b.field_id, b.booking_date, u.email
FROM payment p
JOIN bookings b ON p.booking_id = b.id
JOIN users u ON b.user_id = u.id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;

-- อัพเดท status เป็น confirmed
UPDATE payment 
SET status = 'confirmed', updated_at = NOW() 
WHERE id = 'payment_id_here';

-- อัพเดท booking เป็น confirmed
UPDATE bookings 
SET status = 'confirmed' 
WHERE id = (SELECT booking_id FROM payment WHERE id = 'payment_id_here');
```

## 7. Test QR Code

ไฟล์ QR Test ตั้งอยู่ที่: `public/assets/images/QR_TEST.jpg`

สามารถเปลี่ยนไฟล์นี้เป็น QR Code ที่แท้จริงของธนาคารได้ ในอนาคต

## หมายเหตุ

- Payment table จะเก็บข้อมูลการชำระเงินทั้งหมด
- Slip URL จะชี้ไปยัง Supabase Storage URL โดยสามารถดาวน์โหลดได้
- Status field ใช้สำหรับติดตามสถานะการชำระเงิน (pending, confirmed, rejected)
- ระบบจะเชื่อมโยง booking_id เพื่อให้ทีมงานสามารถหาข้อมูลการจองได้ง่าย
