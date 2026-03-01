import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    // Check authentication and admin role
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookies().getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookies().set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized: Please login first' }, { status: 401 })
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData || roleData.role !== 'admin') {
      console.error('Admin check error:', roleError)
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Initialize admin client for file upload
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !serviceKey) {
      console.error('Missing environment variables:', { url: !!url, serviceKey: !!serviceKey })
      return NextResponse.json({ 
        error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' 
      }, { status: 500 })
    }

    const adminSupabase = createClient(url, serviceKey)

    const formData = await req.formData()
    const file = formData.get('file') as any
    
    if (!file) {
      console.error('No file provided in form data')
      return NextResponse.json({ error: 'Missing file in request' }, { status: 400 })
    }

    // Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size)
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const originalName = String(formData.get('filename') || file.name || 'upload')
    const filename = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const bucket = 'fields'

    console.log('Starting upload:', { filename, fileSize: file.size, fileType: file.type })

    // Check if bucket exists first
    const { data: buckets, error: bucketsError } = await adminSupabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return NextResponse.json({ error: 'Storage service error: Cannot list buckets' }, { status: 500 })
    }

    const bucketExists = buckets?.some(b => b.name === bucket)
    
    if (!bucketExists) {
      console.error('Bucket does not exist:', bucket)
      console.log('Available buckets:', buckets?.map(b => b.name))
      return NextResponse.json({ 
        error: `Storage bucket '${bucket}' does not exist. Please create it in Supabase dashboard.` 
      }, { status: 500 })
    }

    // Read file into ArrayBuffer then upload via service role
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('Uploading to bucket:', bucket, 'filename:', filename)

    const { data, error } = await adminSupabase.storage.from(bucket).upload(filename, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

    if (error) {
      console.error('Server upload error:', error)
      
      // Provide more specific error messages
      if (error.message?.includes('bucket not found')) {
        return NextResponse.json({ 
          error: `Storage bucket '${bucket}' does not exist. Please create it in Supabase dashboard with proper permissions.` 
        }, { status: 500 })
      }
      
      if (error.message?.includes('permission')) {
        return NextResponse.json({ 
          error: 'Permission denied. Check bucket permissions and ensure SERVICE_ROLE_KEY has storage access.' 
        }, { status: 500 })
      }
      
      if (error.message?.includes('duplicate')) {
        return NextResponse.json({ 
          error: 'File already exists. Please try again with a different file.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: `Upload failed: ${error.message || 'Unknown error'}` 
      }, { status: 500 })
    }

    console.log('Upload successful:', data)

    const { data: publicUrlData } = adminSupabase.storage.from(bucket).getPublicUrl(data.path)
    const publicUrl = publicUrlData?.publicUrl
    
    if (!publicUrl) {
      console.error('Failed to get public URL for uploaded file')
      return NextResponse.json({ error: 'Upload succeeded but failed to get public URL' }, { status: 500 })
    }

    console.log('Public URL generated:', publicUrl)
    return NextResponse.json({ publicUrl })
  } catch (e: any) {
    console.error('Unexpected server upload error:', e)
    
    // Provide more detailed error information for debugging
    const errorMessage = e?.message || String(e)
    const errorStack = e?.stack || ''
    
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    
    // Return user-friendly error message
    if (errorMessage.includes('ENOENT') || errorMessage.includes('file not found')) {
      return NextResponse.json({ error: 'File processing error: Unable to read uploaded file' }, { status: 400 })
    }
    
    if (errorMessage.includes('timeout')) {
      return NextResponse.json({ error: 'Upload timeout. Please try again with a smaller file.' }, { status: 408 })
    }
    
    if (errorMessage.includes('memory') || errorMessage.includes('buffer')) {
      return NextResponse.json({ error: 'File too large for processing. Please try with a smaller image.' }, { status: 413 })
    }
    
    return NextResponse.json({ 
      error: 'Unexpected upload error. Please try again or contact support if the problem persists.' 
    }, { status: 500 })
  }
}
