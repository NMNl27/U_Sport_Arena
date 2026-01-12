"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

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
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [tempBooking, setTempBooking] = useState<TempBooking | null>(null)

  useEffect(() => {
    // Load booking data from session storage
    const booking = sessionStorage.getItem("tempBooking")
    if (booking) {
      setTempBooking(JSON.parse(booking))
    }
  }, [])

  const handlePaymentSelect = (method: string) => {
    setSelectedPayment(method)
  }

  const handleConfirmPayment = () => {
    if (selectedPayment === "direct") {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-red-600">
              U-Sport
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Find sports, venues..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-600"
              />
              <svg
                className="absolute right-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 ml-auto">
            <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-red-600 font-medium">
              <span>🏠</span> Home
            </Link>
            <Link href="/bookings" className="flex items-center gap-2 text-gray-700 hover:text-red-600 font-medium">
              <span>📅</span> My Bookings
            </Link>
            <Link href="/profile" className="flex items-center gap-2 text-gray-700 hover:text-red-600 font-medium">
              <span>👤</span> Profile
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <Link href="/reservation">
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
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                    PromptPay
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

            {/* Mobile Banking */}
            <div
              onClick={() => handlePaymentSelect("mobile")}
              className={`
                p-6 border-2 rounded-xl cursor-pointer transition-all transform
                ${
                  selectedPayment === "mobile"
                    ? "border-red-600 bg-red-50 shadow-lg scale-105"
                    : "border-gray-200 bg-white hover:border-red-400"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-2xl">
                    📱
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Mobile Banking</h3>
                    <p className="text-gray-600 text-sm">ชำระผ่านแอปธนาคารมือถือ</p>
                  </div>
                </div>
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      selectedPayment === "mobile"
                        ? "border-red-600 bg-red-600"
                        : "border-gray-300"
                    }
                  `}
                >
                  {selectedPayment === "mobile" && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Payment */}
            <div
              onClick={() => handlePaymentSelect("direct")}
              className={`
                p-6 border-2 rounded-xl cursor-pointer transition-all transform
                ${
                  selectedPayment === "direct"
                    ? "border-red-600 bg-red-50 shadow-lg scale-105"
                    : "border-gray-200 bg-white hover:border-red-400"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-2xl">
                    💳
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">ชำระเงินกับพนักงาน</h3>
                    <p className="text-gray-600 text-sm">ชำระเงินกับพนักงานโดยตรง ณ สถานที่</p>
                  </div>
                </div>
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      selectedPayment === "direct"
                        ? "border-red-600 bg-red-600"
                        : "border-gray-300"
                    }
                  `}
                >
                  {selectedPayment === "direct" && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
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
                  หากคุณเลือกวิธีการชำระเงินแบบ PromptPay หรือ Mobile Banking คุณจะได้รับรหัส QR Code สำหรับการชำระเงิน หากเลือกชำระเงินกับพนักงาน คุณสามารถชำระเงินที่สนาม
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-3">จองสำเร็จ!</h2>
              <p className="text-gray-600 mb-6 text-lg">
                การจองสนามของคุณได้ยืนยันแล้ว เราจะติดต่อคุณเพื่อยืนยันรายละเอียดการชำระเงินในไม่ช้า
              </p>

              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">เลขที่การจอง:</span>
                    <span className="font-bold text-gray-900">#USP-12345678</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">สถานะ:</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                      รอการชำระเงิน
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">วิธีชำระเงิน:</span>
                    <span className="font-bold text-gray-900">ชำระเงินกับพนักงาน</span>
                  </div>
                </div>
              </div>

              <Link href="/bookings" className="w-full">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                  ดูรายการจองของฉัน
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
