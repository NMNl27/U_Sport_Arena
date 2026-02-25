import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/notifications - Get notifications for current user
export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const reqUrl = new URL(req.url)
    
    const userId = reqUrl.searchParams.get('userId')
    const limit = parseInt(reqUrl.searchParams.get('limit') || '50')
    const unreadOnly = reqUrl.searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get unread count
    const { data: unreadData, error: countError } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: userId })

    if (countError) {
      console.error('Error getting unread count:', countError)
    }

    return NextResponse.json({ 
      data: notifications || [],
      unreadCount: unreadData || 0
    })
  } catch (e: any) {
    console.error('Unexpected error fetching notifications:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// POST /api/notifications - Create new notification (admin only or system)
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
      userId,
      title,
      message,
      type = 'system',
      relatedId
    } = body

    if (!userId || !title || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, title, message' 
      }, { status: 400 })
    }

    const insertObj = {
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      related_id: relatedId || null,
      created_at: new Date().toISOString()
    }

    const { data: created, error: createError } = await supabase
      .from('notifications')
      .insert(insertObj)
      .select()
      .single()

    if (createError) {
      console.error('Notification creation error:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data: created, 
      message: 'Notification created successfully'
    })
  } catch (e: any) {
    console.error('Unexpected notification creation error:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark notification(s) as read
export async function PATCH(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const body = await req.json().catch(() => ({}))

    const { notificationId, userId, markAllRead = false } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    if (markAllRead) {
      // Mark all notifications as read for user
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'All notifications marked as read' })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 })
    }

    // Mark single notification as read
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notification marked as read' })
  } catch (e: any) {
    console.error('Unexpected error updating notification:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// DELETE /api/notifications - Delete notification(s)
export async function DELETE(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)
    const reqUrl = new URL(req.url)
    
    const notificationId = reqUrl.searchParams.get('notificationId')
    const userId = reqUrl.searchParams.get('userId')
    const deleteAllRead = reqUrl.searchParams.get('deleteAllRead') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    if (deleteAllRead) {
      // Delete all read notifications for user
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true)

      if (error) {
        console.error('Error deleting read notifications:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'All read notifications deleted' })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notificationId parameter' }, { status: 400 })
    }

    // Delete single notification
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting notification:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notification deleted successfully' })
  } catch (e: any) {
    console.error('Unexpected error deleting notification:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
