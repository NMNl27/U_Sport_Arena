import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const body = await req.json()
    let { bookingId, slipUrl, amount, paymentMethod } = body

    if (!bookingId || !slipUrl || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Normalize bookingId: prefer number, otherwise extract numeric portion if present
    if (typeof bookingId === 'string') {
      if (/^\d+$/.test(bookingId)) {
        bookingId = parseInt(bookingId, 10)
      } else {
        // extract digit groups, prefer the longest group
        const groups = bookingId.match(/\d+/g)
        if (groups && groups.length > 0) {
          // choose the longest numeric group to avoid truncation
          const longest = groups.reduce((a, b) => (b.length > a.length ? b : a), groups[0])
          bookingId = parseInt(longest, 10)
        }
      }
    }

    // If after normalization bookingId is still not a number, error out
    if (typeof bookingId !== 'number' || Number.isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking id format' },
        { status: 400 }
      )
    }

    console.log('Saving payment with:', { bookingId, slipUrl, amount, paymentMethod })

    // Call the PostgreSQL function via RPC (bypasses RLS)
    const response = await fetch(`${url}/rest/v1/rpc/insert_payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_booking_id: bookingId,
        p_payment_method: paymentMethod || 'promptpay',
        p_slip_url: slipUrl,
        p_amount: parseFloat(amount),
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Error saving payment record:', responseData)
      return NextResponse.json(
        { error: `Failed to save payment: ${responseData?.message || responseData?.error_description || JSON.stringify(responseData)}` },
        { status: 500 }
      )
    }

    console.log('Payment saved successfully:', responseData)

    // Update booking status
    await fetch(`${url}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        status: 'payment_pending',
        updated_at: new Date().toISOString(),
      }),
    }).catch(err => console.error('Error updating booking:', err))

    return NextResponse.json(
      {
        success: true,
        message: 'Payment record saved successfully',
        data: responseData,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
