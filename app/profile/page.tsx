"use client"

import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useEffect, useState } from "react"

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
    // Require password before saving
    setRequirePassword(true)
  }

  const onConfirmSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await updateProfile({ username, email, phone_number: phone }, password)
      if (err) {
        setError(String(err.message || err))
        setSaving(false)
        return
      }

      // Refresh profile from DB
      await refreshProfile()
      setSuccess("Saved successfully")
      setEditing(false)
      setRequirePassword(false)
      setPassword("")
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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Profile</h1>

          <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-6 mb-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {loading ? (
                  <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-destructive to-destructive/80 flex items-center justify-center text-white text-xl font-semibold shadow-md">
                    {initials || "U"}
                  </div>
                )}
              </div>

              <div>
                <div className="text-lg font-semibold text-gray-900">{profile?.username || user?.email || "User"}</div>
                <div className="text-sm text-gray-500">{profile?.email || user?.email || "-"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Username</label>
                {editing ? (
                  <input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full border px-3 py-2 rounded-md" />
                ) : (
                  <div className="mt-1 text-lg text-gray-900">{profile?.username || "N/A"}</div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                {editing ? (
                  <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full border px-3 py-2 rounded-md" />
                ) : (
                  <div className="mt-1 text-lg text-gray-900">{profile?.email || user?.email || "N/A"}</div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Phone Number</label>
                {editing ? (
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full border px-3 py-2 rounded-md" />
                ) : (
                  <div className="mt-1 text-lg text-gray-900">{profile?.phone_number || "N/A"}</div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Membership Type</label>
                <div className="mt-1 text-lg text-gray-900 capitalize">{profile?.membership_type || "standard"}</div>
              </div>

              <div className="pt-4">
                {!editing ? (
                  <div className="flex gap-2">
                    <button onClick={onStartEdit} className="bg-primary text-white px-4 py-2 rounded-md">Edit</button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <button onClick={onSave} className="bg-primary text-white px-4 py-2 rounded-md">Save</button>
                    <button onClick={onCancel} className="border px-4 py-2 rounded-md">Cancel</button>
                  </div>
                )}
              </div>

              {requirePassword && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">Please enter your password to confirm changes</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border px-3 py-2 rounded-md" />
                  <div className="flex gap-2 mt-3">
                    <button onClick={onConfirmSave} disabled={saving} className="bg-destructive text-white px-4 py-2 rounded-md">{saving ? "Saving..." : "Confirm and Save"}</button>
                    <button onClick={() => { setRequirePassword(false); setPassword("") }} className="border px-4 py-2 rounded-md">Cancel</button>
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

