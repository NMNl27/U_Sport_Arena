import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
    
    if (!fieldId || !date) {
      return NextResponse.json({ error: 'Missing fieldId or date parameter' }, { status: 400 })
    }

    console.log('Availability check - Field ID:', fieldId, 'Date:', date)

    // Query bookings for the specific field and date
    const { data: bookingsData, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('field_id', fieldId)
      .eq('booking_date', date)
      .in('status', ['pending', 'approved', 'confirmed', 'paid'])

    console.log('Availability check - Bookings found:', bookingsData?.length || 0)
    console.log('Availability check - Bookings data:', bookingsData)

    if (error) {
      console.error('Availability check - Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract time slots from bookings
    const bookedSlots: string[] = []
    if (Array.isArray(bookingsData)) {
      for (const booking of bookingsData) {
        // Check if booking has explicit time slots (preferred method)
        const timeSlots = booking.time_slots || booking.timeSlots || booking.slots
        if (Array.isArray(timeSlots)) {
          timeSlots.forEach(slot => bookedSlots.push(String(slot)))
          console.log('Debug - Found explicit time slots:', timeSlots)
        } else if (booking.start_time && booking.end_time) {
          // Derive time slots from start/end time (fallback method)
          try {
            const startTime = new Date(booking.start_time)
            const endTime = new Date(booking.end_time)
            
            // Generate hourly slots between start and end time
            let currentHour = startTime.getHours()
            const endHour = endTime.getHours()
            
            while (currentHour < endHour) {
              const nextHour = currentHour + 1
              const slotTime = `${currentHour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`
              bookedSlots.push(slotTime)
              currentHour = nextHour
            }
            console.log('Debug - Derived time slots from times:', bookedSlots)
          } catch (e) {
            console.error('Error parsing booking times:', e)
          }
        }
      }
    }

    console.log('Availability check - Booked slots:', bookedSlots)

    return NextResponse.json({ 
      bookedSlots,
      fieldId,
      date,
      totalBookings: bookingsData?.length || 0
    })
  } catch (e: any) {
    console.error('Availability check - Unexpected error:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
