"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Booking } from "@/types/supabase"
import { createClient } from "@/lib/supabase/client"
import { Receipt, Check, X } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlips, setSelectedSlips] = useState<string[]>([])
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [updatingBookingIds, setUpdatingBookingIds] = useState<string[]>([])
  const [confirmAction, setConfirmAction] = useState<{type: 'approve' | 'reject' | 'cancel', bookingId: string, booking: any} | null>(null)
  const itemsPerPage = 5
  const [filterDate, setFilterDate] = useState<string | null>(null) // single-day filter for booking date
  const [filterCreatedAt, setFilterCreatedAt] = useState<string | null>(null) // single-day filter for created_at
  const [adminFilterStatus, setAdminFilterStatus] = useState<'all' | 'approved' | 'rejected' | 'pending' | 'cancelled'>('all')
  const [revenuePeriod, setRevenuePeriod] = useState<'all' | 'month' | 'year'>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')

  // Memoize revenue calculations
  const totalRevenue = useMemo(() => {
    if (!bookings || bookings.length === 0) return 0
    
    let filteredBookings = bookings.filter(booking => 
      String(booking.status || '').toLowerCase() === 'approved' && 
      String(booking.payment_status || '').toLowerCase() === 'paid'
    )
    
    // Apply revenue period filter
    if (revenuePeriod === 'month' && selectedMonth && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getMonth() + 1 === parseInt(selectedMonth) && 
                 bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    } else if (revenuePeriod === 'year' && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    }
    
    return filteredBookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0)
  }, [bookings, revenuePeriod, selectedMonth, selectedYear])

  const approvedPaidCount = useMemo(() => {
    if (!bookings || bookings.length === 0) return 0
    
    let filteredBookings = bookings.filter(booking => 
      String(booking.status || '').toLowerCase() === 'approved' && 
      String(booking.payment_status || '').toLowerCase() === 'paid'
    )
    
    // Apply revenue period filter
    if (revenuePeriod === 'month' && selectedMonth && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getMonth() + 1 === parseInt(selectedMonth) && 
                 bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    } else if (revenuePeriod === 'year' && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    }
    
    return filteredBookings.length
  }, [bookings, revenuePeriod, selectedMonth, selectedYear])

  // Chart data for revenue over time
  const chartData = useMemo(() => {
    if (!bookings || bookings.length === 0) return null

    // Filter approved and paid bookings with same logic as totalRevenue
    let filteredBookings = bookings.filter(booking => 
      String(booking.status || '').toLowerCase() === 'approved' && 
      String(booking.payment_status || '').toLowerCase() === 'paid'
    )

    // Apply revenue period filter (same as totalRevenue)
    if (revenuePeriod === 'month' && selectedMonth && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getMonth() + 1 === parseInt(selectedMonth) && 
                 bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    } else if (revenuePeriod === 'year' && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    }

    // Group by date based on period
    const revenueByDate: Record<string, number> = {}
    const countByDate: Record<string, number> = {}
    
    filteredBookings.forEach(booking => {
      try {
        const date = new Date(booking.created_at || booking.start_time)
        let dateKey: string
        
        if (revenuePeriod === 'month' && selectedMonth && selectedYear) {
          // Group by day for month view
          dateKey = date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
        } else if (revenuePeriod === 'year' && selectedYear) {
          // Group by month for year view
          dateKey = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
        } else {
          // For 'all' period, group by month
          dateKey = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
        }
        
        revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + (Number(booking.total_price) || 0)
        countByDate[dateKey] = (countByDate[dateKey] || 0) + 1
      } catch (e) {
        // Skip invalid dates
      }
    })

    // Sort dates and get labels and data
    const sortedDates = Object.keys(revenueByDate).sort((a, b) => {
      // Simple string sort for Thai dates
      return a.localeCompare(b)
    })

    const labels = sortedDates
    const data = sortedDates.map(date => revenueByDate[date])
    const counts = sortedDates.map(date => countByDate[date])

    return {
      labels,
      datasets: [
        {
          label: 'ยอดรวม (บาท)',
          data,
          counts,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    }
  }, [bookings, revenuePeriod, selectedMonth, selectedYear])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const revenue = `ยอดรวม: ฿${context.parsed.y.toLocaleString()}`
            const count = `รายการ: ${context.dataset.counts[context.dataIndex]} รายการ`
            return [revenue, count]
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            return '฿' + value.toLocaleString()
          }
        }
      }
    }
  }

  const filterBookingsByPeriod = (bookingsList: any[], period: 'day' | 'week' | 'month' | 'year') => {
    const now = new Date()
    const filterDate = new Date()
    
    switch (period) {
      case 'day':
        filterDate.setDate(now.getDate() - 1)
        break
      case 'week':
        filterDate.setDate(now.getDate() - 7)
        break
      case 'month':
        filterDate.setDate(now.getDate() - 30)
        break
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1)
        break
    }
    
    return bookingsList.filter(booking => {
      try {
        const bookingDate = new Date(booking.created_at || booking.start_time)
        return bookingDate >= filterDate && bookingDate <= now
      } catch {
        return false
      }
    })
  }

  // Helper function to get field statistics
  const getFieldStats = (bookingsList: any[]) => {
    const fieldStats: Record<string, number> = {}
    bookingsList.forEach(booking => {
      const fieldName = (booking as any).field_name || (booking as any).field_id || 'Unknown'
      fieldStats[fieldName] = (fieldStats[fieldName] || 0) + 1
    })
    return fieldStats
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    
    try {
      setUpdatingBookingIds(prev => [...prev, confirmAction.bookingId])
      
      // Check if this is a cancellation request
      const isCancellationRequest = String(confirmAction.booking.status ?? '').toLowerCase() === 'request to cancel' ||
        (Array.isArray(confirmAction.booking._items) && confirmAction.booking._items.some((it: any) => String(it.status ?? '').toLowerCase() === 'request to cancel'))
      
      // Determine the target status
      let status: string
      if (isCancellationRequest) {
        status = 'cancelled'
      } else if (confirmAction.type === 'approve') {
        status = 'approved'
      } else if (confirmAction.type === 'reject') {
        status = 'rejected'
      } else if (confirmAction.type === 'cancel') {
        status = 'cancelled'
      } else {
        status = confirmAction.type === 'approve' ? 'approved' : 'rejected'
      }
      
      const resp = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_status', 
          bookingId: confirmAction.bookingId, 
          status: status
        }),
      })
      const j = await resp.json()
      if (!resp.ok) {
        console.error(`Failed to ${confirmAction.type} booking`, j)
        const actionText = status === 'cancelled' ? 'ยกเลิกการจอง' : (confirmAction.type === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ')
        alert(`ไม่สามารถ${actionText}การจองได้`)
      } else {
        await loadAdminBookings()
      }
    } catch (e) {
      console.error(e)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setUpdatingBookingIds(prev => prev.filter(x => x !== confirmAction.bookingId))
      setConfirmAction(null)
    }
  }

  const handleSlipUpload = async (files: File[], bookingId: string) => {
    try {
      setUpdatingBookingIds(prev => [...prev, bookingId])
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bookingId', bookingId)
        
        const response = await fetch('/api/payment/upload-slip', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          alert(`ไม่สามารถอัปโหลดรูปภาพ: ${errorData.error || 'Unknown error'}`)
        } else {
          // Refresh booking data to show new slips
          await loadAdminBookings()
        }
      }
      
      setShowUploadModal(false)
    } catch (error) {
      console.error('Upload error:', error)
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ')
    } finally {
      setUpdatingBookingIds(prev => prev.filter(id => id !== bookingId))
    }
  }

  // load bookings from admin API (reusable)
  const loadAdminBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await fetch('/api/admin/bookings')
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        console.error('Error fetching bookings from admin API:', json)
        setError(json?.error || 'Failed to fetch bookings')
        setBookings([])
      } else {
        const initial = json.data || []
        setBookings(initial)

        try {
          // For any booking missing slip_urls, fetch payments from server in parallel
          const needsFetch = initial.filter((b: any) => !(Array.isArray(b.slip_urls) && b.slip_urls.length > 0))
          if (needsFetch.length > 0) {
            const fetches = needsFetch.map(async (b: any) => {
              try {
                const bid = b.id ?? b.booking_id ?? b.bookings_id ?? (Array.isArray(b._items) && b._items[0] ? b._items[0].id : null)
                if (!bid) return { key: b, urls: [] }
                const resp = await fetch(`/api/admin/payments?bookingId=${bid}`)
                const j = await resp.json().catch(() => ({}))
                const urls = Array.isArray(j?.data) ? j.data : []
                return { key: b, urls }
              } catch (e) {
                return { key: b, urls: [] }
              }
            })

            const results = await Promise.all(fetches)
            // Merge URLs back into bookings
            const byKey = new Map<any, string[]>()
            for (const r of results) {
              if (r && r.key) byKey.set(r.key, r.urls || [])
            }
            const merged = initial.map((b: any) => {
              const found = byKey.get(b) || []
              const existing = Array.isArray(b.slip_urls) ? b.slip_urls : []
              return { ...b, slip_urls: Array.from(new Set([...existing, ...found])) }
            })
            setBookings(merged)
          }
        } catch (e) {
          console.error('Error fetching supplemental payment slips:', e)
        }
      }
    } catch (e) {
      console.error('Unexpected error:', e)
      setError('An unexpected error occurred')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // load bookings on mount
    loadAdminBookings()

    // Real-time subscription for bookings table
    let debounceTimer: NodeJS.Timeout | null = null
    const supabase = createClient()
    const channel = supabase
      .channel('admin realtime bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        console.log('Realtime payload received:', payload)
        // Debounce to prevent multiple rapid reloads
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          console.log('Reloading admin bookings...')
          loadAdminBookings()
        }, 1000)
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    } catch {
      return dateString
    }
  }

  const formatDateOnly = (dateString: string) => {
    try {
      const d = new Date(dateString)
      return d.toLocaleDateString('th-TH')
    } catch {
      return String(dateString || "")
    }
  }

  const extractDateTimeParts = (raw: string) => {
    // Attempt to extract YYYY-MM-DD and HH:MM from common timestamp formats
    // Examples: '2026-01-12T13:00:00Z', '2026-01-12 13:00:00', '2026-01-12T13:00:00'
    try {
      const m = String(raw).match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(:?\d{2})?(Z)?/)
      if (m) {
        return { date: m[1], time: m[2] }
      }
      // fallback: ISO parse
      const asDate = new Date(raw)
      if (!isNaN(asDate.getTime())) {
        const hh = String(asDate.getHours()).padStart(2, '0')
        const mm = String(asDate.getMinutes()).padStart(2, '0')
        const date = asDate.toISOString().split('T')[0]
        return { date, time: `${hh}:${mm}` }
      }
    } catch (e) {
      // ignore
    }
    return { date: '', time: '' }
  }

  const formatTimeOnly = (dateString: string) => {
    try {
      const d = new Date(dateString)
      // Use Thai 24-hour formatting
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return String(dateString || "")
    }
  }

  const normalizeTimeTo24 = (timeStr?: string | null) => {
    if (!timeStr) return null
    const s = String(timeStr).trim()
    // Handle formats like "7:30 PM" or "7 PM"
    const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
    if (ampm) {
      let h = parseInt(ampm[1], 10)
      const m = ampm[2] ?? '00'
      const ap = ampm[3].toLowerCase()
      if (ap === 'pm' && h < 12) h += 12
      if (ap === 'am' && h === 12) h = 0
      return `${String(h).padStart(2, '0')}:${m}`
    }
    // Handle HH:MM
    const hhmm = s.match(/^(\d{1,2}):(\d{2})$/)
    if (hhmm) {
      const hh = String(parseInt(hhmm[1], 10)).padStart(2, '0')
      const mm = hhmm[2]
      return `${hh}:${mm}`
    }
    // Handle hour only like '7' -> '07:00'
    const hourOnly = s.match(/^(\d{1,2})$/)
    if (hourOnly) {
      const hh = String(parseInt(hourOnly[1], 10)).padStart(2, '0')
      return `${hh}:00`
    }
    return s
  }

  const generateAdminTimeSlots = () => {
    const slots: string[] = []
    for (let hour = 13; hour < 24; hour++) {
      slots.push(String(hour).padStart(2, '0') + ':00')
    }
    // add midnight as the last end slot
    slots.push('00:00')
    return slots
  }


  useEffect(() => {
    setCurrentPage(1)
  }, [bookings, filterDate, filterCreatedAt])

  const applyFilters = (arr: any[]) => {
    return arr.filter((b) => {
      try {
        const s = b.start_time ? new Date(b.start_time) : null
        const e = b.end_time ? new Date(b.end_time) : null

        // Date filtering is applied after grouping so we can filter by the group's first booking date

        // time filter removed — no per-row time filtering here

        return true
      } catch (err) {
        return true
      }
    })
  }

  const filteredBookings = applyFilters(bookings as any[])

  // Group bookings by identical created_at. For each group we:
  // - pick earliest start_time as group's start_time
  // - pick latest end_time as group's end_time
  // - sum expected_price for total price
  // - keep other fields from the first item (field_name, username, phone_number)
  const groupedByCreatedAt = (() => {
    const groups: Record<string, any[]> = {}
    for (const b of (filteredBookings || [])) {
      const created = String(b.created_at ?? '').trim() || 'no-created'
      groups[created] = groups[created] || []
      groups[created].push(b)
    }

    const out: any[] = []
    for (const [created, items] of Object.entries(groups)) {
      // sort items by parsed start_time (fallback to Date.parse of start_time string)
      const parseTime = (x: any) => {
        if (!x) return NaN
        const s = x.start_time ?? x.startTime ?? x.timeSlots?.[0] ?? x.bookingDate ?? null
        if (!s) return NaN
        const t = Date.parse(String(s))
        if (!isNaN(t)) return t
        // try extractDateTimeParts for HH:MM and compose with bookingDate if present
        try {
          const parts = extractDateTimeParts(String(x.start_time ?? x.startTime ?? ''))
          if (parts.date && parts.time) return Date.parse(parts.date + 'T' + parts.time)
        } catch (e) {}
        return NaN
      }

      // find earliest start_time and latest end_time
      let earliestItem: any = items[0]
      let latestItem: any = items[0]
      let earliestTime = parseTime(items[0])
      let latestTimeEnd = (() => {
        const s = items[0].end_time ?? items[0].endTime
        return s ? Date.parse(String(s)) : NaN
      })()

      for (const it of items) {
        const st = parseTime(it)
        if (!isNaN(st) && (isNaN(earliestTime) || st < earliestTime)) {
          earliestTime = st
          earliestItem = it
        }
        const etRaw = it.end_time ?? it.endTime
        const et = etRaw ? Date.parse(String(etRaw)) : NaN
        if (!isNaN(et) && (isNaN(latestTimeEnd) || et > latestTimeEnd)) {
          latestTimeEnd = et
          latestItem = it
        }
      }

      // sum expected_price (fallback 0)
      const totalPrice = items.reduce((acc, cur) => acc + (Number(cur.expected_price ?? 0) || 0), 0)

      // build merged row
      // determine group-level status: prefer approved/rejected/request to cancel if any item has it
      const computeGroupStatus = (items: any[]) => {
        try {
          if (!Array.isArray(items) || items.length === 0) return 'pending'
          if (items.some(it => String(it.status).toLowerCase() === 'approved')) return 'approved'
          if (items.some(it => String(it.status).toLowerCase() === 'rejected')) return 'rejected'
          if (items.some(it => String(it.status).toLowerCase().includes('request to cancel') || String(it.status).toLowerCase().includes('request_to_cancel') || String(it.status).toLowerCase().includes('requestcancel'))) return 'request to cancel'
          // fallback to first item's status or pending
          return items[0].status ?? items[0].payment_status ?? 'pending'
        } catch (e) {
          return 'pending'
        }
      }

      const merged = {
        // use created as canonical created_at
        created_at: created === 'no-created' ? null : created,
        id: earliestItem.id ?? earliestItem.booking_id ?? earliestItem.bookings_id ?? null,
        field_name: earliestItem.field_name ?? earliestItem.field_id ?? null,
        username: earliestItem.username ?? null,
        phone_number: earliestItem.phone_number ?? null,
        start_time: earliestItem.start_time ?? earliestItem.startTime ?? null,
        end_time: latestItem.end_time ?? latestItem.endTime ?? null,
        expected_price: totalPrice,
        // keep original items array for debugging if needed
        _items: items,
        // aggregate slip URLs from underlying items/payments
        slip_urls: (() => {
          try {
            const list: string[] = []
            for (const it of items) {
              if (!it) continue
              if (Array.isArray(it.slip_urls) && it.slip_urls.length > 0) list.push(...it.slip_urls.map((s: any) => String(s)))
              if (Array.isArray(it.slipUrl) && it.slipUrl.length > 0) list.push(...it.slipUrl.map((s: any) => String(s)))
              if (it.slip_url) list.push(String(it.slip_url))
              if (it.slipUrl && typeof it.slipUrl === 'string') list.push(String(it.slipUrl))
            }
            return Array.from(new Set(list))
          } catch (e) {
            return []
          }
        })(),
        // aggregate paid amount across items (if present)
        paid_amount: (() => {
          try {
            const sum = items.reduce((acc: number, it: any) => {
              const v = Number(it.paid_amount ?? it.amount ?? it.paidAmount ?? 0) || 0
              return acc + v
            }, 0)
            return sum > 0 ? sum : null
          } catch (e) {
            return null
          }
        })(),
        status: computeGroupStatus(items),
      }
      out.push(merged)
    }

    // sort by created_at desc (latest bookings first)
    out.sort((a, b) => {
      const ta = a.created_at ? Date.parse(String(a.created_at)) : 0
      const tb = b.created_at ? Date.parse(String(b.created_at)) : 0
      return tb - ta
    })
    return out
  })()

  // Apply date filter on grouped rows using the group's earliest start_time (first booking date)
  const groupedFilteredByDate = (() => {
    if (!filterDate && !filterCreatedAt) return groupedByCreatedAt

    const getYmdFromRaw = (raw: any) => {
      if (!raw) return null
      try {
        const parts = extractDateTimeParts(String(raw))
        if (parts.date) return parts.date
      } catch (e) {}
      try {
        const d = new Date(String(raw))
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${dd}`
        }
      } catch (e) {}
      return null
    }

    return groupedByCreatedAt.filter((g) => {
      try {
        // Filter by booking date (start_time)
        if (filterDate) {
          const startYmd = getYmdFromRaw(g.start_time)
          if (!startYmd) return true
          if (startYmd !== filterDate) return false
        }
        
        // Filter by created_at date
        if (filterCreatedAt) {
          const createdYmd = getYmdFromRaw(g.created_at)
          if (!createdYmd) return true
          if (createdYmd !== filterCreatedAt) return false
        }
        
        return true
      } catch (err) {
        return true
      }
    })
  })()

  // apply admin status filter on grouped rows
  // hide groups that are 'request to cancel' entirely, then apply admin status filter
  const groupedFilteredByStatus = groupedFilteredByDate
    .filter((g) => String(g.status ?? '').toLowerCase() !== 'request to cancel')
    .filter((g) => {
      if (adminFilterStatus === 'all') return true
      try {
        return String(g.status ?? '').toLowerCase() === String(adminFilterStatus).toLowerCase()
      } catch (e) {
        return false
      }
    })

  const totalPages = Math.max(1, Math.ceil(groupedFilteredByStatus.length / itemsPerPage))
  const displayedBookings = groupedFilteredByStatus.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Detect cancellation requests from grouped rows using multiple possible field names
  const cancellationRequests = groupedByCreatedAt.filter((g) => {
    try {
      // Only include groups explicitly marked as request to cancel
      if (String(g.status ?? '').toLowerCase() === 'request to cancel') return true
      // Also include if any nested item explicitly has that status
      if (Array.isArray(g._items) && g._items.some((it: any) => String(it.status ?? '').toLowerCase() === 'request to cancel')) return true
    } catch (e) {
      // ignore
    }
    return false
  })

  // Memoize field statistics
  const fieldStats = useMemo(() => {
    // Apply same filtering logic as totalRevenue
    let filteredBookings = bookings.filter(booking => 
      String(booking.status || '').toLowerCase() === 'approved' && 
      String(booking.payment_status || '').toLowerCase() === 'paid'
    )

    // Apply revenue period filter (same as totalRevenue)
    if (revenuePeriod === 'month' && selectedMonth && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getMonth() + 1 === parseInt(selectedMonth) && 
                 bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    } else if (revenuePeriod === 'year' && selectedYear) {
      filteredBookings = filteredBookings.filter(booking => {
        try {
          const bookingDate = new Date(booking.created_at || booking.start_time)
          return bookingDate.getFullYear() === parseInt(selectedYear)
        } catch {
          return false
        }
      })
    }

    const stats = getFieldStats(filteredBookings)
    
    if (Object.keys(stats).length === 0) {
      return []
    }

    // Sort by booking count (highest first)
    const sortedFields = Object.entries(stats).sort(([,a], [,b]) => b - a)
    const maxBookings = Math.max(...Object.values(stats))

    return sortedFields.map(([fieldName, count]) => ({
      fieldName,
      count,
      percentage: (count / maxBookings) * 100
    }))
  }, [bookings, revenuePeriod, selectedMonth, selectedYear])

  return (
    <ProtectedRoute requireAdmin={true}>
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ผู้ดูแลระบบ (Admin)</h1>
          </div>

          <div style={{ position: 'relative', minHeight: '800px' }}>
            {/* Left Sidebar - Revenue and Statistics */}
            <div style={{ position: 'absolute', left: '0', top: '0', width: '320px' }}>
              {/* Revenue Summary Card */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white/90 mb-1">ยอดรวมทั้งหมด</h2>
                    <p className="text-emerald-100 text-xs">รายการการจอง</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      ฿{totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-emerald-100 text-xs mt-1">
                      {approvedPaidCount > 0 ? `${approvedPaidCount} รายการ` : "0 รายการ"}
                    </div>
                  </div>
                </div>
                
                {/* Revenue Period Filter */}
                <div className="flex items-center gap-2 mt-3">
                  <select
                    value={revenuePeriod}
                    onChange={(e) => {
                      setRevenuePeriod(e.target.value as 'all' | 'month' | 'year')
                      if (e.target.value === 'all') {
                        setSelectedMonth('')
                        setSelectedYear('')
                      }
                    }}
                    className="flex-1 px-2 py-1 text-xs border border-emerald-400 rounded bg-emerald-50 text-emerald-800 focus:outline-none focus:border-emerald-300"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="month">รายเดือน</option>
                    <option value="year">รายปี</option>
                  </select>
                  
                  {revenuePeriod === 'month' && (
                    <>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-2 py-1 text-xs border border-emerald-400 rounded bg-emerald-50 text-emerald-800 focus:outline-none focus:border-emerald-300"
                      >
                        <option value="">เลือกเดือน</option>
                        <option value="1">มกราคม</option>
                        <option value="2">กุมภาพันธ์</option>
                        <option value="3">มีนาคม</option>
                        <option value="4">เมษายน</option>
                        <option value="5">พฤษภาคม</option>
                        <option value="6">มิถุนายน</option>
                        <option value="7">กรกฎาคม</option>
                        <option value="8">สิงหาคม</option>
                        <option value="9">กันยายน</option>
                        <option value="10">ตุลาคม</option>
                        <option value="11">พฤศจิกายน</option>
                        <option value="12">ธันวาคม</option>
                      </select>
                      
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-2 py-1 text-xs border border-emerald-400 rounded bg-emerald-50 text-emerald-800 focus:outline-none focus:border-emerald-300"
                      >
                        <option value="">เลือกปี</option>
                        {Array.from({length: 5}, (_, i) => {
                          const year = new Date().getFullYear() - i
                          return <option key={year} value={year}>{year + 543}</option>
                        })}
                      </select>
                    </>
                  )}
                  
                  {revenuePeriod === 'year' && (
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-emerald-400 rounded bg-emerald-50 text-emerald-800 focus:outline-none focus:border-emerald-300"
                    >
                      <option value="">เลือกปี</option>
                      {Array.from({length: 5}, (_, i) => {
                        const year = new Date().getFullYear() - i
                        return <option key={year} value={year}>{year + 543}</option>
                      })}
                    </select>
                  )}
                </div>
              </div>

              {/* Spacing between cards */}
              <div className="mb-4"></div>

              {/* Revenue Chart */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">ยอดรวมทั้งหมด</h2>
                  <div className="text-xs text-gray-500">
                    {revenuePeriod === 'all' ? 'ทั้งหมด' : 
                     revenuePeriod === 'month' && selectedMonth && selectedYear ? `${selectedMonth}/${selectedYear}` :
                     revenuePeriod === 'year' && selectedYear ? selectedYear : ''}
                  </div>
                </div>
                
                <div className="h-64">
                  {chartData ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      ไม่มีข้อมูลสำหรับแสดงกราฟ
                    </div>
                  )}
                </div>
              </div>

              {/* Spacing between cards */}
              <div className="mb-4"></div>

              {/* Field Statistics */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">สถิติการจองสนาม</h2>
                  <div className="text-xs text-gray-500">
                    {revenuePeriod === 'all' ? 'ทั้งหมด' : 
                     revenuePeriod === 'month' && selectedMonth && selectedYear ? `${selectedMonth}/${selectedYear}` :
                     revenuePeriod === 'year' && selectedYear ? selectedYear : ''}
                  </div>
                </div>
                
                {!loading && !error && bookings.length > 0 && (
                  <div className="space-y-3">
                    {fieldStats.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-gray-500 text-sm">ไม่มีข้อมูลการจองในช่วงเวลาที่เลือก</p>
                      </div>
                    ) : (
                      fieldStats.map(({fieldName, count, percentage}) => (
                        <div key={fieldName} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{fieldName}</span>
                            <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                              {count}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {loading && (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500 text-sm">กำลังโหลด...</p>
                  </div>
                )}

                {(!loading && (!bookings || bookings.length === 0)) && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">ไม่มีข้อมูลการจอง</p>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content - Booking Lists */}
            <div style={{ paddingLeft: '340px' }}>
              {/* Cancellation Requests Section */}
              {cancellationRequests.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-yellow-800 mb-3">รายการขอยกเลิกการจอง</h2>
                  <p className="text-xs text-yellow-700 mb-3">รายการที่ส่งคำขอยกเลิก</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-yellow-200">
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">เลขที่</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">วันที่สร้างรายการ</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">สนาม</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">วันที่จอง</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">เวลา</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">ราคา</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">ผู้จอง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancellationRequests.map((g: any) => {
                          const bid = g.id ?? g.booking_id ?? (Array.isArray(g._items) && g._items[0] ? g._items[0].id : null) ?? ''
                          const fname = g.field_name ?? g.fieldId ?? g.field_id ?? (g._items?.[0]?.field_name) ?? ''
                          const uname = g.username ?? g.user_name ?? g._items?.[0]?.username ?? ''
                          const phone = g.phone_number ?? g.phone ?? g._items?.[0]?.phone_number ?? g._items?.[0]?.phone ?? ''

                          // compute date and time display
                          let displayedDate = ''
                          let timeRange = ''
                          try {
                            const rawStart = g.start_time ?? g._items?.[0]?.start_time ?? g.bookingDate ?? null
                            const rawEnd = g.end_time ?? g._items?.[0]?.end_time ?? null
                            if (rawStart) {
                              const sParts = extractDateTimeParts(String(rawStart))
                              displayedDate = sParts.date ? formatDateOnly(sParts.date) : formatDateOnly(String(rawStart))
                            } else if (g.bookingDate) {
                              displayedDate = formatDateOnly(String(g.bookingDate))
                            }

                            if (rawStart && rawEnd) {
                              const sParts = extractDateTimeParts(String(rawStart))
                              const eParts = extractDateTimeParts(String(rawEnd))
                              const sTime = sParts.time || formatTimeOnly(String(rawStart))
                              const eTime = eParts.time || formatTimeOnly(String(rawEnd))
                              timeRange = `${sTime} - ${eTime}`
                            } else if (Array.isArray(g.timeSlots) && g.timeSlots.length > 0) {
                              const first = String(g.timeSlots[0] || '')
                              const last = String(g.timeSlots[g.timeSlots.length - 1] || '')
                              const m1 = first.match(/(\d{1,2}:\d{2})/)
                              const m2 = last.match(/(\d{1,2}:\d{2})/)
                              if (m1 && m2) timeRange = `${m1[1]} - ${m2[1]}`
                              else timeRange = String(g.timeSlots.join(', '))
                            } else if (Array.isArray(g._items) && g._items.length > 0) {
                              const it = g._items[0]
                              const s = it.start_time ?? it.startTime ?? null
                              const e = it.end_time ?? it.endTime ?? null
                              if (s && e) {
                                timeRange = `${formatTimeOnly(String(s))} - ${formatTimeOnly(String(e))}`
                              }
                            }
                          } catch (e) {
                            // ignore
                          }

                          return (
                            <tr key={String(bid) + '_cancel'} className="border-b border-yellow-100 hover:bg-yellow-50 transition-colors">
                              <td className="py-2 px-3 text-xs text-gray-900">{String(bid)}</td>
                              <td className="py-2 px-3 text-xs text-gray-900">
                                {(() => {
                                  try {
                                    if (g.created_at) {
                                      // Use the same format as booking date
                                      const date = new Date(g.created_at)
                                      if (!isNaN(date.getTime())) {
                                        const yy = date.getFullYear()
                                        const mm = String(date.getMonth() + 1).padStart(2, '0')
                                        const dd = String(date.getDate()).padStart(2, '0')
                                        const by = String(yy + 543)
                                        return `${dd}/${mm}/${by}`
                                      }
                                    }
                                    return '-'
                                  } catch (e) {
                                    return '-'
                                  }
                                })()}
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-900">{String(fname)}</td>
                              <td className="py-2 px-3 text-xs text-gray-900">{displayedDate || '-'}</td>
                              <td className="py-2 px-3 text-xs text-gray-900">{timeRange || '-'}</td>
                              <td className="py-2 px-3 text-xs text-gray-900">
                                {(() => {
                                  const totalPrice = (g.expected_price !== null && g.expected_price !== undefined)
                                    ? Number(g.expected_price)
                                    : null
                                  return totalPrice !== null ? `฿${totalPrice.toLocaleString('th-TH')}` : '-'
                                })()}
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-900">{String(uname)}</td>
                              <td className="py-2 px-3 text-xs text-gray-900">
                                <div className="flex gap-1">
                                  {/* ปุ่มใบเสร็จ */}
                                  {(g.slip_urls && g.slip_urls.length > 0) ? (
                                    <button
                                      onClick={() => {
                                        setSelectedSlips(g.slip_urls)
                                        setSelectedBooking(g)
                                        setShowSlipModal(true)
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border-2 border-gray-700 text-gray-700 hover:bg-gray-800 hover:text-white text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                      <Receipt className="w-3 h-3" />
                                      ใบเสร็จ
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-xs">ไม่มีใบเสร็จ</span>
                                  )}

                                  {/* ปุ่มอนุมัติ */}
                                  <button
                                    onClick={() => {
                                      const bid = g.id ?? g.booking_id ?? (Array.isArray(g._items) && g._items[0] ? g._items[0].id : null) ?? ''
                                      setConfirmAction({
                                        type: 'approve',
                                        bookingId: String(bid),
                                        booking: g
                                      })
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold hover:shadow-xl transition-all duration-300 transform hover:scale-110 border-2 border-emerald-700 translate-x-8"
                                  >
                                    <Check className="w-3 h-3" />
                                    อนุมัติ
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Spacing between sections */}
              <div className="mb-6"></div>

              {/* All Bookings Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">รายการการจองทั้งหมด</h2>

                {loading && (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DC2626] mx-auto"></div>
                    <p className="mt-3 text-gray-600 text-sm">Loading bookings...</p>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4 items-end">
                  <div>
                    <label className="block text-xs text-gray-600">วันที่สร้างรายการ</label>
                    <input type="date" value={filterCreatedAt ?? ''} onChange={(e) => setFilterCreatedAt(e.target.value || null)} className="px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">วันที่จอง</label>
                    <input type="date" value={filterDate ?? ''} onChange={(e) => setFilterDate(e.target.value || null)} className="px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">สถานะ</label>
                    <select 
                      value={adminFilterStatus} 
                      onChange={(e) => setAdminFilterStatus(e.target.value as any)}
                      className="px-2 py-1 border rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">ทั้งหมด</option>
                      <option value="approved">อนุมัติ</option>
                      <option value="pending">รออนุมัติ</option>
                      <option value="cancelled">ยกเลิก</option>
                      <option value="rejected">ไม่อนุมัติ</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                    {error}
                  </div>
                )}

                {!loading && !error && bookings.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-600 text-sm">No bookings found.</p>
                  </div>
                )}

                {!loading && !error && bookings.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">เลขที่</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">วันที่สร้างรายการ</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">สนาม</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">วันที่จอง</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">เวลา</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">ราคา</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 text-sm">ผู้จอง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedBookings.map((booking: any) => {
                          const statusNorm = String(booking.status ?? '').toLowerCase()
                          // compute date range and time range (start -> end)
                          let dateRange = ''
                          let timeRange = ''
                          let startTimeDisplay = ''
                          let endTimeDisplay = ''
                          try {
                            // Prefer explicit start_time/end_time fields
                            if (booking.start_time && booking.end_time) {
                              const sRaw = String(booking.start_time)
                              const eRaw = String(booking.end_time)
                              const sParts = extractDateTimeParts(sRaw)
                              const eParts = extractDateTimeParts(eRaw)
                              // compute day difference using Date objects as fallback for multi-day
                              const sDateObj = new Date(sRaw)
                              const eDateObj = new Date(eRaw)
                              const diffMs = (!isNaN(sDateObj.getTime()) && !isNaN(eDateObj.getTime())) ? (eDateObj.getTime() - sDateObj.getTime()) : null
                              const msPerDay = 1000 * 60 * 60 * 24

                              if (diffMs !== null && Math.abs(diffMs) < msPerDay) {
                                dateRange = formatDateOnly(sParts.date || sRaw)
                              } else {
                                const startDateDisplay = sParts.date ? formatDateOnly(sParts.date) : formatDateOnly(sRaw)
                                const endDateDisplay = eParts.date ? formatDateOnly(eParts.date) : formatDateOnly(eRaw)
                                dateRange = `${startDateDisplay} — ${endDateDisplay}`
                              }

                              // Use extracted HH:MM if available to reflect DB values exactly
                              startTimeDisplay = sParts.time || formatTimeOnly(sRaw)
                          endTimeDisplay = eParts.time || formatTimeOnly(eRaw)
                          timeRange = `${startTimeDisplay} - ${endTimeDisplay}`
                        } else if (booking.timeSlots && Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0) {
                          // fallback: booking.timeSlots contains strings like "13:00 - 14:00"
                          const first = String(booking.timeSlots[0] || '')
                          const last = String(booking.timeSlots[booking.timeSlots.length - 1] || '')
                          // try parse first and last ranges
                          const parseSlot = (slotStr: string) => {
                            const m = slotStr.match(/(\d{1,2}:\d{2})/) 
                            return m ? m[1] : null
                          }
                          const startT = parseSlot(first)
                          const endT = parseSlot(last)
                          if (startT && endT) {
                            dateRange = booking.bookingDate ? String(booking.bookingDate) : ''
                            startTimeDisplay = startT
                            endTimeDisplay = endT
                            timeRange = `${startT} - ${endT}`
                          } else {
                            timeRange = String(booking.timeSlots.join(', '))
                          }
                        } else {
                          dateRange = ''
                          timeRange = ''
                        }
                      } catch (err) {
                        dateRange = ''
                        timeRange = ''
                      }

                      // Format display date as DD/MM/(Buddhist year) using extracted parts when possible
                      const formatThaiYmd = (ymd: string) => {
                        try {
                          const [yy, mm, dd] = String(ymd).split('-')
                          const by = String(Number(yy) + 543)
                          return `${dd}/${mm}/${by}`
                        } catch {
                          return ymd
                        }
                      }

                      let displayedDate = dateRange
                      try {
                        if (booking.start_time) {
                          const sRaw = String(booking.start_time)
                          const sParts = extractDateTimeParts(sRaw)
                          if (sParts.date) {
                            // If dateRange contains a range, convert both sides
                            if (dateRange.includes('—')) {
                              const eRaw = String(booking.end_time || '')
                              const eParts = extractDateTimeParts(eRaw)
                              const startDisplay = formatThaiYmd(sParts.date)
                              const endDisplay = eParts.date ? formatThaiYmd(eParts.date) : formatThaiYmd(sParts.date)
                              displayedDate = `${startDisplay} — ${endDisplay}`
                            } else {
                              displayedDate = formatThaiYmd(sParts.date)
                            }
                          } else if (booking.bookingDate) {
                            // booking.bookingDate often YYYY-MM-DD
                            displayedDate = formatThaiYmd(String(booking.bookingDate))
                          }
                        } else if (booking.bookingDate) {
                          displayedDate = formatThaiYmd(String(booking.bookingDate))
                        }
                      } catch (e) {
                        // ignore
                      }

                      // Build timeSlots array for display (match /bookings page)
                      let timeSlotsArr: string[] = []
                      try {
                        // Prefer explicit array fields
                        timeSlotsArr = booking.timeSlots ?? booking.time_slots ?? booking.slots ?? []

                        // If grouped row retains original items, derive slots from them
                        if ((!timeSlotsArr || timeSlotsArr.length === 0) && Array.isArray(booking._items) && booking._items.length > 0) {
                          const slots: string[] = []
                          for (const it of booking._items) {
                            const sIso = it.start_time ?? it.startTime ?? null
                            const eIso = it.end_time ?? it.endTime ?? null
                            if (sIso && eIso) {
                              try {
                                const s = new Date(sIso)
                                const e = new Date(eIso)
                                const a = s.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
                                const b = e.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
                                slots.push(`${a}-${b}`)
                              } catch (e) {
                                // fallback to raw values
                                slots.push(`${String(sIso)} - ${String(eIso)}`)
                              }
                            } else if (it.timeSlots && Array.isArray(it.timeSlots) && it.timeSlots.length > 0) {
                              // if nested item contains its own timeSlots
                              slots.push(...it.timeSlots.map((t: any) => String(t)))
                            }
                          }
                          timeSlotsArr = slots
                        }

                        // Fallback: compute from group's start_time/end_time (hourly slots)
                        if ((!timeSlotsArr || timeSlotsArr.length === 0) && booking.start_time && booking.end_time) {
                          const sIso = booking.start_time
                          const eIso = booking.end_time
                          try {
                            const s = new Date(sIso)
                            const e = new Date(eIso)
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
                            timeSlotsArr = slots
                          } catch (e) {
                            timeSlotsArr = []
                          }
                        }
                      } catch (err) {
                        timeSlotsArr = []
                      }

                      // Compute total price (use expected_price from server if present)
                      const totalPrice = (booking.expected_price !== null && booking.expected_price !== undefined)
                        ? Number(booking.expected_price)
                        : null
                      const totalPriceDisplay = totalPrice !== null ? `฿${totalPrice.toLocaleString('th-TH')}` : '-'

                      const paid = booking.paid_amount ?? booking.amount ?? null
                      const username = booking.username ?? booking.user_name ?? booking.user?.username ?? booking.user_id ?? ''

                      return (
                        <tr key={String(booking.id ?? booking.booking_id ?? booking.bookings_id ?? Math.random())} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-xs text-gray-900">{String(booking.id ?? booking.booking_id ?? booking.bookings_id ?? '')}</td>
                          <td className="py-2 px-3 text-xs text-gray-900">
                            {(() => {
                              try {
                                if (booking.created_at) {
                                  // Use the same format as booking date
                                  const date = new Date(booking.created_at)
                                  if (!isNaN(date.getTime())) {
                                    const yy = date.getFullYear()
                                    const mm = String(date.getMonth() + 1).padStart(2, '0')
                                    const dd = String(date.getDate()).padStart(2, '0')
                                    const by = String(yy + 543)
                                    return `${dd}/${mm}/${by}`
                                  }
                                }
                                return '-'
                              } catch (e) {
                                return '-'
                              }
                            })()}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-900">{String(booking.field_name ?? booking.field_id ?? '')}</td>
                          <td className="py-2 px-3 text-xs text-gray-900">{displayedDate || '-'}</td>
                          <td className="py-2 px-3 text-xs text-gray-900">
                            {timeSlotsArr && timeSlotsArr.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {timeSlotsArr.map((t: string, i: number) => (
                                  <span key={i} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">{t}</span>
                                ))}
                              </div>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-900">{totalPriceDisplay}</td>
                          <td className="py-2 px-3 text-xs text-gray-900">{String(username)}</td>
                          <td className="py-2 px-3 text-xs text-gray-900">
                            {(booking.slip_urls && booking.slip_urls.length > 0) ? (
                              <button
                                onClick={() => {
                                  setSelectedSlips(booking.slip_urls)
                                  setSelectedBooking(booking)
                                  setShowSlipModal(true)
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border-2 border-gray-700 text-gray-700 hover:bg-gray-800 hover:text-white text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <Receipt className="w-3 h-3" />
                                ใบเสร็จ
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">ไม่มีใบเสร็จ</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-900">
                            {statusNorm === 'pending' ? (
                              <div className="flex gap-1">
                                <button
                                  disabled={updatingBookingIds.includes(String(booking.id ?? booking.booking_id ?? booking.bookings_id))}
                                  onClick={() => {
                                    const bid = booking.id ?? booking.booking_id ?? booking.bookings_id
                                    setConfirmAction({
                                      type: 'approve',
                                      bookingId: String(bid),
                                      booking: booking
                                    })
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 border-2 border-emerald-700"
                                >
                                  <Check className="w-3 h-3" />
                                  อนุมัติ
                                </button>

                                <button
                                  disabled={updatingBookingIds.includes(String(booking.id ?? booking.booking_id ?? booking.bookings_id))}
                                  onClick={() => {
                                    const bid = booking.id ?? booking.booking_id ?? booking.bookings_id
                                    setConfirmAction({
                                      type: 'reject',
                                      bookingId: String(bid),
                                      booking: booking
                                    })
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-xs font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 border-2 border-red-700"
                                >
                                  <X className="w-3 h-3" />
                                  ไม่อนุมัติ
                                </button>
                              </div>
                            ) : (
                              // Show a readable label for other statuses
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border-2">
                                {statusNorm === 'approved' && (
                                  <>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-0.5"></span>
                                    <span className="text-emerald-800 border-emerald-300 px-1 py-0.5 rounded-full text-xs">อนุมัติ</span>
                                  </>
                                )}
                                {statusNorm === 'rejected' && (
                                  <>
                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-0.5"></span>
                                    <span className="text-red-800 border-red-300 px-1 py-0.5 rounded-full text-xs">ไม่อนุมัติ</span>
                                  </>
                                )}
                                {statusNorm === 'cancel' && (
                                  <>
                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-0.5"></span>
                                    <span className="text-red-800 border-red-300 px-1 py-0.5 rounded-full text-xs">ไม่อนุมัติ</span>
                                  </>
                                )}
                                {statusNorm === 'cancelled' && (
                                  <>
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-0.5"></span>
                                    <span className="text-yellow-800 border-yellow-300 px-1 py-0.5 rounded-full text-xs">ยกเลิกการจอง</span>
                                  </>
                                )}
                                {statusNorm === 'confirmed' && (
                                  <>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-0.5"></span>
                                    <span className="text-blue-800 border-blue-300 px-1 py-0.5 rounded-full text-xs">ยืนยัน</span>
                                  </>
                                )}
                                {statusNorm === 'request to cancel' && (
                                  <>
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-0.5"></span>
                                    <span className="text-yellow-800 border-yellow-300 px-2 py-1 rounded-full text-xs">รอยกเลิก</span>
                                  </>
                                )}
                                {!['approved', 'rejected', 'cancel', 'cancelled', 'confirmed', 'request to cancel'].includes(statusNorm) && (
                                  <>
                                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-0.5"></span>
                                    <span className="text-gray-800 border-gray-300 px-1 py-0.5 rounded-full text-xs">{booking.status ?? '-'}</span>
                                  </>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && bookings.length > 0 && (
              <>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <div>
                    รายการทั้งหมด: <span className="font-semibold">{groupedFilteredByStatus.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                    >
                      ก่อนหน้า
                    </button>
                    <span>หน้า {currentPage} / {totalPages}</span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                    >
                      ต่อไป
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
          </div>

          {/* Slip Viewer Modal */}
          {showSlipModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">รูปใบเสร็จการชำระเงิน</h3>
                  <button
                    onClick={() => {
                      setShowSlipModal(false)
                      setSelectedSlips([])
                      setSelectedBooking(null)
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="p-4">
                  {/* Booking Details */}
                  {selectedBooking && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">รายละเอียดการจอง</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">เลขที่การจอง:</span>
                          <p className="font-semibold text-gray-900">{selectedBooking.id || selectedBooking.booking_id || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">สนาม:</span>
                          <p className="font-semibold text-gray-900">{selectedBooking.field_name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">วันที่:</span>
                          <p className="font-semibold text-gray-900">
                            {(() => {
                              try {
                                const date = selectedBooking.start_time ? new Date(selectedBooking.start_time) : null
                                return date ? date.toLocaleDateString('th-TH') : '-'
                              } catch (e) {
                                return '-'
                              }
                            })()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">เวลา:</span>
                          <p className="font-semibold text-gray-900">
                            {(() => {
                              try {
                                if (selectedBooking.timeSlots && Array.isArray(selectedBooking.timeSlots)) {
                                  return selectedBooking.timeSlots.join(', ')
                                }
                                if (selectedBooking.start_time && selectedBooking.end_time) {
                                  const start = new Date(selectedBooking.start_time)
                                  const end = new Date(selectedBooking.end_time)
                                  return `${start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                                }
                                return '-'
                              } catch (e) {
                                return '-'
                              }
                            })()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">ผู้จอง:</span>
                          <p className="font-semibold text-gray-900">{selectedBooking.username || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">เบอร์โทร:</span>
                          <p className="font-semibold text-gray-900">{selectedBooking.phone_number || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">ราคา:</span>
                          <p className="font-semibold text-gray-900">{(selectedBooking.expected_price || selectedBooking.total_price || 0).toLocaleString()} บาท</p>
                        </div>
                        <div>
                          <span className="text-gray-600">สถานะ:</span>
                          <div className="flex items-center gap-2">
                            {selectedBooking && ['approved', 'rejected', 'cancelled'].includes(String(selectedBooking.status || '').toLowerCase()) ? (
                              <select
                                disabled={updatingBookingIds.includes(String(selectedBooking.id ?? selectedBooking.booking_id ?? selectedBooking.bookings_id))}
                                onChange={(e) => {
                                  const bid = selectedBooking.id ?? selectedBooking.booking_id ?? selectedBooking.bookings_id
                                  const newStatus = e.target.value
                                  
                                  if (newStatus && newStatus !== String(selectedBooking.status || '').toLowerCase()) {
                                    let actionType: 'approve' | 'reject' | 'cancel'
                                    if (newStatus === 'approved') {
                                      actionType = 'approve'
                                    } else if (newStatus === 'rejected') {
                                      actionType = 'reject'
                                    } else if (newStatus === 'cancelled') {
                                      actionType = 'cancel'
                                    } else {
                                      actionType = 'approve' // fallback
                                    }
                                    
                                    setConfirmAction({
                                      type: actionType,
                                      bookingId: String(bid),
                                      booking: selectedBooking
                                    })
                                  }
                                }}
                                className={`font-semibold px-2 py-1 text-xs border rounded focus:outline-none focus:border-red-600 bg-white ${
                                  String(selectedBooking.status || '').toLowerCase() === 'approved' ? 'text-green-600 border-green-300' :
                                  String(selectedBooking.status || '').toLowerCase() === 'rejected' ? 'text-red-600 border-red-300' :
                                  String(selectedBooking.status || '').toLowerCase() === 'cancelled' ? 'text-yellow-600 border-yellow-300' :
                                  'text-gray-600 border-gray-300'
                                }`}
                                value={String(selectedBooking.status || '').toLowerCase()}
                              >
                                <option value="approved">อนุมัติ</option>
                                <option value="rejected">ไม่อนุมัติ</option>
                                <option value="cancelled">ยกเลิกการจอง</option>
                              </select>
                            ) : (
                              <p className={`font-semibold ${
                                String(selectedBooking.status || '').toLowerCase() === 'approved' ? 'text-green-600' :
                                String(selectedBooking.status || '').toLowerCase() === 'pending' ? 'text-yellow-600' :
                                String(selectedBooking.status || '').toLowerCase() === 'rejected' ? 'text-red-600' :
                                String(selectedBooking.status || '').toLowerCase() === 'cancelled' ? 'text-yellow-600' :
                                'text-gray-600'
                              }`}>
                                {selectedBooking.status || '-'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedSlips.length === 0 ? (
                    <p className="text-center text-gray-600">ไม่มีรูปใบเสร็จ</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedSlips.map((slipUrl, index) => (
                        <div key={index} className="border rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-600 mb-3">ใบเสร็จ</p>
                          <img
                            src={slipUrl}
                            alt={`Slip ${index + 1}`}
                            className="max-w-full max-h-[500px] mx-auto rounded border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.src = ''
                              e.currentTarget.textContent = 'ไม่สามารถโหลดรูปภาพได้'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmAction && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-lg w-full p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {(() => {
                      const isCancellationRequest = String(confirmAction.booking.status ?? '').toLowerCase() === 'request to cancel' ||
                        (Array.isArray(confirmAction.booking._items) && confirmAction.booking._items.some((it: any) => String(it.status ?? '').toLowerCase() === 'request to cancel'))
                      
                      if (isCancellationRequest) {
                        return 'ยืนยันการอนุมัติการยกเลิก'
                      } else if (confirmAction.type === 'approve') {
                        return 'ยืนยันการอนุมัติ'
                      } else if (confirmAction.type === 'cancel') {
                        return 'ยืนยันการยกเลิกการจอง'
                      } else {
                        return 'ยืนยันการไม่อนุมัติ'
                      }
                    })()}
                  </h3>
                  
                  {/* Booking Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                    <h4 className="font-semibold text-gray-900 mb-3">รายละเอียดการจอง</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">เลขที่การจอง:</span>
                        <p className="font-semibold text-gray-900">{confirmAction.booking.id || confirmAction.booking.booking_id || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">สนาม:</span>
                        <p className="font-semibold text-gray-900">{confirmAction.booking.field_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">ผู้จอง:</span>
                        <p className="font-semibold text-gray-900">{confirmAction.booking.username || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">เบอร์โทร:</span>
                        <p className="font-semibold text-gray-900">{confirmAction.booking.phone_number || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">วันที่:</span>
                        <p className="font-semibold text-gray-900">
                          {(() => {
                            try {
                              const date = confirmAction.booking.start_time ? new Date(confirmAction.booking.start_time) : null
                              return date ? date.toLocaleDateString('th-TH') : '-'
                            } catch (e) {
                              return '-'
                            }
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">เวลา:</span>
                        <p className="font-semibold text-gray-900">
                          {(() => {
                            try {
                              if (confirmAction.booking.timeSlots && Array.isArray(confirmAction.booking.timeSlots)) {
                                return confirmAction.booking.timeSlots.join(', ')
                              }
                              if (confirmAction.booking.start_time && confirmAction.booking.end_time) {
                                const start = new Date(confirmAction.booking.start_time)
                                const end = new Date(confirmAction.booking.end_time)
                                return `${start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                              }
                              return '-'
                            } catch (e) {
                              return '-'
                            }
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">ราคา:</span>
                        <p className="font-semibold text-gray-900">{(confirmAction.booking.expected_price || confirmAction.booking.total_price || 0).toLocaleString()} บาท</p>
                      </div>
                      <div>
                        <span className="text-gray-600">สถานะ:</span>
                        <p className={`font-semibold ${
                          String(confirmAction.booking.status || '').toLowerCase() === 'approved' ? 'text-green-600' :
                          String(confirmAction.booking.status || '').toLowerCase() === 'pending' ? 'text-yellow-600' :
                          String(confirmAction.booking.status || '').toLowerCase() === 'rejected' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {confirmAction.booking.status || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    {(() => {
                      const isCancellationRequest = String(confirmAction.booking.status ?? '').toLowerCase() === 'request to cancel' ||
                        (Array.isArray(confirmAction.booking._items) && confirmAction.booking._items.some((it: any) => String(it.status ?? '').toLowerCase() === 'request to cancel'))
                      
                      if (isCancellationRequest) {
                        return 'คุณต้องการอนุมัติการยกเลิกการจองนี้หรือไม่?'
                      } else if (confirmAction.type === 'approve') {
                        return 'คุณต้องการอนุมัติการจองนี้หรือไม่?'
                      } else if (confirmAction.type === 'cancel') {
                        return 'คุณต้องการยกเลิกการจองนี้หรือไม่?'
                      } else {
                        return 'คุณต้องการไม่อนุมัติการจองนี้หรือไม่?'
                      }
                    })()}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleConfirmAction}
                      disabled={updatingBookingIds.includes(confirmAction.bookingId)}
                      className={`px-4 py-2 rounded-lg text-white font-medium ${
                        (() => {
                          const isCancellationRequest = String(confirmAction.booking.status ?? '').toLowerCase() === 'request to cancel' ||
                            (Array.isArray(confirmAction.booking._items) && confirmAction.booking._items.some((it: any) => String(it.status ?? '').toLowerCase() === 'request to cancel'))
                          
                          if (isCancellationRequest) {
                            return 'bg-orange-600 hover:bg-orange-700'
                          } else if (confirmAction.type === 'approve') {
                            return 'bg-emerald-600 hover:bg-emerald-700'
                          } else if (confirmAction.type === 'cancel') {
                            return 'bg-orange-600 hover:bg-orange-700'
                          } else {
                            return 'bg-red-600 hover:bg-red-700'
                          }
                        })()
                      } disabled:opacity-50`}
                    >
                      {(() => {
                        const isCancellationRequest = String(confirmAction.booking.status ?? '').toLowerCase() === 'request to cancel' ||
                          (Array.isArray(confirmAction.booking._items) && confirmAction.booking._items.some((it: any) => String(it.status ?? '').toLowerCase() === 'request to cancel'))
                        
                        if (isCancellationRequest) {
                          return 'อนุมัติการยกเลิก'
                        } else if (confirmAction.type === 'approve') {
                          return 'อนุมัติ'
                        } else if (confirmAction.type === 'cancel') {
                          return 'ยกเลิกการจอง'
                        } else {
                          return 'ไม่อนุมัติ'
                        }
                      })()}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-6 mt-0">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2026 U-Sport Arena. All rights reserved.</p>
            <p className="mt-1">ระบบจองสนามกีฬาออนไลน์</p>
          </div>
        </div>
      </footer>
    </ProtectedRoute>
  )
}
