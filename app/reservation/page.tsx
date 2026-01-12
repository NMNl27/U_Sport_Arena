"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PromotionInput } from "@/components/PromotionInput"
import { calculateFinalPrice, getPromotionDisplayText } from "@/lib/promotions"
import { Promotion } from "@/types/supabase"

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  isBooked: boolean
  bookedBy?: string
}

export default function ReservationDetails() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null)

  const PRICE_PER_HOUR = 1000
  const generateTimeSlots = () => {
    const slots: TimeSlot[] = []

    for (let hour = 13; hour < 24; hour++) {
      const startHour = hour.toString().padStart(2, "0")
      const endHour = (hour + 1).toString().padStart(2, "0")
      
      slots.push({
        id: `slot-${hour}`,
        startTime: `${startHour}:00`,
        endTime: `${endHour}:00`,
        isBooked: false,
      })
    }

    // Add 00:00 slot (midnight)
    slots.push({
      id: `slot-23`,
      startTime: "23:00",
      endTime: "00:00",
      isBooked: false,
    })

    return slots
  }

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    const slots = generateTimeSlots()
    setTimeSlots(slots)
    setLoading(false)

    // Subscribe to real-time booking changes
    const channel = supabase
      .channel("bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload: any) => {
          // Update time slots when a booking is made
          setTimeSlots((prevSlots) =>
            prevSlots.map((slot) =>
              payload.new?.time_slot === slot.id
                ? { ...slot, isBooked: true, bookedBy: payload.new?.user_id }
                : slot
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mounted])

  const toggleSlot = (slotId: string) => {
    if (timeSlots.find((s) => s.id === slotId)?.isBooked) return

    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    )
  }

  const handleBooking = async () => {
    if (selectedSlots.length === 0) {
      alert("กรุณาเลือกเวลาจองอย่างน้อย 1 ช่วง")
      return
    }

    try {
      const supabase = createClient()
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        alert("กรุณาเข้าสู่ระบบก่อน")
        return
      }

      // Save booking to database
      for (const slotId of selectedSlots) {
        await supabase.from("bookings").insert({
          field_id: "stadium-1",
          user_id: session.session.user.id,
          time_slot: slotId,
          booking_date: new Date().toISOString().split("T")[0],
          promotion_id: appliedPromotion?.id || null,
        })
      }

      alert("จองสนามสำเร็จ!")
      setSelectedSlots([])
      setAppliedPromotion(null)
    } catch (error) {
      console.error("Error booking:", error)
      alert("เกิดข้อผิดพลาดในการจอง")
    }
  }

  const basePrice = selectedSlots.length * PRICE_PER_HOUR
  const finalPrice = calculateFinalPrice(basePrice, appliedPromotion)
  const discountAmount = basePrice - finalPrice

  if (!mounted || loading) {
    return <div className="flex items-center justify-center h-screen text-lg font-semibold">กำลังโหลด...</div>
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="bg-gray-50 py-12 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link href="/">
            <button className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium mb-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              กลับไป
            </button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stadium Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Stadium Image */}
                <div className="relative h-64 bg-gray-200">
                  <img
                    src="/assets/images/stadium.jpg"
                    alt="Stadium 1"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold">
                    Stadium 1 (VIP)
                  </div>
                </div>

                {/* Stadium Info */}
                <div className="p-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">Stadium 1 (VIP)</h1>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">สถานที่ตั้ง</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Khlong 6, Pathum Thani
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ประเภท</p>
                      <p className="font-semibold text-gray-900">Football</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">อัตราราคา</p>
                      <p className="font-semibold text-gray-900">1,000 บาท/ชั่วโมง</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">คะแนน</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">4.6</span>
                        (1 reviews)
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">สิ่งอำนวยความสะดวก</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        </svg>
                        <span>ที่จอดรถ</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Wi-Fi</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        <span>สถานีบริการ</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000-2 4 4 0 00-4 4v10a4 4 0 004 4h12a4 4 0 004-4V5a4 4 0 00-4-4 1 1 0 000 2 2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                        </svg>
                        <span>ห้องน้ำ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Section */}
            <div>
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">เลือกเวลาจอง</h3>

                {/* Date Picker */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    วันที่ต้องการจอง
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Time Slots */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    เลือกเวลา
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => toggleSlot(slot.id)}
                        disabled={slot.isBooked}
                        className={`
                          p-3 rounded-lg font-semibold transition-all text-sm
                          ${
                            slot.isBooked
                              ? "bg-red-500 text-white cursor-not-allowed opacity-60"
                              : selectedSlots.includes(slot.id)
                              ? "bg-green-600 text-white shadow-lg transform scale-105"
                              : "bg-green-400 text-white hover:bg-green-500 cursor-pointer"
                          }
                        `}
                      >
                        {slot.startTime} - {slot.endTime}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">คำอธิบาย:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-400 rounded"></div>
                      <span className="text-xs text-gray-700">ว่าง</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-xs text-gray-700">เต็มแล้ว</span>
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">ราคาต่อชั่วโมง:</span>
                    <span className="font-semibold text-gray-900">{PRICE_PER_HOUR.toLocaleString()} บาท</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-700">จำนวนชั่วโมง:</span>
                    <span className="font-semibold text-gray-900">{selectedSlots.length}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 font-semibold">
                    <span>ราคารวม:</span>
                    <span className="text-gray-900">{basePrice.toLocaleString()} บาท</span>
                  </div>

                  {/* Promotion Input */}
                  <PromotionInput 
                    onApplyPromotion={setAppliedPromotion}
                    appliedPromotion={appliedPromotion}
                  />

                  {/* Discount Display */}
                  {appliedPromotion && discountAmount > 0 && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-red-700 font-semibold">ส่วนลด ({getPromotionDisplayText(appliedPromotion)}):</span>
                        <span className="text-red-700 font-bold">-{discountAmount.toLocaleString()} บาท</span>
                      </div>
                    </div>
                  )}

                  {/* Final Price */}
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
                    <span>รวมทั้งสิ้น:</span>
                    <span className={`${appliedPromotion && discountAmount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {finalPrice.toLocaleString()} บาท
                    </span>
                  </div>
                </div>

                {/* Booking Button */}
                <button
                  onClick={handleBooking}
                  disabled={selectedSlots.length === 0}
                  className={`
                    w-full py-3 px-4 rounded-lg font-bold text-white transition-all
                    ${
                      selectedSlots.length === 0
                        ? "bg-gray-400 cursor-not-allowed opacity-50"
                        : "bg-green-600 hover:bg-green-700 cursor-pointer shadow-lg hover:shadow-xl"
                    }
                  `}
                >
                  {selectedSlots.length === 0 ? "เลือกเวลาก่อน" : "ยืนยันการจอง"}
                </button>

                <button className="w-full mt-3 py-3 px-4 rounded-lg font-bold text-gray-700 border-2 border-gray-300 hover:border-gray-400 transition-all">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
