"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ProtectedRoute from "@/components/ProtectedRoute"
import { supabase } from "@/lib/supabase"
import { Booking, Field } from "@/types/supabase"

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true)
        setError(null)

        // Prefer server-side admin endpoint (uses service-role key) to avoid RLS issues
        const resp = await fetch('/api/admin/bookings')
        const json = await resp.json()
        if (!resp.ok) {
          console.error('Error fetching bookings from admin API:', json)
          setError(json?.error || 'Failed to fetch bookings')
        } else {
          setBookings(json.data || [])
        }
      } catch (e) {
        console.error("Unexpected error:", e)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
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

  // --- Fields management ---
  const [fieldsList, setFieldsList] = useState<Field[]>([])
  const [updatingBookingIds, setUpdatingBookingIds] = useState<string[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [fieldsPkName, setFieldsPkName] = useState<string | null>(null)
  const [fieldsColumns, setFieldsColumns] = useState<string[] | null>(null)
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [fieldForm, setFieldForm] = useState({ name: "", Location: "", price: "", image_url: "", status: "available", type: "" })
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 5
  const [filterDate, setFilterDate] = useState<string | null>(null) // single-day filter
  // time filters removed — use single `filterDate` only

  const loadFields = async () => {
    setFieldsLoading(true)
    try {
      const { data, error } = await supabase.from("fields").select("*").order("name", { ascending: true })
      if (error) {
        console.error("Error loading fields:", error)
        return
      }

      const rows = data || []
      // detect primary key column name from returned row keys
      let pk: string | null = null
      let keys: string[] = []
      if (rows.length > 0) {
        keys = Object.keys(rows[0])
        const tableName = "fields"
        const singular = tableName.replace(/s$/, "")
        if (keys.includes("id")) pk = "id"
        else if (keys.includes(`${singular}_id`)) pk = `${singular}_id`
        else if (keys.includes(`${tableName}_id`)) pk = `${tableName}_id`
        else if (keys.includes("fieldId")) pk = "fieldId"
        else if (keys.includes("uuid")) pk = "uuid"
        else {
          // fallback to any *_id column
          const idKey = keys.find((k) => /_id$/.test(k))
          pk = idKey ?? keys[0]
        }
        console.debug("Admin: detected fields PK:", pk, "row keys:", keys)
      }

      setFieldsPkName(pk)
      setFieldsColumns(keys.length > 0 ? keys : null)

      // normalize rows to include `id` property for UI convenience
      const normalized = rows.map((r: any) => {
        const idVal = pk ? r[pk] : (r.id ?? r.field_id ?? r.fieldId ?? r.uuid)
        return { ...(r as any), id: idVal }
      })

      setFieldsList(normalized)
    } catch (e) {
      console.error("Unexpected error loading fields:", e)
    } finally {
      setFieldsLoading(false)
    }
  }

  const openAddField = () => {
    setEditingField(null)
    setFieldForm({ name: "", Location: "", price: "", image_url: "", status: "available", type: "" })
    setShowFieldForm(true)
  }

  const openEditField = (f: Field) => {
    setEditingField(f)
    setFieldForm({ name: f.name, Location: (f as any).Location || "", price: String(f.price), image_url: f.image_url || "", status: f.status, type: (f as any).type ?? "" })
    setShowFieldForm(true)
  }

  const saveField = async () => {
    if (!fieldForm.name || !fieldForm.price) {
      alert("กรุณากรอกชื่อและราคา")
      return
    }
    const priceNum = parseFloat(fieldForm.price)
    // Build initial payload
    let payload: Record<string, any> = {
      name: fieldForm.name,
      price: priceNum,
    }
    if (fieldForm.Location !== undefined) payload.Location = fieldForm.Location
    if (fieldForm.image_url !== undefined) payload.image_url = fieldForm.image_url
    if (fieldForm.status !== undefined) payload.status = fieldForm.status
    if (fieldForm.type !== undefined) payload.type = fieldForm.type

    // If we know actual columns for `fields` table, filter payload to only existing columns
    if (fieldsColumns && fieldsColumns.length > 0) {
      const allowed = new Set(fieldsColumns)
      payload = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.has(k)))
    }

    const handlePostgrestMissingColumn = (err: any) => {
      // PostgREST returns PGRST204 when a column isn't found; message contains the column name
      try {
        const msg: string = err?.message || ""
        const m = msg.match(/Could not find the '([^']+)' column/)
        if (m && m[1]) return m[1]
      } catch (e) {
        // ignore
      }
      return null
    }

    try {
      if (editingField) {
        // Retry loop: attempt update, if missing-column error, remove that key and retry
        let lastError: any = null
        let attemptPayload = { ...payload }
          // Build candidate PK names: prefer actual columns from `fieldsColumns`, add common fallbacks
          const candidateSet = new Set<string>()
          if (fieldsColumns && fieldsColumns.length > 0) {
            // prefer exact common names only if present
            ;["id", "field_id", "fields_id", "fieldId", "uuid"].forEach((c) => {
              if (fieldsColumns.includes(c)) candidateSet.add(c)
            })
            // add any column that ends with _id
            fieldsColumns.forEach((c) => { if (/_id$/.test(c)) candidateSet.add(c) })
            if (fieldsPkName) candidateSet.add(fieldsPkName)
          }
          // always include reasonable fallbacks (order matters)
          ;[fieldsPkName, "fields_id", "field_id", "id", "fieldId", "uuid"].forEach((c) => { if (c) candidateSet.add(c) })
          const candidates = Array.from(candidateSet).filter(Boolean) as string[]
          let updated = false
          for (const candidate of candidates) {
            try {
              // Work on a fresh copy for this candidate so we can remove keys on missing-column errors
              let attemptFiltered = (fieldsColumns && fieldsColumns.length > 0)
                ? Object.fromEntries(Object.entries(attemptPayload).filter(([k]) => fieldsColumns!.includes(k)))
                : { ...attemptPayload }

              let candidateValue = (editingField as any)[candidate] ?? editingField.id
              // Coerce numeric-looking PKs to numbers to match DB column types
              if (typeof candidateValue === 'string' && /^\d+$/.test(candidateValue)) {
                candidateValue = Number(candidateValue)
              }
              console.debug("Admin: trying update with pk=", candidate, "value=", candidateValue, "payload=", attemptFiltered)

              // Retry loop for missing-column errors: remove offending column and retry for same candidate
              let triedOnce = false
              while (true) {
                console.debug("Admin: attempting update via server API", { candidate, candidateValue, attemptFiltered })
                const apiResp = await fetch('/api/admin/fields', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ candidate, candidateValue, attemptFiltered }),
                })
                const res = await apiResp.json()
                console.debug("Admin: api update response", res)

                if (res.__diag) console.debug('Admin: server diagnostics', res.__diag)

                if (!res.error && res.data) {
                  const readRow = res.data as any

                  // Update fieldsList state immediately using the candidate PK
                  setFieldsList(prev => prev.map(f => {
                    const fPk = (f as any)[candidate] ?? f.id
                    if (String(fPk) === String(candidateValue)) {
                      return {
                        ...f,
                        ...readRow,
                        id: readRow[candidate] ?? readRow.fields_id ?? readRow.id ?? f.id,
                      }
                    }
                    return f
                  }))

                  // Compare attemptFiltered to readRow in a case-insensitive way
                  const readKeyMap: Record<string, string> = {}
                  Object.keys(readRow || {}).forEach((rk) => { readKeyMap[rk.toLowerCase()] = rk })

                  let changedInner = false
                  for (const k of Object.keys(attemptFiltered)) {
                    const matchedKey = readKeyMap[k.toLowerCase()] ?? k
                    const readVal = (readRow as any)[matchedKey]
                    const attemptVal = (attemptFiltered as any)[k]
                    if (String(readVal) !== String(attemptVal)) {
                      changedInner = true
                      break
                    }
                  }

                  // Show a simple confirmation to the admin (server returned the authoritative row)
                  alert("อัปเดตฐานข้อมูลเรียบร้อย")
                  updated = true
                  break
                }

                const msg: string = res.error?.message || ""
                const missing = handlePostgrestMissingColumn(res.error)
                // If result contains 0 rows or server returned Not Acceptable, treat as not-found for this candidate and try next
                if (res.error && (res.error?.code === "PGRST116" || res.status === 406 || /contains 0 rows/.test(msg) || /Cannot coerce the result to a single JSON object/.test(msg))) {
                  console.warn("Admin: update candidate did not match any row or returned unacceptable response, trying next candidate", candidate, candidateValue, res.error)
                  continue
                }
                if (missing && Object.prototype.hasOwnProperty.call(attemptFiltered, missing)) {
                  console.warn(`Admin: removing missing column from update payload: ${missing}`)
                  delete (attemptFiltered as any)[missing]
                  // if nothing left to send, stop retrying for this candidate
                  if (Object.keys(attemptFiltered).length === 0) break
                  // continue retrying with same candidate
                  triedOnce = true
                  continue
                }

                // If error indicates the candidate column itself is missing, stop and try next candidate
                if (/Could not find the '\w+' column/.test(msg) || (res.error?.code === "42703") || (res.error?.code === "PGRST204")) {
                  console.warn("Admin: PK candidate failed (column missing):", candidate, res.error)
                  break
                }

                console.error("Error updating field:", res.error)
                alert("เกิดข้อผิดพลาดในการอัปเดตสนาม")
                break
              }

              if (updated) break
            } catch (e) {
              console.error("Unexpected error during update attempt:", e)
            }
          }
          if (!updated) {
            console.error("Admin: update failed for all PK candidates")
          }
      } else {
        let lastError: any = null
        let attemptPayload = { ...payload }
        while (true) {
          try {
            const apiResp = await fetch('/api/admin/fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'insert', insertPayload: attemptPayload }),
            })
            const res = await apiResp.json()

            if (!res.error && res.data) {
              const readRow = res.data as any
              // normalize id and append to list
              const newRow = { ...(readRow as any), id: readRow.fields_id ?? readRow.id ?? readRow.field_id ?? readRow.fieldId ?? readRow.uuid }
              setFieldsList(prev => [...prev, newRow])
              alert("สร้างสนามเรียบร้อย")
              break
            }

            lastError = res.error
            const missing = handlePostgrestMissingColumn(res.error)
            if (missing && Object.prototype.hasOwnProperty.call(attemptPayload, missing)) {
              console.warn(`Admin: removing missing column from payload: ${missing}`)
              delete (attemptPayload as any)[missing]
              if (Object.keys(attemptPayload).length === 0) break
              continue
            }

            console.error("Error creating field:", res.error)
            alert("เกิดข้อผิดพลาดในการสร้างสนาม")
            break
          } catch (e) {
            console.error("Unexpected error creating field:", e)
            alert("เกิดข้อผิดพลาดในการสร้างสนาม")
            break
          }
        }
      }

      setShowFieldForm(false)
      await loadFields()
    } catch (e) {
      console.error("Unexpected error saving field:", e)
      alert("เกิดข้อผิดพลาด")
    }
  }

  const deleteField = async (id: string) => {
    if (!confirm("ต้องการลบสนามนี้หรือไม่?")) return
    try {
      // Try delete with multiple candidate PK names
        // Build candidate PK names similarly to update flow
        const deleteCandidateSet = new Set<string>()
        if (fieldsColumns && fieldsColumns.length > 0) {
          ["id", "field_id", "fields_id", "fieldId", "uuid"].forEach((c) => { if (fieldsColumns.includes(c)) deleteCandidateSet.add(c) })
          fieldsColumns.forEach((c) => { if (/_id$/.test(c)) deleteCandidateSet.add(c) })
          if (fieldsPkName) deleteCandidateSet.add(fieldsPkName)
        }
        ;[fieldsPkName, "fields_id", "field_id", "id", "fieldId", "uuid"].forEach((c) => { if (c) deleteCandidateSet.add(c) })
        const candidates = Array.from(deleteCandidateSet).filter(Boolean) as string[]
        let deleted = false
        for (const candidate of candidates) {
          try {
            let candidateValue: any = (fieldsList.find(f => f.id === id) as any)?.[candidate] ?? id
            if (typeof candidateValue === 'string' && /^\d+$/.test(candidateValue)) candidateValue = Number(candidateValue)

            const apiResp = await fetch('/api/admin/fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete', candidate, candidateValue }),
            })
            const res = await apiResp.json()
            if (!res.error) {
              // remove from local state using id field
              setFieldsList(prev => prev.filter(f => String((f as any)[candidate] ?? f.id) !== String(candidateValue)))
              deleted = true
              break
            }

            const msg: string = res.error?.message || ""
            if (/Could not find the '\\w+' column/.test(msg) || (res.error?.code === "42703") || (res.error?.code === "PGRST204")) {
              console.warn("Admin: delete candidate failed (column missing):", candidate, res.error)
              continue
            }

            console.error("Error deleting field:", res.error)
            alert("เกิดข้อผิดพลาดในการลบสนาม")
            return
          } catch (e) {
            console.error("Unexpected error deleting field:", e)
            alert("เกิดข้อผิดพลาดในการลบสนาม")
            return
          }
        }
        if (!deleted) {
          console.error("Admin: delete failed for all PK candidates")
          alert("เกิดข้อผิดพลาดในการลบสนาม")
          return
        }
      alert("ลบสนามเรียบร้อย")
    } catch (e) {
      console.error("Unexpected error deleting field:", e)
      alert("เกิดข้อผิดพลาด")
    }
  }

  useEffect(() => {
    loadFields()
  }, [])

  

  useEffect(() => {
    setCurrentPage(1)
  }, [bookings, filterDate])

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

  // Group bookings by identical created_at (or createdAt). For each group we:
  // - pick earliest start_time as group's start_time
  // - pick latest end_time as group's end_time
  // - sum expected_price for total price
  // - keep other fields from the first item (field_name, username, phone_number)
  const groupedByCreatedAt = (() => {
    const groups: Record<string, any[]> = {}
    for (const b of (filteredBookings || [])) {
      const created = String(b.created_at ?? b.createdAt ?? '').trim() || 'no-created'
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
      }
      out.push(merged)
    }

    // sort by start_time desc (preserve previous ordering behavior)
    out.sort((a, b) => {
      const ta = a.start_time ? Date.parse(String(a.start_time)) : 0
      const tb = b.start_time ? Date.parse(String(b.start_time)) : 0
      return tb - ta
    })
    return out
  })()

  // Apply date filter on grouped rows using the group's earliest start_time (first booking date)
  const groupedFilteredByDate = (() => {
    if (!filterDate) return groupedByCreatedAt

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
        const startYmd = getYmdFromRaw(g.start_time)
        if (!startYmd) return true
        return startYmd === filterDate
      } catch (err) {
        return true
      }
    })
  })()

  const totalPages = Math.max(1, Math.ceil(groupedFilteredByDate.length / itemsPerPage))
  const displayedBookings = groupedFilteredByDate.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <ProtectedRoute requireAdmin={true}>
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ผู้ดูแลระบบ (Admin)</h1>
            
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">ยินดีต้อนรับ</h2>
            <p className="text-gray-600">
              สามารถจัดการโปรโมชัน การจอง และสนาม/สถานที่ได้ที่นี่
            </p>
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <Link href="/admin/promotions" className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  จัดการโปรโมชั่น
                </Link>
                <Link href="/admin/usermanage" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  ดูผู้ใช้ทั้งหมด
                </Link>
              </div>
            </div>
          </div>

          {/* Bookings Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">รายการการจองทั้งหมด</h2>

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626] mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading bookings...</p>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4 items-end">
              <div>
                <label className="block text-sm text-gray-600">วันที่</label>
                <input type="date" value={filterDate ?? ''} onChange={(e) => setFilterDate(e.target.value || null)} className="px-2 py-1 border rounded" />
              </div>
              {/* time filter removed */}
              <div className="ml-2">
                <button onClick={() => { setFilterDate(null); }} className="px-3 py-1 bg-gray-100 rounded">ล้าง</button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && bookings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">No bookings found.</p>
              </div>
            )}

            {!loading && !error && bookings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">สนาม/สถานที่</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">วันที่</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">เวลา</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ราคา</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ชื่อผู้จอง</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">เบอร์โทร</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700" aria-label="actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedBookings.map((booking: any) => {
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

                      // Format time as HH.mm - HH.mm
                      const dotTime = (t: string) => String(t || '-').replace(':', '.')
                      const timeLine = `${dotTime(startTimeDisplay)} - ${dotTime(endTimeDisplay)}`

                      // Compute total price (use expected_price from server if present)
                      const totalPrice = (booking.expected_price !== null && booking.expected_price !== undefined)
                        ? Number(booking.expected_price)
                        : null
                      const totalPriceDisplay = totalPrice !== null ? `฿${totalPrice.toLocaleString('th-TH')}` : '-'

                      const paid = booking.paid_amount ?? booking.amount ?? null
                      const username = booking.username ?? booking.user_name ?? booking.user?.username ?? booking.user_id ?? ''

                      return (
                        <tr key={String(booking.id ?? booking.booking_id ?? booking.bookings_id ?? Math.random())} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-900">{String(booking.field_name ?? booking.field_id ?? '')}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{displayedDate || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{timeLine || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{totalPriceDisplay}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{String(username)}</td>
                           <td className="py-3 px-4 text-sm text-gray-900">{String(booking.phone_number ?? '-')}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            <div className="flex gap-2">
                              <button
                                disabled={updatingBookingIds.includes(String(booking.id ?? booking.booking_id ?? booking.bookings_id))}
                                onClick={async () => {
                                  const bid = booking.id ?? booking.booking_id ?? booking.bookings_id
                                  try {
                                    setUpdatingBookingIds(prev => [...prev, String(bid)])
                                    const resp = await fetch('/api/admin/bookings', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'update_status', bookingId: bid, status: 'approved' }),
                                    })
                                    const j = await resp.json()
                                    if (!resp.ok) {
                                      console.error('Failed to approve booking', j)
                                      alert('ไม่สามารถอนุมัติการจองได้')
                                    } else {
                                      // update local state
                                      setBookings(prev => prev.map((bk: any) => {
                                        const key = bk.id ?? bk.booking_id ?? bk.bookings_id
                                        if (String(key) === String(bid)) return { ...bk, status: 'approved' }
                                        return bk
                                      }))
                                    }
                                  } catch (e) {
                                    console.error(e)
                                    alert('เกิดข้อผิดพลาด')
                                  } finally {
                                    setUpdatingBookingIds(prev => prev.filter(x => x !== String(booking.id ?? booking.booking_id ?? booking.bookings_id)))
                                  }
                                }}
                                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                อนุมัติ
                              </button>

                              <button
                                disabled={updatingBookingIds.includes(String(booking.id ?? booking.booking_id ?? booking.bookings_id))}
                                onClick={async () => {
                                  const bid = booking.id ?? booking.booking_id ?? booking.bookings_id
                                  try {
                                    setUpdatingBookingIds(prev => [...prev, String(bid)])
                                    const resp = await fetch('/api/admin/bookings', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'update_status', bookingId: bid, status: 'rejected' }),
                                    })
                                    const j = await resp.json()
                                    if (!resp.ok) {
                                      console.error('Failed to reject booking', j)
                                      alert('ไม่สามารถไม่อนุมัติการจองได้')
                                    } else {
                                      setBookings(prev => prev.map((bk: any) => {
                                        const key = bk.id ?? bk.booking_id ?? bk.bookings_id
                                        if (String(key) === String(bid)) return { ...bk, status: 'rejected' }
                                        return bk
                                      }))
                                    }
                                  } catch (e) {
                                    console.error(e)
                                    alert('เกิดข้อผิดพลาด')
                                  } finally {
                                    setUpdatingBookingIds(prev => prev.filter(x => x !== String(booking.id ?? booking.booking_id ?? booking.bookings_id)))
                                  }
                                }}
                                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                ไม่อนุมัติ
                              </button>
                            </div>
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
                    รายการทั้งหมด: <span className="font-semibold">{displayedBookings.length}</span>
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
          {/* Fields Management Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">จัดการสนาม</h2>
              <div>
                <button onClick={openAddField} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">+ เพิ่มสนาม</button>
              </div>
            </div>

            {fieldsLoading ? (
              <div className="text-center py-8">กำลังโหลดสนาม...</div>
            ) : fieldsList.length === 0 ? (
              <div className="text-center py-8">ไม่มีสนาม</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldsList.map((f) => (
                  <div key={f.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{f.name}</h3>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            (String((f as any).status || "").toLowerCase() === "available") ? "bg-green-100 text-green-800" :
                            (String((f as any).status || "").toLowerCase() === "maintenance") ? "bg-yellow-100 text-yellow-800" :
                            (String((f as any).status || "").toLowerCase() === "unavailable") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {(f as any).status ?? "available"}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ml-2 ${
                            (String((f as any).type || "").toLowerCase() === "football") ? "bg-blue-100 text-blue-800" :
                            (String((f as any).type || "").toLowerCase() === "fitness") ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {(f as any).type ?? "-"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{(f as any).Location}</p>
                        <p className="mt-2 text-sm">ราคา: <span className="font-semibold">{f.price}</span> บาท</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => openEditField(f)} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded">แก้ไข</button>
                        <button onClick={() => deleteField(f.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded">ลบ</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Field Form Modal (simple) */}
            {showFieldForm && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                  <h3 className="text-lg font-semibold mb-4">{editingField ? "แก้ไขสนาม" : "สร้างสนามใหม่"}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">ชื่อสนาม</label>
                      <input value={fieldForm.name} onChange={(e) => setFieldForm({...fieldForm, name: e.target.value})} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">ราคา</label>
                      <input type="number" value={fieldForm.price} onChange={(e) => setFieldForm({...fieldForm, price: e.target.value})} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">สถานะ</label>
                      <select value={fieldForm.status} onChange={(e) => setFieldForm({...fieldForm, status: e.target.value})} className="w-full px-3 py-2 border rounded">
                        <option value="available">available</option>
                        <option value="maintenance">maintenance</option>
                        <option value="unavailable">unavailable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">ประเภท (type)</label>
                      <input value={fieldForm.type} onChange={(e) => setFieldForm({...fieldForm, type: e.target.value})} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">รูปภาพ (URL)</label>
                      <input value={fieldForm.image_url} onChange={(e) => setFieldForm({...fieldForm, image_url: e.target.value})} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium">ตำแหน่ง/สถานที่</label>
                      <textarea value={fieldForm.Location} onChange={(e) => setFieldForm({...fieldForm, Location: e.target.value})} className="w-full px-3 py-2 border rounded" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3 justify-end">
                    <button onClick={() => setShowFieldForm(false)} className="px-4 py-2 bg-gray-200 rounded">ยกเลิก</button>
                    <button onClick={saveField} className="px-4 py-2 bg-green-600 text-white rounded">บันทึก</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          
        </div>
      </main>
    </ProtectedRoute>
  )
}
