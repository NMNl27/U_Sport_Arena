"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

interface TempBooking {
  id: string
  fieldId: string
  fieldName: string
  bookingDate: string
  timeSlots: string[]
  totalPrice: number
  finalPrice?: number
  discountAmount?: number
  appliedPromotion?: any
  status: "pending"
  createdAt: string
}

export default function PromptPayPayment() {
  const [tempBooking, setTempBooking] = useState<TempBooking | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const booking = sessionStorage.getItem("tempBooking")
    if (booking) {
      setTempBooking(JSON.parse(booking))
    }
    setLoading(false)
  }, [])

  const handleSlipSelect = (file: File | null) => {
    if (!file) {
      setSlipFile(null)
      setSlipPreview(null)
      return
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ")
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("ไฟล์ขนาดใหญ่เกินไป (สูงสุด 10MB)")
      return
    }

    setSlipFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setSlipPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadSlip = async () => {
    if (!slipFile) {
      alert("กรุณาเลือกไฟล์สลิป")
      return
    }

    if (!tempBooking) {
      alert("ข้อมูลการจองไม่สมบูรณ์")
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Ensure booking exists: create via API if needed
      let bookingId = tempBooking.id
      // If bookingId is missing or not a pure numeric id (e.g., 'BK...'), create a real booking
      const needsCreate = !bookingId || (typeof bookingId === 'string' && !/^\d+$/.test(String(bookingId)))
      if (needsCreate) {
        const createResp = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fieldId: tempBooking.fieldId,
            bookingDate: tempBooking.bookingDate,
            timeSlots: tempBooking.timeSlots,
            totalPrice: tempBooking.finalPrice || tempBooking.totalPrice,
            userId: user?.id ?? null,
            promotionId: tempBooking.appliedPromotion?.id ?? null,
            status: 'pending'
          }),
        })
        const createData = await createResp.json()
        if (!createResp.ok) {
          setError(`ไม่สามารถสร้างการจอง: ${createData.error || 'Unknown error'}`)
          setUploading(false)
          return
        }
        bookingId = createData.data?.id ?? createData.data?.booking_id ?? createData.data?.id
        if (!bookingId) {
          setError('การตอบกลับจากเซิร์ฟเวอร์ไม่รวม id การจอง')
          setUploading(false)
          return
        }
        // persist booking id for subsequent steps
        const updated = { ...tempBooking, id: bookingId }
        setTempBooking(updated)
        sessionStorage.setItem('tempBooking', JSON.stringify(updated))
      }

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${timestamp}_${slipFile.name}`
      const filepath = `payment-slips/${filename}`

      // Upload slip to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-slips')
        .upload(filepath, slipFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading slip:', uploadError)
        setError(`เกิดข้อผิดพลาดในการอัพโหลด: ${uploadError.message}`)
        setUploading(false)
        return
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('payment-slips')
        .getPublicUrl(filepath)

      const slipUrl = publicUrlData?.publicUrl

      // Save payment record to database via API route
      const apiResp = await fetch('/api/payment/upload-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          slipUrl: slipUrl,
          amount: tempBooking.finalPrice || tempBooking.totalPrice,
          paymentMethod: 'promptpay',
        }),
      })

      const apiData = await apiResp.json()

      if (!apiResp.ok) {
        console.error('Error saving payment record:', apiData)
        setError(`เกิดข้อผิดพลาด: ${apiData.error || 'Unknown error'}`)
        console.log('Booking ID sent:', bookingId)
        console.log('Full error response:', apiData)
        setUploading(false)
        return
      }

      // After payment saved, mark booking as paid
      try {
        await fetch('/api/admin/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_payment_status', bookingId, payment_status: 'paid' }),
        })
      } catch (err) {
        console.error('Failed to mark booking paid:', err)
      }

      // Clear session storage and show success
      sessionStorage.removeItem('tempBooking')
      setSuccess(true)

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/bookings'
      }, 2000)
    } catch (e) {
      console.error('Unexpected error:', e)
      setError('เกิดข้อผิดพลาดที่ไม่คาดคิด')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </main>
    )
  }

    if (!tempBooking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        {/* Navbar removed on this page to avoid duplicate header */}
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ข้อมูลการจองไม่สมบูรณ์</h1>
          <p className="text-gray-600 mb-6">กรุณากลับไปแล้วลองใหม่อีกครั้ง</p>
          <Link href="/reservation">
            <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
              กลับไปหน้าการจอง
            </button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Navbar removed on this page to avoid duplicate header */}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <Link href="/reservation/payment-option">
          <button className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium mb-8">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับไป
          </button>
        </Link>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">ชำระเงินผ่าน PromptPay</h1>
            <p className="text-lg text-gray-600">สแกน QR Code และแนบสลิปการโอนเงิน</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-800">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 text-green-800">
              บันทึกการชำระเงินสำเร็จ กำลังนำไปยังหน้ารายการจอง...
            </div>
          )}

          {/* Booking Summary */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-red-600">
            <h3 className="text-xl font-bold text-gray-900 mb-4">สรุปการจอง</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">สนาม:</span>
                <span className="font-semibold text-gray-900">{tempBooking.fieldName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">วันที่:</span>
                <span className="font-semibold text-gray-900">{tempBooking.bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">เวลา:</span>
                <span className="font-semibold text-gray-900">{tempBooking.timeSlots.join(", ")}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">ราคารวม:</span>
                  <span className="font-semibold text-gray-900">{tempBooking.totalPrice.toLocaleString()} บาท</span>
                </div>
                {tempBooking.discountAmount && tempBooking.discountAmount > 0 && (
                  <div className="flex justify-between mb-2 text-red-600">
                    <span>ส่วนลด ({tempBooking.appliedPromotion?.name}):</span>
                    <span className="font-semibold">-{tempBooking.discountAmount.toLocaleString()} บาท</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-green-600 bg-green-50 p-2 rounded">
                  <span>รวมทั้งสิ้น:</span>
                  <span>{(tempBooking.finalPrice || tempBooking.totalPrice).toLocaleString()} บาท</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-8 text-center border-2 border-dashed border-gray-300">
            <h3 className="text-xl font-bold text-gray-900 mb-6">QR Code PromptPay</h3>
            <div className="flex justify-center mb-6">
              <img
                src="/assets/images/QR_TEST.jpg"
                alt="PromptPay QR Code"
                className="w-48 h-90 border-2 border-gray-300 rounded-lg shadow-md"
              />
            </div>
            <p className="text-gray-600 text-sm">
              สแกน QR Code นี้ด้วยแอปธนาคารของคุณ และทำการโอนเงิน
            </p>
          </div>

          {/* Upload Slip Section */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">แนบสลิปการโอนเงิน</h3>
            
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-400 transition-colors mb-6">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSlipSelect(e.target.files?.[0] || null)}
                disabled={uploading}
                className="hidden"
                id="slip-upload"
              />
              <label
                htmlFor="slip-upload"
                className="cursor-pointer block"
              >
                <div className="text-4xl mb-3">📎</div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {slipFile ? slipFile.name : "เลือกไฟล์สลิป"}
                </p>
                <p className="text-sm text-gray-600">
                  คลิกเพื่อเลือกไฟล์หรือลากไฟล์มาวาง (JPG, PNG)
                </p>
              </label>
            </div>

            {/* File Info */}
            {slipFile && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-6">
                <p className="text-green-800">
                  ✓ เลือกไฟล์: <span className="font-semibold">{slipFile.name}</span>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  ขนาด: {(slipFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            {/* Preview */}
            {slipPreview && (
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-600 mb-2">ตัวอย่างรูปภาพ</p>
                <img
                  src={slipPreview}
                  alt="Slip preview"
                  className="max-h-64 mx-auto rounded-lg border border-gray-300 shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={uploadSlip}
              disabled={!slipFile || uploading}
              className={`
                flex-1 py-4 px-6 rounded-xl font-bold text-white transition-all text-lg
                ${
                  slipFile && !uploading
                    ? "bg-red-600 hover:bg-red-700 cursor-pointer shadow-lg hover:shadow-xl"
                    : "bg-gray-400 cursor-not-allowed opacity-50"
                }
              `}
            >
              {uploading ? "กำลังอัพโหลด..." : "ยืนยันการชำระเงิน"}
            </button>
            <Link href="/reservation/payment-option" className="flex-1">
              <button className="w-full py-4 px-6 rounded-xl font-bold text-gray-700 border-2 border-gray-300 hover:border-gray-400 transition-all text-lg">
                ยกเลิก
              </button>
            </Link>
          </div>

          {/* Info Box */}
          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex gap-4">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h4 className="font-bold text-blue-900 mb-2">ข้อมูลการชำระเงิน</h4>
                <ul className="text-blue-800 text-sm space-y-2">
                  <li>• สแกน QR Code ด้วยแอปธนาคารของคุณ</li>
                  <li>• ใส่จำนวนเงิน {(tempBooking.finalPrice || tempBooking.totalPrice).toLocaleString()} บาท</li>
                  <li>• ทำการโอนเงิน</li>
                  <li>• ถ่ายภาพหรือบันทึกสลิปการโอนเงิน</li>
                  <li>• แนบสลิปในฟอร์มด้านบน</li>
                  <li>• ทีมงานของเราจะตรวจสอบและยืนยันภายในวันเดียว</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
