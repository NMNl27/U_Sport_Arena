import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    // Allow filtering by userId or email via query params
    const reqUrl = new URL(req.url)
    const userIdParam = reqUrl.searchParams.get('userId')
    const emailParam = reqUrl.searchParams.get('email')

    let bookingsRes: any = null
    const orderOpts = { ascending: false }
    if (userIdParam) {
      // Try plausible user-id column names safely, stop at first that doesn't raise an error
      const cols = ['user_id', 'userId', 'user', 'profile_id']
      for (const col of cols) {
        const res = await supabase.from('bookings').select('*').eq(col, userIdParam).order('start_time', orderOpts)
        if (!res.error) {
          bookingsRes = res
          break
        }
      }
      // fallback to empty result if none worked
      if (!bookingsRes) bookingsRes = { data: [], error: null }
    } else if (emailParam) {
      const cols = ['user_email', 'email']
      for (const col of cols) {
        const res = await supabase.from('bookings').select('*').eq(col, emailParam).order('start_time', orderOpts)
        if (!res.error) {
          bookingsRes = res
          break
        }
      }
      if (!bookingsRes) bookingsRes = { data: [], error: null }
    } else {
      bookingsRes = await supabase.from('bookings').select('*').order('start_time', orderOpts)
    }

    const bookings = bookingsRes.data
    const bookingsError = bookingsRes.error
    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 })
    }

    const bArr: any[] = bookings || []
    const fieldIds = Array.from(new Set(bArr.map((b) => b.field_id ?? b.fieldId ?? b.field).filter(Boolean)))
    const userIds = Array.from(new Set(bArr.map((b) => b.user_id ?? b.userId).filter(Boolean)))
    const bookingIds = Array.from(new Set(bArr.map((b) => b.id ?? b.booking_id ?? b.bookings_id).filter(Boolean)))
    const promotionIds = Array.from(new Set(bArr.map((b) => b.promotion_id ?? b.promotion ?? null).filter(Boolean)))

    // Fetch related fields by id or fields_id
    let fieldsMap: Record<string, any> = {}
    if (fieldIds.length > 0) {
      const { data: f1 } = await supabase.from('fields').select('*').in('id', fieldIds)
      const { data: f2 } = await supabase.from('fields').select('*').in('fields_id', fieldIds)
      const fields = [...(f1 || []), ...(f2 || [])]
      fields.forEach((f: any) => {
        const key = f.id ?? f.fields_id ?? f.field_id ?? f.fieldId ?? f.uuid
        if (key) fieldsMap[String(key)] = f
      })
    }

    // Fetch users (users table) or profiles fallback
    let usersMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: u1 } = await supabase.from('users').select('*').in('user_id', userIds)
      const { data: u2 } = await supabase.from('profiles').select('*').in('id', userIds)
      const users = [...(u1 || []), ...(u2 || [])]
      users.forEach((u: any) => {
        const key = u.user_id ?? u.id ?? u.uid
        if (key) usersMap[String(key)] = u
      })
    }

    // Fetch payments for booking ids to get paid amounts and slip URLs
    let paymentsMap: Record<string, any> = {}
    let slipsMap: Record<string, string[]> = {}
    if (bookingIds.length > 0) {
      // Try both 'payment' and 'payments' table names to handle schema variations
      let pays: any[] | null = null
      try {
        const r = await supabase.from('payment').select('*').in('booking_id', bookingIds)
        if (!r.error) pays = r.data || []
      } catch (e) {
        pays = null
      }
      if (pays === null) {
        try {
          const r2 = await supabase.from('payments').select('*').in('booking_id', bookingIds)
          if (!r2.error) pays = r2.data || []
        } catch (e) {
          pays = []
        }
      }

      ;(pays || []).forEach((p: any) => {
        const key = p.booking_id ?? p.bookingId
        if (key) {
          const amt = Number(p.amount ?? 0)
          paymentsMap[String(key)] = (paymentsMap[String(key)] || 0) + amt

          // Collect slip URLs (support different column names)
          const collect = (val: any) => {
            if (!val) return
            if (Array.isArray(val)) return val.forEach((v) => { if (v) {
              const arr = slipsMap[String(key)] || []
              arr.push(String(v))
              slipsMap[String(key)] = arr
            } })
            if (typeof val === 'string') {
              const arr = slipsMap[String(key)] || []
              arr.push(val)
              slipsMap[String(key)] = arr
            }
          }
          collect(p.slip_url)
          collect(p.slipUrl)
          collect(p.slip_urls)
        }
      })

      // If there are payments for bookings, update bookings.payment_status = 'Paid'
      try {
        const paidBookingIds = Object.keys(paymentsMap)
        if (paidBookingIds.length > 0) {
          // coerce numeric ids where possible
          const numericIds = paidBookingIds.map((id) => (/^\d+$/.test(String(id)) ? Number(id) : id))
          await supabase.from('bookings').update({ payment_status: 'Paid' }).in('id', numericIds)
        }
      } catch (err) {
        // don't fail the overall request if update fails; log server-side
        console.error('Failed to update booking payment_status:', err)
      }
    }

    // Fetch promotions
    let promotionsMap: Record<string, any> = {}
    if (promotionIds.length > 0) {
      const { data: promos } = await supabase.from('promotions').select('*').in('id', promotionIds)
      ;(promos || []).forEach((pr: any) => { if (pr && pr.id) promotionsMap[String(pr.id)] = pr })
    }

    // Merge related info into booking rows
    const enriched = bArr.map((b) => {
      const fieldKey = b.field_id ?? b.fieldId ?? b.field
      const userKey = b.user_id ?? b.userId
      const bookingKey = b.id ?? b.booking_id ?? b.bookings_id
      const userObj = userKey ? usersMap[String(userKey)] : null
      const usernameVal = userObj ? (
        userObj.username ?? userObj.name ?? userObj.full_name ?? userObj.display_name ?? userObj.email ?? null
      ) : null
      // Use the actual stored total_price from database, fallback to calculated expected_price if not available
      let expected_price: number | null = null
      try {
        // First try to use the stored total_price from the booking
        expected_price = b.total_price ?? b.totalPrice ?? null
        
        // If no stored price, calculate it as fallback
        if (expected_price === null) {
          const fieldObj = fieldKey ? fieldsMap[String(fieldKey)] : null
          // Prefer explicit `price` column from `fields` table and coerce to number
          const rawRate = fieldObj ? (fieldObj.price ?? fieldObj.price_per_hour ?? fieldObj.pricePerHour ?? 0) : 0
          const rate = Number(rawRate ?? 0)
          if (b.start_time && b.end_time && rate) {
            const s = new Date(b.start_time)
            const e = new Date(b.end_time)
            let hours = Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60))
            // round to 2 decimals
            hours = Math.round(hours * 100) / 100
            let amount = rate * hours
            const promoId = b.promotion_id ?? b.promotion ?? null
            if (promoId && promotionsMap[String(promoId)]) {
              const promo = promotionsMap[String(promoId)]
              if (promo.discount_amount) {
                amount = Math.max(0, amount - Number(promo.discount_amount))
              } else if (promo.discount_percentage) {
                amount = amount * (1 - Number(promo.discount_percentage) / 100)
              }
            }
            expected_price = Math.round(amount * 100) / 100
          }
        }
      } catch (err) {
        expected_price = null
      }

      return {
        ...b,
        field_name: fieldKey ? (fieldsMap[String(fieldKey)]?.name ?? fieldsMap[String(fieldKey)]?.title ?? null) : null,
        username: usernameVal,
        phone_number: userObj ? (userObj.phone_number ?? userObj.phone ?? null) : null,
        paid_amount: bookingKey ? (paymentsMap[String(bookingKey)] ?? null) : null,
        slip_urls: bookingKey ? (slipsMap[String(bookingKey)] ?? []) : [],
        expected_price,
      }
    })

    return NextResponse.json({ data: enriched, status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const body = await req.json().catch(() => ({}))
    const action = body?.action ?? null

    if (action === 'update_status') {
      const bookingId = body?.bookingId ?? body?.id
      const status = body?.status
      if (!bookingId || typeof status === 'undefined' || status === null) {
        return NextResponse.json({ error: 'Missing bookingId or status' }, { status: 400 })
      }

      // coerce numeric id
      const candidateId = (typeof bookingId === 'string' && /^\d+$/.test(bookingId)) ? Number(bookingId) : bookingId

      // Get booking info before update to get user_id and field_id
      const { data: bookingBefore, error: fetchError } = await supabase
        .from('bookings')
        .select('user_id, status, field_id, start_time, end_time')
        .eq('id', candidateId)
        .single()

      if (fetchError) {
        console.error('Error fetching booking before update:', fetchError)
      }

      // Fetch field name if field_id exists
      let fieldName = ''
      console.log('Debug - bookingBefore:', bookingBefore)
      console.log('Debug - field_id:', bookingBefore?.field_id)
      
      if (bookingBefore?.field_id) {
        try {
          const { data: fieldData, error: fieldError } = await supabase
            .from('fields')
            .select('name')
            .eq('fields_id', bookingBefore.field_id)
            .single()
          
          console.log('Debug - fieldData:', fieldData, 'fieldError:', fieldError)
          
          if (fieldData?.name) {
            fieldName = fieldData.name
          }
        } catch (e) {
          console.error('Error fetching field name:', e)
        }
      }
      
      // Also check if booking has field_name already stored
      if (!fieldName && (bookingBefore as any)?.field_name) {
        fieldName = (bookingBefore as any).field_name
      }
      
      console.log('Debug - final fieldName:', fieldName)

      const { data, error } = await supabase.from('bookings').update({ status }).eq('id', candidateId).select().single()
      if (error) return NextResponse.json({ error: error.message || error }, { status: 500 })

      // Create notification for user if status changed and user exists
      // Skip if status is 'request to cancel' (user already knows they requested it)
      if (bookingBefore?.user_id && bookingBefore.status !== status && status !== 'request to cancel') {
        const statusText: Record<string, string> = {
          'confirmed': 'อนุมัติ',
          'approved': 'อนุมัติ',
          'cancelled': 'ยกเลิก',
          'rejected': 'ปฏิเสธ',
          'pending': 'รอดำเนินการ',
          'completed': 'เสร็จสิ้น'
        }

        const notificationTitle = `การจอง${statusText[status] || status}`
        
        // Build detailed message with field name and time
        let notificationMessage = ''
        if (fieldName) {
          notificationMessage = `การจองสนาม ${fieldName}`
          if (bookingBefore.start_time) {
            const date = new Date(bookingBefore.start_time)
            const thaiDate = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
            const thaiTime = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            notificationMessage += ` วันที่ ${thaiDate} เวลา ${thaiTime}`
          }
          notificationMessage += ` ถูก${statusText[status] || status}`
        } else {
          notificationMessage = `การจองของคุณถูก${statusText[status] || status}`
        }
        notificationMessage += ' โดยผู้ดูแลระบบ'

        try {
          // Only set related_id if bookingId looks like a UUID
          const isUUID = typeof bookingId === 'string' && 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
          
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: bookingBefore.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: 'booking',
            is_read: false,
            related_id: isUUID ? bookingId : null,
            created_at: new Date().toISOString()
          })

          if (notifError) {
            console.error('Error creating notification:', notifError)
          }
        } catch (notifErr) {
          console.error('Exception creating notification:', notifErr)
        }
      }

      return NextResponse.json({ data, status: 200 })
    }

    if (action === 'create') {
      // Create a bookings row from provided tempBooking data
      const tb = body?.tempBooking ?? body
      if (!tb) return NextResponse.json({ error: 'Missing booking data' }, { status: 400 })

      // Map possible fields
      const fieldId = tb.fieldId ?? tb.field_id ?? tb.field ?? null
      const totalPrice = Number(tb.finalPrice ?? tb.totalPrice ?? 0)
      const status = tb.status ?? 'pending'
      const bookingDate = tb.bookingDate ?? null
      const appliedPromotion = tb.appliedPromotion ?? null
      const promotionId = appliedPromotion?.id ?? appliedPromotion?.promotion_id ?? null

      // Parse bookingDate and timeSlots to start_time / end_time if possible
      let start_time: string | null = null
      let end_time: string | null = null
      try {
        const bookingDateForTime = tb.bookingDate
        const slots = tb.timeSlots ?? []
        if (bookingDateForTime && Array.isArray(slots) && slots.length > 0) {
          // slots likely like "10:00-11:00". Use first and last
          const first = slots[0]
          const last = slots[slots.length - 1]
          const startPart = first.split('-')[0]?.trim()
          const endPart = last.split('-')[1]?.trim() ?? last.split('-')[0]?.trim()
          if (startPart) start_time = new Date(`${bookingDateForTime}T${startPart}:00`).toISOString()
          if (endPart) end_time = new Date(`${bookingDateForTime}T${endPart}:00`).toISOString()
        }
      } catch (e) {
        start_time = null
        end_time = null
      }

      const userId = body?.userId ?? body?.user_id ?? null

      const insertObj: any = {
        field_id: fieldId,
        start_time: start_time,
        end_time: end_time,
        status,
        total_price: totalPrice,
        user_id: userId,
        booking_date: bookingDate,
        promotion_id: promotionId,
      }

      // remove undefined/null keys
      Object.keys(insertObj).forEach((k) => { if (insertObj[k] === null || typeof insertObj[k] === 'undefined') delete insertObj[k] })

      const { data: created, error: createError } = await supabase.from('bookings').insert(insertObj).select().limit(1).maybeSingle()
      if (createError) return NextResponse.json({ error: createError.message || createError }, { status: 500 })

      return NextResponse.json({ data: created, status: 200 })
    }

    if (action === 'update_payment_status') {
      const bookingId = body?.bookingId ?? body?.id
      const payment_status = body?.payment_status ?? body?.paymentStatus ?? body?.status ?? 'paid'
      if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

      const candidateId = (typeof bookingId === 'string' && /^[0-9]+$/.test(bookingId)) ? Number(bookingId) : bookingId
      const { data, error } = await supabase.from('bookings').update({ payment_status }).eq('id', candidateId).select().maybeSingle()
      if (error) return NextResponse.json({ error: error.message || error }, { status: 500 })

      return NextResponse.json({ data, status: 200 })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
