"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("Login form submitted", { email })
    
    setError(null)
    setLoading(true)

    try {
      const result = await signIn(email, password)
      console.log("Sign in result:", result)

      // Check if login was successful (no error or error is null)
      if (result.error !== null && result.error !== undefined) {
        console.error("Sign in error:", result.error)
        console.error("Error message:", result.error.message)
        console.error("Error details:", JSON.stringify(result.error, null, 2))
        
        const errorMessage = result.error.message || "Failed to sign in"
        setError(errorMessage)
        alert(`Sign in failed: ${errorMessage}`)
        setLoading(false)
      } else {
        // Login successful - redirect immediately to home page
        console.log("Sign in successful! Redirecting to home page (/)...")
        setLoading(false)

        // Decide redirect target based on role. Use full reload so server sees session.
        const redirectTarget = result.profile?.role === "admin" ? "/admin" : "/"
        if (typeof window !== "undefined") {
          window.location.href = redirectTarget
        } else {
          router.push(redirectTarget)
        }
      }
    } catch (err) {
      console.error("Unexpected error during sign in:", err)
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      alert(`Sign in error: ${errorMessage}`)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center mb-4">
              <img
                src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
                alt="U Sport Arena Logo"
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ยินดีต้อนรับ</h1>
            <p className="text-gray-600">เข้าสู่ระบบบัญชีของคุณ</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent outline-none"
                placeholder="อีเมลของคุณ"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ยังไม่มีบัญชีใช่หรือไม่?{" "}
              <Link href="/register" className="text-[#DC2626] hover:underline font-medium">
                สร้างบัญชีผู้ใช้
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

