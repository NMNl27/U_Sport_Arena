"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useAdmin } from "@/hooks/useAdmin"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const { isAdmin } = useAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Debug: unauthenticated access — log and redirect to login
        if (process.env.NODE_ENV !== 'production') console.log('ProtectedRoute: no session, redirecting to /login')
        router.push("/login")
      } else if (requireAdmin && !isAdmin) {
        router.push("/")
      }
    }
  }, [user, isAdmin, loading, requireAdmin, router])

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

  if (!user) {
    return null
  }

  if (requireAdmin && !isAdmin) {
    return null
  }

  return <>{children}</>
}

