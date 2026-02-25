'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import type { Notification } from '@/types/supabase'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  deleteAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!profile?.user_id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/notifications?userId=${profile.user_id}&limit=50`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      const data = await response.json()
      setNotifications(data.data || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.user_id])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!profile?.user_id) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, userId: profile.user_id })
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [profile?.user_id])

  const markAllAsRead = useCallback(async () => {
    if (!profile?.user_id) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.user_id, markAllRead: true })
      })

      if (!response.ok) {
        throw new Error('Failed to mark all as read')
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }, [profile?.user_id])

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!profile?.user_id) return

    try {
      const response = await fetch(
        `/api/notifications?notificationId=${notificationId}&userId=${profile.user_id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      // Update local state
      const deleted = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [profile?.user_id, notifications])

  const deleteAllRead = useCallback(async () => {
    if (!profile?.user_id) return

    try {
      const response = await fetch(
        `/api/notifications?userId=${profile.user_id}&deleteAllRead=true`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete read notifications')
      }

      // Update local state
      setNotifications(prev => prev.filter(n => !n.is_read))
    } catch (error) {
      console.error('Error deleting read notifications:', error)
    }
  }, [profile?.user_id])

  // Fetch notifications when user changes
  useEffect(() => {
    if (profile?.user_id) {
      fetchNotifications()
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [profile?.user_id, fetchNotifications])

  // Polling for new notifications every 30 seconds
  useEffect(() => {
    if (!profile?.user_id) return

    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [profile?.user_id, fetchNotifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
