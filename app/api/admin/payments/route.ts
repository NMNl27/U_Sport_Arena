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
    const reqUrl = new URL(req.url)
    const bookingIdParam = reqUrl.searchParams.get('bookingId')
    if (!bookingIdParam) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    // Normalize booking id (prefer number)
    let bookingId: any = bookingIdParam
    if (/^\d+$/.test(bookingIdParam)) bookingId = Number(bookingIdParam)

    // Try both possible table names: 'payment' and 'payments'
    let rows: any[] = []
    try {
      const r = await supabase.from('payment').select('*').eq('booking_id', bookingId)
      if (!r.error) rows = r.data || []
    } catch (e) {
      rows = []
    }
    if (!rows || rows.length === 0) {
      try {
        const r2 = await supabase.from('payments').select('*').eq('booking_id', bookingId)
        if (!r2.error) rows = r2.data || []
      } catch (e) {
        rows = rows || []
      }
    }
    const urls: string[] = []
    for (const r of rows) {
      if (!r) continue
      if (Array.isArray(r.slip_urls) && r.slip_urls.length > 0) urls.push(...r.slip_urls.map((s: any) => String(s)))
      if (Array.isArray(r.slip_url) && r.slip_url.length > 0) urls.push(...r.slip_url.map((s: any) => String(s)))
      if (r.slip_url && typeof r.slip_url === 'string') urls.push(String(r.slip_url))
      if (r.slipUrl && typeof r.slipUrl === 'string') urls.push(String(r.slipUrl))
    }

    const uniq = Array.from(new Set(urls))
    return NextResponse.json({ data: uniq, status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
