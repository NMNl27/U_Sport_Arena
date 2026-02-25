import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action } = body as any

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRole) {
      return NextResponse.json({ error: { message: 'Missing server Supabase configuration' } }, { status: 500 })
    }

    const admin = createClient(url, serviceRole)

    if (action === 'insert') {
      const { insertPayload } = body as any
      if (!insertPayload || typeof insertPayload !== 'object') {
        return NextResponse.json({ error: { message: 'Invalid insertPayload' } }, { status: 400 })
      }

      const { data, error, status } = await admin.from('fields').insert([insertPayload]).select().maybeSingle()
      const diag = { action: 'insert', insertPayload, supabase: { status, error: error ? { message: error.message, code: error.code } : null, data: data ?? null } }
      return NextResponse.json({ data, error: error ? { message: error.message, code: error.code, status } : null, status, __diag: diag })
    }

    if (action === 'delete') {
      const { candidate, candidateValue } = body as any
      if (!candidate || typeof candidate !== 'string') {
        return NextResponse.json({ error: { message: 'Invalid candidate' } }, { status: 400 })
      }

      // Only allow known PK candidates to avoid SQL injection or invalid column names
      const allowedCandidates = new Set(['fields_id', 'field_id', 'fields_id', 'id', 'fieldId', 'uuid'])
      if (!allowedCandidates.has(candidate)) {
        return NextResponse.json({ error: { message: `Disallowed candidate column: ${candidate}` } }, { status: 400 })
      }

      let pkValue: any = candidateValue
      if (typeof pkValue === 'string' && /^\d+$/.test(pkValue)) pkValue = Number(pkValue)

      const { data, error, status } = await admin
        .from('fields')
        .delete()
        .eq(candidate, pkValue)
        .select('*')
        .maybeSingle()

      const diag = { action: 'delete', candidate, candidateValue, supabase: { status, error: error ? { message: error.message, code: error.code } : null, data: data ?? null } }
      return NextResponse.json({ data, error: error ? { message: error.message, code: error.code, status } : null, status, __diag: diag })
    }

    if (action === 'update_vip_status') {
      const { fieldId, vip } = body as any
      if (!fieldId || typeof vip !== 'boolean') {
        return NextResponse.json({ error: { message: 'Invalid fieldId or vip status' } }, { status: 400 })
      }

      const { data, error } = await admin
        .from('fields')
        .update({ vip })
        .eq('fields_id', fieldId)
        .select('*')
        .maybeSingle()

      return NextResponse.json({ 
        data, 
        error: error ? { message: error.message, code: error.code } : null, 
        status: error ? 'error' : 'ok'
      })
    }

    // Default: treat as update (existing behavior)
    const { candidate, candidateValue, attemptFiltered } = body as any

    // Basic validation / sanitization for update
    if (!candidate || typeof candidate !== 'string') {
      return NextResponse.json({ error: { message: 'Invalid candidate' } }, { status: 400 })
    }
    if (!attemptFiltered || typeof attemptFiltered !== 'object') {
      return NextResponse.json({ error: { message: 'Invalid attemptFiltered payload' } }, { status: 400 })
    }

    // Only allow known PK candidates to avoid SQL injection or invalid column names
    const allowedCandidates = new Set(['fields_id', 'field_id', 'fields_id', 'id', 'fieldId', 'uuid'])
    if (!allowedCandidates.has(candidate)) {
      return NextResponse.json({ error: { message: `Disallowed candidate column: ${candidate}` } }, { status: 400 })
    }

    // Coerce numeric-looking candidateValue for id columns
    let pkValue: any = candidateValue
    if (typeof pkValue === 'string' && /^\d+$/.test(pkValue)) pkValue = Number(pkValue)

    const { data, error, status } = await admin
      .from('fields')
      .update(attemptFiltered)
      .eq(candidate, pkValue)
      .select('*')
      .maybeSingle()

    return NextResponse.json({ 
      data, 
      error: error ? { message: error.message, code: error.code } : null, 
      status: error ? 'error' : 'ok'
    })
  } catch (e: any) {
    return NextResponse.json({ error: { message: String(e) } }, { status: 500 })
  }
}

export async function GET(req: Request) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !serviceRole) {
          return NextResponse.json({ error: { message: 'Missing server Supabase configuration' } }, { status: 500 })
        }

        const supabase = createClient(url, serviceRole)

        const { data, error } = await supabase.from("fields").select("*").order("name", { ascending: true })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
      } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
      }
    }
