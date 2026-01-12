"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ProtectedRoute from "@/components/ProtectedRoute"
import { mockFields } from "@/lib/mockData"

interface Booking {
  id: string
  fieldId: string
  fieldName: string
  bookingDate: string
  timeSlots: string[]
  totalPrice: number
  status: "confirmed" | "pending" | "cancelled"
  createdAt: string
}

function BookingsContent() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "pending" | "cancelled">("all")

  useEffect(() => {
    // Load bookings from localStorage
    const loadBookings = () => {
      const savedBookings = localStorage.getItem("userBookings")
      if (savedBookings) {
        setBookings(JSON.parse(savedBookings))
      }
      setLoading(false)
    }

    loadBookings()

    // Listen for storage changes (real-time update)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userBookings") {
        const updatedBookings = e.newValue ? JSON.parse(e.newValue) : []
        setBookings(updatedBookings)
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Also listen for custom events from same tab
    const handleCustomUpdate = () => {
      const savedBookings = localStorage.getItem("userBookings")
      if (savedBookings) {
        setBookings(JSON.parse(savedBookings))
      }
    }

    window.addEventListener("bookingUpdated", handleCustomUpdate)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("bookingUpdated", handleCustomUpdate)
    }
  }, [])

  const mockBookings: Booking[] = []

  const filteredBookings = filterStatus === "all" 
    ? bookings 
    : bookings.filter((booking) => booking.status === filterStatus)

  const handleCancelBooking = (bookingId: string) => {
    if (confirm("คุณแน่ใจว่าต้องการยกเลิกการจองนี้?")) {
      // Find the booking to get fieldId and date
      const bookingToCancel = bookings.find((b) => b.id === bookingId)
      
      if (bookingToCancel) {
        // Remove booked time slots from localStorage
        const bookedSlots = localStorage.getItem("bookedSlots")
        const booked = bookedSlots ? JSON.parse(bookedSlots) : {}
        
        // Normalize date format (YYYY-MM-DD)
        let bookingDateStr = String(bookingToCancel.bookingDate)
        // If it looks like "2025-12-15T00:00:00" or similar, extract just the date part
        if (bookingDateStr.includes("T")) {
          bookingDateStr = bookingDateStr.split("T")[0]
        }
        
        const fieldKey = `field_${bookingToCancel.fieldId}_${bookingDateStr}`
        
        if (booked[fieldKey]) {
          // Remove the cancelled time slots
          booked[fieldKey] = booked[fieldKey].filter(
            (slot: string) => !bookingToCancel.timeSlots.includes(slot)
          )
          
          // If no slots left, delete the key
          if (booked[fieldKey].length === 0) {
            delete booked[fieldKey]
          }
        }
        
        localStorage.setItem("bookedSlots", JSON.stringify(booked))
      }
      
      // Remove booking from state
      const updatedBookings = bookings.filter((booking) => booking.id !== bookingId)
      setBookings(updatedBookings)
      
      // Update localStorage
      localStorage.setItem("userBookings", JSON.stringify(updatedBookings))
      
      // Trigger storage event with detail to notify other components
      const event = new StorageEvent("storage", {
        key: "bookedSlots",
        newValue: localStorage.getItem("bookedSlots"),
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
      window.dispatchEvent(new Event("bookingUpdated"))
    }
  }

  const displayBookings = bookings.length > 0 ? bookings : mockBookings

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ประวัติการจอง</h1>
          <p className="text-gray-600">ดูรายการจองสนามทั้งหมดของคุณ</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button 
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === "all" 
                ? "bg-red-600 text-white" 
                : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
            }`}
          >
            ทั้งหมด
          </button>
          <button 
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === "pending" 
                ? "bg-yellow-600 text-white" 
                : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
            }`}
          >
            กำลังรอ
          </button>
          <button 
            onClick={() => setFilterStatus("confirmed")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === "confirmed" 
                ? "bg-green-600 text-white" 
                : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
            }`}
          >
            ยืนยันแล้ว
          </button>
          <button 
            onClick={() => setFilterStatus("cancelled")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === "cancelled" 
                ? "bg-red-600 text-white" 
                : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
            }`}
          >
            ยกเลิกแล้ว
          </button>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        ) : displayBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {filterStatus === "all" ? "ยังไม่มีการจองใดๆ" : "ไม่พบการจองที่มีสถานะนี้"}
            </h2>
            <p className="text-gray-600 mb-6">
              {filterStatus === "all" ? "เริ่มจองสนามของคุณเลย!" : "ลองเปลี่ยนตัวกรองการค้นหา"}
            </p>
            <Link href="/">
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-all">
                ไปยังหน้าหลัก
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className={`bg-white rounded-lg shadow-md border-l-4 overflow-hidden hover:shadow-lg transition-all ${
                  booking.status === "confirmed"
                    ? "border-green-500"
                    : booking.status === "pending"
                    ? "border-yellow-500"
                    : "border-red-500"
                }`}
              >
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Booking Info */}
                    <div className="md:col-span-3">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{booking.fieldName}</h3>
                          <p className="text-sm text-gray-600 mt-1">เลขที่การจอง: {booking.id}</p>
                        </div>
                        <div
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {booking.status === "confirmed"
                            ? "✓ ยืนยันแล้ว"
                            : booking.status === "pending"
                            ? "⏳ รอการยืนยัน"
                            : "✕ ยกเลิกแล้ว"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">วันที่จอง</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(booking.bookingDate).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">เวลา</p>
                          <p className="font-semibold text-gray-900">{booking.timeSlots.length} ช่วง</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">ช่วงเวลาที่จอง</p>
                        <div className="flex flex-wrap gap-2">
                          {booking.timeSlots.map((time, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        สร้างเมื่อ {booking.createdAt}
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="md:col-span-2 flex flex-col justify-between">
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-1">ราคาทั้งสิ้น</p>
                        <p className="text-3xl font-bold text-red-600">{booking.totalPrice}</p>
                        <p className="text-xs text-gray-600">บาท</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/fields/${booking.fieldId}`}>
                          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all">
                            ดูรายละเอียด
                          </button>
                        </Link>
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-bold py-2 px-4 rounded-lg transition-all"
                        >
                          ยกเลิกการจอง
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Link href="/">
            <button className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              กลับไปหน้าแรก
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function BookingsPage() {
  return (
    <ProtectedRoute>
      <BookingsContent />
    </ProtectedRoute>
  )
}

