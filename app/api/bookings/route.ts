import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const body = await req.json().catch(() => ({}))

    const {
      fieldId,
      bookingDate,
      timeSlots,
      totalPrice,
      userId,
      promotionId,
      status = 'pending'
    } = body

    if (!fieldId || !bookingDate || !timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: fieldId, bookingDate, timeSlots' }, { status: 400 })
    }

    console.log('Creating booking:', { fieldId, bookingDate, timeSlots, totalPrice, userId, promotionId })
    console.log('User ID value:', userId, 'Type:', typeof userId, 'Is null:', userId === null, 'Is undefined:', userId === undefined)

    // Parse bookingDate and timeSlots to start_time / end_time
    let start_time: string | null = null
    let end_time: string | null = null
    try {
      if (bookingDate && Array.isArray(timeSlots) && timeSlots.length > 0) {
        // timeSlots likely like "13:00 - 14:00". Use first and last
        const first = timeSlots[0]
        const last = timeSlots[timeSlots.length - 1]
        const startPart = first.split('-')[0]?.trim()
        const endPart = last.split('-')[1]?.trim() || last.split('-')[0]?.trim()
        if (startPart) start_time = new Date(`${bookingDate}T${startPart}:00`).toISOString()
        if (endPart) end_time = new Date(`${bookingDate}T${endPart}:00`).toISOString()
      }
    } catch (e) {
      console.error('Error parsing booking times:', e)
      return NextResponse.json({ error: 'Invalid time format' }, { status: 400 })
    }

    const insertObj: any = {
      field_id: fieldId,
      start_time,
      end_time,
      status,
      total_price: Number(totalPrice) || 0,
      booking_date: bookingDate,
      time_slots: timeSlots, // Store the explicit time slots
      user_id: userId,
      promotion_id: promotionId,
      created_at: new Date().toISOString()
    }

    // Remove undefined/null keys
    Object.keys(insertObj).forEach((k) => { 
      if (insertObj[k] === null || typeof insertObj[k] === 'undefined') delete insertObj[k] 
    })

    console.log('Inserting booking:', insertObj)
    console.log('user_id in insertObj:', insertObj.user_id, 'Type:', typeof insertObj.user_id)

    const { data: created, error: createError } = await supabase
      .from('bookings')
      .insert(insertObj)
      .select()
      .single()

    if (createError) {
      console.error('Booking creation error:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    console.log('Booking created successfully:', created)

    // Record promotion usage if promotion was used
    if (promotionId && userId) {
      const { error: usageError } = await supabase
        .from('promotion_usage')
        .insert({
          promotion_id: promotionId,
          user_id: userId,
          booking_id: created.id
        })
      
      if (usageError) {
        console.error('Error recording promotion usage:', usageError)
        // Don't fail the booking, but log the error
      }
    }

    return NextResponse.json({ 
      data: created, 
      message: 'Booking created successfully',
      status: 200 
    })
  } catch (e: any) {
    console.error('Unexpected booking creation error:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const reqUrl = new URL(req.url)
    
    const fieldId = reqUrl.searchParams.get('fieldId')
    const date = reqUrl.searchParams.get('date')
    const userId = reqUrl.searchParams.get('userId')

    let query = supabase.from('bookings').select('*')

    if (fieldId) query = query.eq('field_id', fieldId)
    if (date) query = query.eq('booking_date', date)
    if (userId) query = query.eq('user_id', userId)

    const { data: bookings, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: bookings || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
