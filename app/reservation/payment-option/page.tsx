"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

export default function PaymentOption() {
  const router = useRouter()
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [tempBooking, setTempBooking] = useState<TempBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load booking data from session storage
    try {
      const booking = sessionStorage.getItem("tempBooking")
      if (booking) {
        const parsedBooking = JSON.parse(booking)
        setTempBooking(parsedBooking)
        console.log('Booking loaded:', parsedBooking)
      } else {
        setError('ไม่พบข้อมูลการจอง กรุณาทำการจองใหม่')
      }
    } catch (e) {
      console.error('Error loading booking:', e)
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง')
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePaymentSelect = (method: string) => {
    setSelectedPayment(method)
  }

  const handleConfirmPayment = () => {
    if (selectedPayment === "promptpay") {
      // Use Next.js router for better navigation
      router.push("/reservation/payment")
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            {/* Back Button Skeleton */}
            <div className="w-24 h-8 bg-gray-200 rounded mb-8 animate-pulse"></div>
            
            {/* Header Skeleton */}
            <div className="text-center mb-12">
              <div className="h-10 bg-gray-200 rounded w-64 mx-auto mb-3 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
            </div>
            
            {/* Booking Summary Skeleton */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-red-600">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Payment Method Skeleton */}
            <div className="p-6 border-2 rounded-xl mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                  </div>
                </div>
                <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            {/* Button Skeleton */}
            <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </main>
    )
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-900 mb-4">เกิดข้อผิดพลาด</h2>
              <p className="text-red-700 mb-6">{error}</p>
              <div className="space-y-3">
                <Link href="/reservation" className="block">
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                    กลับไปทำการจองใหม่
                  </button>
                </Link>
                <Link href="/" className="block">
                  <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg transition-all">
                    กลับหน้าแรก
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // No booking data
  if (!tempBooking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-yellow-900 mb-4">ไม่พบข้อมูลการจอง</h2>
              <p className="text-yellow-700 mb-6">ไม่พบข้อมูลการจองในระบบ กรุณาทำการจองใหม่</p>
              <div className="space-y-3">
                <Link href="/reservation" className="block">
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                    ทำการจองใหม่
                  </button>
                </Link>
                <Link href="/" className="block">
                  <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg transition-all">
                    กลับหน้าแรก
                  </button>
                </Link>
              </div>
            </div>
          </div>
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
        <Link href={`/reservation/${tempBooking?.fieldId || ''}`}>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-3">เลือกวิธีชำระเงิน</h1>
            <p className="text-lg text-gray-600">เลือกวิธีการชำระเงินที่สะดวกสำหรับคุณ</p>
          </div>

          {/* Booking Summary */}
          {tempBooking && (
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
          )}

          {/* Payment Methods */}
          <div className="space-y-4 mb-8">
            {/* Prompt Pay */}
            <div
              onClick={() => handlePaymentSelect("promptpay")}
              className={`
                p-6 border-2 rounded-xl cursor-pointer transition-all transform
                ${
                  selectedPayment === "promptpay"
                    ? "border-red-600 bg-red-50 shadow-lg scale-105"
                    : "border-gray-200 bg-white hover:border-red-400"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm12 4c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-9 8c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1H6v-1z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">PromptPay</h3>
                    <p className="text-gray-600 text-sm">ชำระผ่านแอปพลิเคชันธนาคาร</p>
                  </div>
                </div>
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      selectedPayment === "promptpay"
                        ? "border-red-600 bg-red-600"
                        : "border-gray-300"
                    }
                  `}
                >
                  {selectedPayment === "promptpay" && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* (Removed direct/staff payment option) */}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleConfirmPayment}
              disabled={!selectedPayment}
              className={`
                flex-1 py-4 px-6 rounded-xl font-bold text-white transition-all text-lg
                ${
                  selectedPayment
                    ? "bg-red-600 hover:bg-red-700 cursor-pointer shadow-lg hover:shadow-xl"
                    : "bg-gray-400 cursor-not-allowed opacity-50"
                }
              `}
            >
              ยืนยันการชำระเงิน
            </button>
            <Link href="/reservation" className="flex-1">
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
                <p className="text-blue-800 text-sm">
                  หากคุณเลือกวิธีการชำระเงินแบบ PromptPay คุณจะได้รับรหัส QR Code สำหรับการชำระเงิน
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </main>
  )
}
