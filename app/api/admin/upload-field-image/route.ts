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

    const formData = await req.formData()
    const file = formData.get('file') as any
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const originalName = String(formData.get('filename') || file.name || 'upload')
    const filename = `${Date.now()}_${originalName}`
    const bucket = 'fields'

    // Read file into ArrayBuffer then upload via service role
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage.from('fields').upload(filename, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

    if (error) {
      console.error('Server upload error:', error)
      return NextResponse.json({ error: error.message || error }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return NextResponse.json({ publicUrl: publicUrlData?.publicUrl || null })
  } catch (e: any) {
    console.error('Unexpected server upload error:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
