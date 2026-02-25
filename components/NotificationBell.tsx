'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Trash2, X, Loader2 } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { cn } from '@/lib/utils'

const notificationTypeConfig = {
  booking: { color: 'bg-blue-500', label: 'การจอง' },
  payment: { color: 'bg-green-500', label: 'การชำระเงิน' },
  promotion: { color: 'bg-purple-500', label: 'โปรโมชั่น' },
  system: { color: 'bg-gray-500', label: 'ระบบ' },
  review: { color: 'bg-yellow-500', label: 'รีวิว' }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead
  } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'เมื่อสักครู่'
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ชั่วโมงที่แล้ว`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} วันที่แล้ว`
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  const handleNotificationClick = async (notificationId: string, isRead: boolean, type: string) => {
    if (!isRead) {
      await markAsRead(notificationId)
    }
    // Navigate based on notification type
    if (type === 'booking') {
      router.push('/bookings')
    }
    setIsOpen(false)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const handleDeleteAllRead = async () => {
    await deleteAllRead()
  }

  const hasReadNotifications = notifications.some(n => n.is_read)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="แจ้งเตือน"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">การแจ้งเตือน</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="อ่านทั้งหมด"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {hasReadNotifications && (
                <button
                  onClick={handleDeleteAllRead}
                  className="p-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="ลบที่อ่านแล้ว"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mb-2 text-gray-300" />
                <p>ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const typeConfig = notificationTypeConfig[notification.type]
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id, notification.is_read, notification.type)}
                      className={cn(
                        "flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                        !notification.is_read && "bg-blue-50/50"
                      )}
                    >
                      {/* Type Indicator */}
                      <div className={cn(
                        "w-2 h-2 mt-2 rounded-full flex-shrink-0",
                        typeConfig.color
                      )} />
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium text-gray-900",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {typeConfig.label}
                          </span>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="อ่านแล้ว"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
              <span className="text-xs text-gray-500">
                {notifications.length} รายการ | ยังไม่อ่าน {unreadCount} รายการ
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
