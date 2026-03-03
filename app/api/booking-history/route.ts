import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const fieldId = searchParams.get('fieldId')
    const userId = searchParams.get('userId')

    if (!fieldId || !userId) {
      return NextResponse.json({ error: 'Missing fieldId or userId' }, { status: 400 })
    }

    // Check if user has any approved/completed bookings for this field
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('field_id', Number(fieldId))
      .eq('user_id', userId)
      .in('status', ['approved', 'confirmed', 'completed'])
      .limit(1)

    if (error) {
      console.error('Error checking booking history:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const hasBooked = bookings && bookings.length > 0

    return NextResponse.json({ 
      hasBooked,
      message: hasBooked ? 'User has booked this field before' : 'User has not booked this field before'
    })

  } catch (error) {
    console.error('Error in booking history API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
