"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [phone_number, setPhone_number] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signUp, signOut } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError("Username is required")
      return
    }

    if (!phone_number.trim()) {
      setError("Phone number is required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, username, phone_number)
    
    console.log('Register result:', { error, email, username })

    if (error) {
      setError(error.message || "Failed to create account")
      setLoading(false)
    } else {
      // Sign out after successful registration to prevent auto-login
      console.log('Registration successful, signing out and redirecting to login...')
      await signOut()
      setLoading(false)
      router.push("/login")
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img
                src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
                alt="U Sport Arena Logo"
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">สร้างบัญชีผู้ใช้</h1>
            <p className="text-gray-600">สร้างบัญชีผู้ใช้เพื่อเริ่มต้นใช้งาน</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อบัญชีผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destructive focus:border-transparent outline-none"
                placeholder="ชื่อบัญชีผู้ใช้"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destructive focus:border-transparent outline-none"
                placeholder="อีเมลของคุณ"
              />
            </div>

            <div>
              <label
                htmlFor="phone_number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                เบอร์โทรศัพท์
              </label>
              <input
                id="phone_number"
                type="tel"
                value={phone_number}
                onChange={(e) => setPhone_number(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destructive focus:border-transparent outline-none"
                placeholder="เบอร์โทรศัพท์ของคุณ"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destructive focus:border-transparent outline-none"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">ต้องมีความยาวอย่างน้อย 6 ตัวอักษร</p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                ยืนยันรหัสผ่าน
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destructive focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg py-3"
            >
              {loading ? "กำลังสร้างบัญชีผู้ใช้..." : "สร้างบัญชี"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-600">
              คุณมีบัญชีอยู่แล้วใช่หรือไม่? {" "}
              <Link href="/login" className="text-destructive hover:underline font-medium">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

