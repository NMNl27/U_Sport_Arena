"use client"

import { useAuth } from "@/contexts/AuthContext"

/**
 * Hook to check if the current user is an admin
 * @returns {boolean} true if user is logged in AND has role === 'admin'
 */
export function useAdmin() {
  const { user, profile, loading } = useAuth()

  // Check if user is logged in and has admin role
  const isAdmin = !loading && !!user && profile?.role === "admin"

  return {
    isAdmin,
    isLoading: loading,
    user,
    profile,
  }
}

