"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PromotionInput } from "@/components/PromotionInput"
import { calculateFinalPrice, getPromotionDisplayText } from "@/lib/promotions"
import { resolveFieldImageUrl } from "@/lib/utils"
import { Promotion } from "@/types/supabase"

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  isBooked: boolean
  bookedBy?: string
}

export default function ReservationDetails({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0])
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null)
  const [promotionCodePending, setPromotionCodePending] = useState(false)
  const [field, setField] = useState<any | null>(null)
  const [imageUrl, setImageUrl] = useState<string>("/assets/images/stadium.jpg")
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Reset pending state when promotion is applied
  useEffect(() => {
    if (appliedPromotion) {
      setPromotionCodePending(false)
    }
  }, [appliedPromotion])

  // Load initial data (user + field) in parallel
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('Loading initial data for field:', params.id)
        const supabase = createClient()
        const idNum = Number(params.id)
        
        // Parallel loading of user and field data
        const [userResult, fieldResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("fields").select("*").eq("fields_id", idNum).maybeSingle()
        ])
        
        console.log('User result:', userResult.data.user?.id || 'no user')
        console.log('Field result:', fieldResult.data ? 'found' : 'not found', fieldResult.error)
        
        // Set user data
        setCurrentUser(userResult.data.user)
        
        // Set field data
        if (!fieldResult.error && fieldResult.data) {
          const data = fieldResult.data
          const normalizedLocation = data.location ?? data.Location ?? data.address ?? data.Address ?? ""
          const fieldWithLocation = { ...data, location: normalizedLocation }
          setField(fieldWithLocation)
          
          // Use cached image resolution
          const imageUrl = await resolveFieldImageUrl(supabase, fieldWithLocation)
          setImageUrl(imageUrl)
          console.log('Field data loaded successfully')
        } else {
          console.log('Field not found or error:', fieldResult.error)
          setField(null)
        }
      } catch (e) {
        console.error('Error loading initial data:', e)
        setField(null)
      }
    }
    
    loadInitialData()
  }, [params.id])

  const isAvailable = String((field as any)?.status ?? "available").toLowerCase() === "available"

  // Normalize numeric price for calculations and display
  const numericPricePerHour = (() => {
    const raw = field ? (field.price ?? field.pricePerHour ?? 0) : 0
    const cleaned = String(raw).replace(/[^0-9.-]+/g, "")
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  })()

  // Generate time slots from 13:00 to 00:00
  const generateTimeSlots = () => {
    const slots: TimeSlot[] = []

    for (let hour = 13; hour < 24; hour++) {
      const startHour = hour.toString().padStart(2, "0")
      const endHour = (hour + 1).toString().padStart(2, "0")
      
      slots.push({
        id: `slot-${hour}`,
        startTime: `${startHour}:00`,
        endTime: `${endHour === '24' ? '00:00' : endHour + ':00'}`,
        isBooked: false,
      })
    }

    return slots
  }

  // Optimized time slots loading
  useEffect(() => {
    const loadTimeSlots = async () => {
      try {
        const supabase = createClient()
        const slots = generateTimeSlots()
        
        // Normalize date
        const normalizedDate = bookingDate.includes("T") ? bookingDate.split("T")[0] : bookingDate
        
        // Get local booked slots
        const bookedSlots = localStorage.getItem("bookedSlots")
        const booked = bookedSlots ? JSON.parse(bookedSlots) : {}
        const fieldKey = `field_${params.id}_${normalizedDate}`
        const localBookedTimes = booked[fieldKey] || []
        
        // Get server booked slots with fallback
        let serverBookedTimes: string[] = []
        
        try {
          // Try availability API first
          const response = await fetch(`/api/availability?fieldId=${params.id}&date=${normalizedDate}`)
          if (response.ok) {
            const data = await response.json()
            serverBookedTimes = data.bookedSlots || []
          } else {
            throw new Error('API failed')
          }
        } catch (e) {
          // Simplified fallback - only query specific field bookings
          const idNum = Number(params.id)
          const { data: bookingsData } = await supabase
            .from("bookings")
            .select("timeSlots, start_time, end_time")
            .eq("field_id", idNum)
            .eq("booking_date", normalizedDate)
            .in('status', ['pending', 'approved', 'confirmed'])
          
          if (bookingsData) {
            for (const booking of bookingsData) {
              if (Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0) {
                serverBookedTimes.push(...booking.timeSlots)
              }
            }
          }
        }
        
        // Mark booked slots
        const allBookedTimes = new Set([...localBookedTimes, ...serverBookedTimes])
        const updatedSlots = slots.map(slot => {
          const slotTimeRange = `${slot.startTime} - ${slot.endTime}`
          return allBookedTimes.has(slotTimeRange) ? { ...slot, isBooked: true } : slot
        })
        
        setTimeSlots(updatedSlots)
      } catch (error) {
        console.error('Error loading time slots:', error)
        // Set empty slots on error
        setTimeSlots(generateTimeSlots())
      } finally {
        setLoading(false)
      }
    }
    
    loadTimeSlots()
  }, [bookingDate, params.id])

  // Set mounted state after initial load
  useEffect(() => {
    setMounted(true)
  }, [])

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

    // Create temporary booking data using the selected bookingDate and selectedSlots
    const bookingDateSelected = String(bookingDate)
    // preserve chronological order of selected slots
    const orderedSlots = timeSlots
      .filter((s) => selectedSlots.includes(s.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    const timeSlotTexts = orderedSlots.map((slot) => `${slot.startTime} - ${slot.endTime}`)

    const basePrice = selectedSlots.length * numericPricePerHour
    const finalPrice = calculateFinalPrice(basePrice, appliedPromotion)
    const discountAmount = basePrice - finalPrice

    try {
      // Get current user
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Create the booking immediately to block the time slots
      const createResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fieldId: params.id,
          bookingDate: bookingDateSelected,
          timeSlots: timeSlotTexts,
          totalPrice: finalPrice,
          userId: user?.id || null, // Use actual user ID
          promotionId: appliedPromotion?.id ?? null,
          status: 'pending'
        }),
      })

      const createData = await createResponse.json()
      
      if (!createResponse.ok) {
        alert(`ไม่สามารถสร้างการจอง: ${createData.error || 'Unknown error'}`)
        return
      }

      const bookingId = createData.data?.id
      
      if (!bookingId) {
        alert('เกิดข้อผิดพลาดในการสร้างการจอง: ไม่พบ ID การจอง')
        return
      }

      console.log('Booking created successfully:', bookingId)

      // Notify other tabs to refresh availability
      window.dispatchEvent(new Event('bookingUpdated'))

      const tempBooking = {
        id: bookingId, // Use real booking ID
        fieldId: params.id,
        fieldName: field?.name || "Unknown Field",
        bookingDate: bookingDateSelected,
        timeSlots: timeSlotTexts,
        totalPrice: basePrice,
        finalPrice: finalPrice,
        discountAmount: discountAmount,
        appliedPromotion: appliedPromotion,
        status: "pending" as const,
        createdAt: new Date().toLocaleString("th-TH"),
      }

      // Save to session storage temporarily
      sessionStorage.setItem("tempBooking", JSON.stringify(tempBooking))

      // Navigate to payment option page
      router.push("/reservation/payment-option")

    } catch (error) {
      console.error('Error creating booking:', error)
      alert('เกิดข้อผิดพลาดในการสร้างการจอง กรุณาลองใหม่')
    }
  }

  if (!field) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบข้อมูลสนาม (ID: {params.id})</h1>
          <p className="text-gray-600 mb-6">ขออภัย ไม่สามารถหาข้อมูลสนามที่คุณขอได้</p>
          <Link href="/">
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">
              กลับไปหน้าแรก
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="bg-gray-50 py-12 min-h-screen">
          <div className="container mx-auto px-4">
            {/* Back Button Skeleton */}
            <div className="w-24 h-8 bg-gray-200 rounded mb-6 animate-pulse"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stadium Details Skeleton */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Stadium Image Skeleton */}
                  <div className="h-64 bg-gray-200 animate-pulse"></div>
                  
                  {/* Stadium Info Skeleton */}
                  <div className="p-6">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-6">
                      <div className="h-6 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Section Skeleton */}
              <div>
                <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                  
                  {/* Date Picker Skeleton */}
                  <div className="mb-6">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  
                  {/* Time Slots Skeleton */}
                  <div className="mb-6">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Price Summary Skeleton */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between">
                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                        <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Button Skeleton */}
                  <div className="mt-6 h-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="bg-gray-50 py-12 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link href={`/fields/${params.id}`}>
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
                    src={imageUrl}
                    alt={field?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold">
                    {field?.name}
                  </div>
                </div>

                {/* Stadium Info */}
                <div className="p-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{field.name}</h1>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm text-gray-600">สถานที่ตั้ง</p>
                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {field.location}
                        </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ประเภท</p>
                      <p className="font-semibold text-gray-900">{field?.type || "-"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">อัตราราคา</p>
                        <p className="font-semibold text-gray-900">{field.price ?? field.pricePerHour ?? '-'} บาท/ชั่วโมง</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ขนาด</p>
                      <p className="font-semibold text-gray-900">{field.size}</p>
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

                {!isAvailable && (
                  <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
                    สถานะสนาม: {(field as any).status || "unavailable"} — ไม่สามารถจองได้ในขณะนี้
                  </div>
                )}

                {/* Date Picker */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    วันที่ต้องการจอง
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
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
                        disabled={slot.isBooked || !isAvailable}
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
                    <span className="font-semibold text-gray-900">{numericPricePerHour.toLocaleString()} บาท</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-700">จำนวนชั่วโมง:</span>
                    <span className="font-semibold text-gray-900">{selectedSlots.length}</span>
                  </div>

                  {/* Promotion Input */}
                  <PromotionInput 
                    onApplyPromotion={setAppliedPromotion}
                    appliedPromotion={appliedPromotion}
                    userId={currentUser?.id}
                    onCodeChange={(hasCode) => {
                      setPromotionCodePending(hasCode)
                    }}
                  />

                  {/* Discount and Price Display */}
                  {(() => {
                    const basePrice = selectedSlots.length * numericPricePerHour
                    const finalPrice = calculateFinalPrice(basePrice, appliedPromotion)
                    const discountAmount = basePrice - finalPrice
                    return (
                      <>
                        {appliedPromotion && discountAmount > 0 && (
                          <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4">
                            <div className="flex justify-between items-center">
                              <span className="text-red-700 font-semibold">ส่วนลด ({getPromotionDisplayText(appliedPromotion)}):</span>
                              <span className="text-red-700 font-bold">-{discountAmount.toLocaleString()} บาท</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
                          <span>รวมทั้งสิ้น:</span>
                          <span className={`${appliedPromotion && discountAmount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {finalPrice.toLocaleString()} บาท
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Booking Button */}
                <button
                  onClick={handleBooking}
                  disabled={selectedSlots.length === 0 || !isAvailable || promotionCodePending}
                  className={`
                    w-full py-3 px-4 rounded-lg font-bold text-white transition-all
                    ${
                      selectedSlots.length === 0 || !isAvailable || promotionCodePending
                        ? "bg-gray-400 cursor-not-allowed opacity-50"
                        : "bg-green-600 hover:bg-green-700 cursor-pointer shadow-lg hover:shadow-xl"
                    }
                  `}
                >
                  {selectedSlots.length === 0 
                    ? "เลือกเวลาก่อน" 
                    : promotionCodePending 
                    ? "กรุณาใช้รหัสส่วนลดก่อน" 
                    : (!isAvailable ? "ไม่สามารถจองได้" : "ยืนยันการจอง")
                  }
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
