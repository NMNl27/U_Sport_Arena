"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If not logged in, redirect to login
      if (!user) {
        router.push("/login")
        return
      }

      // If user exists but profile hasn't loaded yet, wait (do not redirect)
      // This prevents redirecting away before `profile` is fetched from Supabase
      if (profile === null) {
        return
      }

      // If logged in but not admin, redirect to home
      if (profile?.role !== "admin") {
        router.push("/")
        return
      }
    }
  }, [user, profile, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not admin (redirect will happen)
  if (!user || profile?.role !== "admin") {
    return null
  }

  return <>{children}</>
}

