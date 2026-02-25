"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"

type Booking = any

function BookingsContent() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending" | "cancelled" | "request to cancel">("all")
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<any>(null)
  const { user } = useAuth()

  useEffect(() => {
    let isSubscribed = true
    
    const loadBookings = async () => {
      if (!isSubscribed) return
      try {
        if (user?.id) {
          const resp = await fetch(`/api/admin/bookings?userId=${encodeURIComponent(user.id)}`)
          const json = await resp.json().catch(() => ({}))
          if (resp.ok && json.data) {
            // Sort by created_at descending (newest first)
            const sorted = json.data.sort((a: any, b: any) => {
              const dateA = new Date(a.created_at || 0).getTime()
              const dateB = new Date(b.created_at || 0).getTime()
              return dateB - dateA
            })
            if (isSubscribed) setBookings(sorted)
          }
          else if (isSubscribed) setBookings([])
        } else {
          const saved = localStorage.getItem('userBookings')
          if (saved && isSubscribed) setBookings(JSON.parse(saved))
        }
      } catch (e) {
        console.error(e)
        if (isSubscribed) setBookings([])
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    loadBookings()

    let debounceTimer: NodeJS.Timeout | null = null
    const supabase = createClient()
    const channel = supabase
      .channel('realtime bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        // Debounce to prevent multiple rapid reloads
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          if (isSubscribed) loadBookings()
        }, 1000)
      })
      .subscribe()

    const onUpdate = () => {
      const saved = localStorage.getItem('userBookings')
      if (saved && isSubscribed) setBookings(JSON.parse(saved))
    }
    window.addEventListener('bookingUpdated', onUpdate)
    return () => {
      isSubscribed = false
      if (debounceTimer) clearTimeout(debounceTimer)
      window.removeEventListener('bookingUpdated', onUpdate)
      supabase.removeChannel(channel)
    }
  }, [user])

  const getStatuses = (b: any) => {
    try {
      const s1 = String(b.status ?? '').toLowerCase()
      const s2 = String(b.payment_status ?? '').toLowerCase()
      return Array.from(new Set([s1, s2].filter(Boolean)))
    } catch (e) {
      return [String(b.status ?? b.payment_status ?? '').toLowerCase()].filter(Boolean)
    }
  }

  const filtered = filterStatus === 'all'
    ? bookings
    : bookings.filter((b: any) => {
      const sList = getStatuses(b)
      if (filterStatus === 'cancelled') {
        // treat various cancel-related values as cancelled for UI filtering
        return sList.some((s) => ['cancelled', 'rejected', 'cancel', 'rejected_by_user', 'cancelled_by_user'].includes(s))
      }
      return sList.includes(String(filterStatus))
    })

  const requestCancel = async (booking: any) => {
    setBookingToCancel(booking)
    setShowCancelConfirm(true)
  }

  const confirmCancel = async () => {
    if (!bookingToCancel) return
    
    try {
      const bookingId = bookingToCancel.id ?? bookingToCancel.booking_id
      const resp = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', bookingId, status: 'request to cancel' }),
      })
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        alert('ไม่สามารถส่งคำขอยกเลิกได้')
        return
      }
      setBookings((prev) => prev.map((p: any) => ((p.id ?? p.booking_id) == bookingId ? { ...p, status: 'request to cancel' } : p)))
      try { localStorage.setItem('userBookings', JSON.stringify(bookings)) } catch {}
      window.dispatchEvent(new Event('bookingUpdated'))
      alert('ส่งคำขอยกเลิกแล้ว')
      setShowCancelConfirm(false)
      setBookingToCancel(null)
    } catch (e) {
      console.error(e)
      alert('เกิดข้อผิดพลาด')
    }
  }

  const cancelCancel = () => {
    setShowCancelConfirm(false)
    setBookingToCancel(null)
  }

  return (
    <>
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-red-600 mb-6 transition-colors"
          >
            ← กลับไป
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ประวัติการจอง</h1>
            <p className="text-gray-600">ดูรายการจองสนามทั้งหมดของคุณ</p>
          </div>

          <div className="mb-6 flex gap-3 flex-wrap">
            <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-lg ${filterStatus==='all'?'bg-red-600 text-white':'bg-white'}`}>
              ทั้งหมด
            </button>
            <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 rounded-lg ${filterStatus==='pending'?'bg-yellow-600 text-white':'bg-white'}`}>
              กำลังรอ
            </button>
            <button onClick={() => setFilterStatus('request to cancel')} className={`px-4 py-2 rounded-lg ${filterStatus==='request to cancel'?'bg-indigo-600 text-white':'bg-white'}`}>
              รอยกเลิก
            </button>
            <button onClick={() => setFilterStatus('approved')} className={`px-4 py-2 rounded-lg ${filterStatus==='approved'?'bg-green-600 text-white':'bg-white'}`}>
              อนุมัติ
            </button>
            <button onClick={() => setFilterStatus('cancelled')} className={`px-4 py-2 rounded-lg ${filterStatus==='cancelled'?'bg-red-600 text-white':'bg-white'}`}>
              ยกเลิกแล้ว
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12"><p className="text-gray-600">กำลังโหลดข้อมูล...</p></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{filterStatus==='all'?'ยังไม่มีการจองใดๆ':'ไม่พบการจองที่มีสถานะนี้'}</h2>
              <p className="text-gray-600 mb-6">{filterStatus==='all'?'เริ่มจองสนามของคุณเลย!':'ลองเปลี่ยนตัวกรอง'}</p>
              <Link href='/'><button className='bg-red-600 text-white px-6 py-2 rounded'>ไปยังหน้าหลัก</button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((booking: any) => {
                const fieldName = booking.field_name ?? booking.fieldName ?? booking.field?.name ?? 'สนาม'
                const bookingDate = booking.bookingDate ?? booking.booking_date ?? booking.start_time ?? null
                const bookingDateDisplay = bookingDate ? new Date(bookingDate).toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'}) : '-'

                // compute time slots: prefer explicit arrays, fall back to start_time/end_time
                let timeSlots = booking.timeSlots ?? booking.time_slots ?? booking.slots ?? []
                const startIso = booking.start_time ?? booking.startTime ?? booking.start
                const endIso = booking.end_time ?? booking.endTime ?? booking.end
                if ((!timeSlots || timeSlots.length === 0) && startIso && endIso) {
                  try {
                    const s = new Date(startIso)
                    const e = new Date(endIso)
                    const slots: string[] = []
                    let cur = new Date(s)
                    while (cur < e) {
                      const next = new Date(cur)
                      next.setMinutes(0)
                      next.setHours(cur.getHours() + 1)
                      const a = cur.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
                      const b = next.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
                      slots.push(`${a}-${b}`)
                      cur = next
                    }
                    timeSlots = slots
                  } catch (e) {
                    timeSlots = []
                  }
                }

                const totalPrice = booking.total_price ?? booking.totalPrice ?? booking.expected_price ?? booking.paid_amount ?? 0
                const statusRaw = booking.status ?? booking.payment_status ?? 'pending'
                const status = String(statusRaw).toLowerCase()

                return (
                  <div key={booking.id ?? booking.booking_id} className={`bg-white rounded-lg shadow-md border-l-4 ${
                    (status === 'confirmed' || status === 'approved' || status === 'approve') ? 'border-green-500' : status === 'pending' ? 'border-yellow-500' : status === 'request to cancel' ? 'border-indigo-500' : 'border-red-500'
                  }`}>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                      <div className="md:col-span-3">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{fieldName}</h3>
                            <p className="text-sm text-gray-600">เลขที่การจอง: {booking.id ?? booking.booking_id}</p>
                          </div>
                          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                            (status === 'confirmed' || status === 'approved' || status === 'approve') ? 'bg-green-100 text-green-800' : status === 'pending' ? 'bg-yellow-100 text-yellow-800' : status === 'request to cancel' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {status === 'confirmed' ? '✓ ยืนยันแล้ว'
                              : status === 'approved' || status === 'approve' ? 'ยืนยันแล้ว'
                              : status === 'pending' ? '⏳ รอการยืนยัน'
                              : status === 'request to cancel' ? 'รอยกเลิก'
                              : status === 'rejected' ? '✕ ไม่อนุมัติ'
                              : '✕ ยกเลิกแล้ว'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">วันที่จอง</p>
                            <p className="font-semibold">{bookingDateDisplay}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">เวลา</p>
                            <p className="font-semibold">{(timeSlots||[]).length} ช่วง</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">ช่วงเวลาที่จอง</p>
                          <div className="flex flex-wrap gap-2">
                            {(timeSlots||[]).map((t: any, i: number) => (<span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">{t}</span>))}
                          </div>
                        </div>

                      </div>

                      <div className="md:col-span-2 flex flex-col justify-between">
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-sm text-gray-600 mb-1">ราคาทั้งสิ้น</p>
                          <p className="text-3xl font-bold text-red-600">{Number(totalPrice).toLocaleString('th-TH')}</p>
                          <p className="text-xs text-gray-600">บาท</p>
                        </div>

                        <div className="flex flex-col gap-2">
                          {status === 'pending' ? (
                            <button onClick={() => requestCancel(booking)} className="w-full bg-red-100 text-red-600 py-2 rounded">ยกเลิกการจอง</button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && bookingToCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ยืนยันการยกเลิกการจอง</h3>
                <p className="text-sm text-gray-600">คุณแน่ใจว่าต้องการขอยกเลิกการจองนี้?</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">เลขที่การจอง:</span>
                  <span className="text-sm text-gray-900 font-semibold">{bookingToCancel.id ?? bookingToCancel.booking_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">สนาม:</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {bookingToCancel.field_name ?? bookingToCancel.fieldName ?? bookingToCancel.field?.name ?? 'สนาม'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">วันที่:</span>
                  <span className="text-sm text-gray-900">
                    {(() => {
                      const bookingDate = bookingToCancel.bookingDate ?? bookingToCancel.booking_date ?? bookingToCancel.start_time ?? null
                      return bookingDate ? new Date(bookingDate).toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'}) : '-'
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">ราคาทั้งสิ้น:</span>
                  <span className="text-sm text-red-600 font-bold">
                    {Number(bookingToCancel.total_price ?? bookingToCancel.totalPrice ?? bookingToCancel.expected_price ?? bookingToCancel.paid_amount ?? 0).toLocaleString('th-TH')} บาท
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>คำเตือน:</strong> การส่งคำขอยกเลิกจะต้องได้รับการอนุมัติจากผู้ดูแลระบบก่อน กรุณารอการตรวจสอบ
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={cancelCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                ยืนยันการขอยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function BookingsPage() {
  return (
    <ProtectedRoute>
      <BookingsContent />
    </ProtectedRoute>
  )
}

