"use client"

import { useEffect, useState } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import Link from "next/link"

export default function UserManagePage() {
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const resp = await fetch('/api/admin/users')
        const j = await resp.json()
        if (!resp.ok) {
          setError(j?.error || 'Failed to load users')
          setUsersList([])
        } else {
          setUsersList(j.data || [])
        }
      } catch (e) {
        setError('Unexpected error')
        setUsersList([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return dateString
    }
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <main className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/admin" className="text-red-600 hover:text-red-700 font-medium mb-4 inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  กลับไป
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้</h1>
                <p className="text-gray-600 mt-2">ดูรายชื่อผู้ใช้ทั้งหมดในระบบ</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            {loading && <div className="text-center py-8">กำลังโหลดผู้ใช้...</div>}
            {error && <div className="text-red-600">{error}</div>}

            {!loading && !error && usersList.length === 0 && (
              <div className="text-center py-8">ไม่มีผู้ใช้</div>
            )}

            {!loading && !error && usersList.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ชื่อผู้ใช้</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">อีเมล</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">เบอร์โทร</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ประเภทสมาชิก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u: any) => (
                      <tr key={String(u.id ?? Math.random())} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{u.username ?? '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{u.email ?? '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{u.phone_number ?? '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{u.membership_type ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
