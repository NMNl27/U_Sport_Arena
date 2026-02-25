import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return { client: null, error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }
  }

  return { client: createClient(url, serviceKey), error: null }
}

export async function GET() {
  try {
    const { client: supabase, error } = getAdminClient()
    if (!supabase) return NextResponse.json({ error }, { status: 500 })

    // Prefer ordering by created_at; if column doesn't exist, retry without ordering
    const tryOrder = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
    if (!tryOrder.error) {
      return NextResponse.json({ data: tryOrder.data || [], status: 200 }, { status: 200 })
    }

    const msg = String(tryOrder.error?.message || '').toLowerCase()
    if (msg.includes('column') && msg.includes('created_at')) {
      const retry = await supabase.from('promotions').select('*')
      if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 })
      return NextResponse.json({ data: retry.data || [], status: 200 }, { status: 200 })
    }

    return NextResponse.json({ error: tryOrder.error.message }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { client: supabase, error } = getAdminClient()
    if (!supabase) return NextResponse.json({ error }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const insertPayload = body?.promotion ?? body

    if (!insertPayload || typeof insertPayload !== 'object') {
      return NextResponse.json({ error: 'Invalid promotion payload' }, { status: 400 })
    }

    const { data, error: insertError } = await supabase
      .from('promotions')
      .insert([insertPayload])
      .select('*')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ data, status: 200 }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { client: supabase, error } = getAdminClient()
    if (!supabase) return NextResponse.json({ error }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const { id, updates } = body || {}

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (!updates || typeof updates !== 'object') return NextResponse.json({ error: 'Invalid updates' }, { status: 400 })

    const { data, error: updateError } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ data, status: 200 }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { client: supabase, error } = getAdminClient()
    if (!supabase) return NextResponse.json({ error }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const id = body?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // First, update any bookings that reference this promotion to set promotion_id to NULL
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ promotion_id: null })
      .eq('promotion_id', id)

    if (updateError) {
      console.error('Error updating bookings:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Also delete any promotion_usage records
    const { error: usageError } = await supabase
      .from('promotion_usage')
      .delete()
      .eq('promotion_id', id)

    if (usageError) {
      console.error('Error deleting promotion usage:', usageError)
      // Don't fail the operation, but log the error
    }

    // Now delete the promotion
    const { error: deleteError } = await supabase.from('promotions').delete().eq('id', id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    return NextResponse.json({ status: 200 }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
