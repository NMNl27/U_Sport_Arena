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

    // Query `users` table directly for role = 'user' and map expected fields.
    // Try ordering by `id`. If the column doesn't exist, retry without ordering.
    let users: any[] | null = null
    let usersError: any = null

    const tryOrder = await supabase.from('users').select('*').eq('role', 'user').order('id', { ascending: false })
    users = tryOrder.data
    usersError = tryOrder.error

    if (usersError) {
      const msg = String(usersError?.message || '').toLowerCase()
      if (msg.includes('column') && msg.includes('id')) {
        const retry = await supabase.from('users').select('*').eq('role', 'user')
        users = retry.data
        usersError = retry.error
      }
    }

    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    const combined = (users || []).map((u: any) => {
      return {
        id: u.id ?? u.user_id ?? u.uid ?? null,
        username: u.username ?? u.name ?? u.full_name ?? u.display_name ?? null,
        email: u.email ?? u.email_address ?? null,
        phone_number: u.phone_number ?? u.phone ?? null,
        membership_type: u.membership_type ?? null,
      }
    })

    return NextResponse.json({ data: combined, status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
