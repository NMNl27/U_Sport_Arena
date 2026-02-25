"use client"

import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useEffect, useState } from "react"
import Link from "next/link"

function ProfileContent() {
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth()

  const initials = (profile?.username || user?.email || "").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase()

  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [requirePassword, setRequirePassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setUsername(profile?.username || "")
    setEmail(profile?.email || user?.email || "")
    setPhone(profile?.phone_number || "")
  }, [profile, user])

  const onStartEdit = () => {
    setError(null)
    setSuccess(null)
    setEditing(true)
  }

  const onCancel = () => {
    setEditing(false)
    setRequirePassword(false)
    setPassword("")
    // reset values
    setUsername(profile?.username || "")
    setEmail(profile?.email || user?.email || "")
    setPhone(profile?.phone_number || "")
  }

  const onSave = async () => {
    setError(null)
    setSuccess(null)
    
    // Validate inputs
    if (!username.trim()) {
      setError("Username is required")
      return
    }
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    
    // Require password before saving
    setRequirePassword(true)
  }

  const onConfirmSave = async () => {
    if (!password.trim()) {
      setError("Password is required")
      return
    }
    
    setSaving(true)
    setError(null)
    try {
      const updates: any = { username, email }
      if (phone) {
        updates.phone_number = phone
      }
      
      const { error: err } = await updateProfile(updates, password)
      if (err) {
        setError(String(err.message || err))
        setSaving(false)
        return
      }

      // Refresh profile from DB
      await refreshProfile()
      setSuccess("Profile updated successfully!")
      setTimeout(() => {
        setSuccess(null)
        setEditing(false)
        setRequirePassword(false)
        setPassword("")
      }, 2000)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-red-600 mb-6 transition-colors"
          >
            ← กลับไป
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">โปรไฟล์</h1>

          <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-6 mb-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {loading ? (
                  <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-destructive to-destructive/80 flex items-center justify-center text-white text-xl font-semibold shadow-md">
                    {initials || "ผู้"}
                  </div>
                )}
              </div>

              <div>
                <div className="text-lg font-semibold text-gray-900">{profile?.username || user?.email || "ผู้ใช้"}</div>
                <div className="text-sm text-gray-500">{profile?.email || user?.email || "-"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ชื่อผู้ใช้</label>
                {editing ? (
                  <input 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="mt-1 w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                    placeholder="กรอกชื่อผู้ใช้"
                  />
                ) : (
                  <div className="mt-1 text-lg text-gray-900">{profile?.username || "N/A"}</div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">อีเมล</label>
                {editing ? (
                  <input 
                    type="email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="mt-1 w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                    placeholder="กรอกอีเมล"
                  />
                ) : (
                  <div className="mt-1 text-lg text-gray-900">{profile?.email || user?.email || "N/A"}</div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</label>
                {editing ? (
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="mt-1 w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                    placeholder="กรอกเบอร์โทรศัพท์"
                  />
                ) : (
                  <div className="mt-1 text-lg text-gray-900">{profile?.phone_number || "N/A"}</div>
                )}
              </div>

              <div className="pt-4">
                {!editing ? (
                  <div className="flex gap-2">
                    <button onClick={onStartEdit} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium transition-colors">แก้ไขข้อมูล</button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <button onClick={onSave} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium transition-colors">บันทึกการเปลี่ยนแปลง</button>
                    <button onClick={onCancel} className="border border-gray-300 hover:bg-gray-50 px-6 py-2 rounded-md font-medium transition-colors">ยกเลิก</button>
                  </div>
                )}
              </div>

              {requirePassword && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ยืนยันด้วยรหัสผ่านของคุณ</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                    placeholder="กรอกรหัสผ่านของคุณ"
                    disabled={saving}
                  />
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={onConfirmSave} 
                      disabled={saving} 
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
                    >
                      {saving ? "กำลังบันทึก..." : "ยืนยันและบันทึก"}
                    </button>
                    <button 
                      onClick={() => { setRequirePassword(false); setPassword("") }} 
                      disabled={saving}
                      className="border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 px-6 py-2 rounded-md font-medium transition-colors"
                    >
                        ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
              {success && <div className="text-sm text-green-600 mt-3">{success}</div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

