import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const { data: bookings, error: bookingsError } = await supabase.from('bookings').select('*').order('start_time', { ascending: false })
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

    // Fetch payments for booking ids to get paid amounts
    let paymentsMap: Record<string, any> = {}
    if (bookingIds.length > 0) {
      const { data: pays } = await supabase.from('payments').select('*').in('booking_id', bookingIds)
      ;(pays || []).forEach((p: any) => {
        const key = p.booking_id ?? p.bookingId
        if (key) {
          const amt = Number(p.amount ?? 0)
          paymentsMap[String(key)] = (paymentsMap[String(key)] || 0) + amt
        }
      })
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
      // compute expected price based on field price and duration, applying promotion if present
      let expected_price: number | null = null
      try {
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
      } catch (err) {
        expected_price = null
      }

      return {
        ...b,
        field_name: fieldKey ? (fieldsMap[String(fieldKey)]?.name ?? fieldsMap[String(fieldKey)]?.title ?? null) : null,
        username: usernameVal,
        phone_number: userObj ? (userObj.phone_number ?? userObj.phone ?? null) : null,
        paid_amount: bookingKey ? (paymentsMap[String(bookingKey)] ?? null) : null,
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

      const { data, error } = await supabase.from('bookings').update({ status }).eq('id', candidateId).select().single()
      if (error) return NextResponse.json({ error: error.message || error }, { status: 500 })

      return NextResponse.json({ data, status: 200 })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
