"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useRef, useEffect } from "react"

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth()

  const initials = (profile?.username || user?.email || "").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = async () => {
    setMenuOpen(false)
    await signOut()
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [])

  // Debug: log auth state to help diagnose missing navbar buttons
  if (process.env.NODE_ENV !== "production") {
    console.log("Navbar auth:", { user, profile, loading })
  }

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center space-x-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
              alt="U Sport Arena Logo"
              className="h-14 w-14 rounded-full object-cover"
            />
            <span className="text-3xl font-extrabold text-gray-900">U Sport Arena</span>
          </Link>

          <div className="flex items-center gap-4">
            {loading && !user ? (
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded"></div>
            ) : !user ? (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="default"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="default" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Register
                  </Button>
                </Link>
              </div>
            ) : profile?.role === "admin" ? (
              <div className="flex items-center gap-2">
                <Link href="/admin">
                  <Button variant="outline" size="default" className="border-destructive text-destructive hover:bg-destructive/10">
                    Admin Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleLogout}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen(v => !v)} className="flex items-center">
                      {loading ? (
                        <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-gray-200 animate-pulse" />
                      ) : (
                        <div className="h-12 w-12 md:h-14 md:w-14 rounded-full overflow-hidden bg-destructive/10 flex items-center justify-center text-base md:text-lg font-semibold text-destructive shadow-sm">
                          {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            initials || "U"
                          )}
                        </div>
                      )}
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-md shadow-lg z-50">
                      <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</Link>
                      <Link href="/bookings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Bookings</Link>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Logout</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

