"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import NotificationBell from "@/components/NotificationBell"

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isAdminRoute = pathname?.startsWith("/admin") ?? false

  const initials = (profile?.username || user?.email || "").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase()

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const menuRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const handleLogout = async () => {
    setMenuOpen(false)
    await signOut()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search results page with query parameter
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
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
        <div className="flex items-center justify-between h-20 gap-8">
          {isAdminRoute ? (
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
                alt="U Sport Arena Logo"
                className="h-14 w-14 rounded-full object-cover"
              />
              <span className="text-3xl font-extrabold text-gray-900">U Sport Arena</span>
            </div>
          ) : (
            <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
                alt="U Sport Arena Logo"
                className="h-14 w-14 rounded-full object-cover"
              />
              <span className="text-3xl font-extrabold text-gray-900">U Sport Arena</span>
            </Link>
          )}

          {/* Search Bar (hidden on admin pages) */}
          {!isAdminRoute && (
            <div className="flex-1 max-w-md">
              <div className="relative">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="ค้นหาสนามกีฬา..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-600"
                    suppressHydrationWarning={true}
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 flex-shrink-0">
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
                    เข้าสู่ระบบ
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="default" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    สร้างบัญชี
                  </Button>
                </Link>
              </div>
            ) : profile?.role === "admin" ? (
              <div className="flex items-center gap-2">
                  {!isAdminRoute && (
                    <Link href="/admin">
                    </Link>
                  )}
                  {isAdminRoute && (
                    <>
                      <Link href="/admin/promotions">
                        <Button variant="default" size="default" className="bg-red-600 text-white hover:bg-red-700">
                          จัดการโปรโมชัน
                        </Button>
                      </Link>
                      <Link href="/admin/fieldmanage">
                        <Button variant="default" size="default" className="bg-blue-600 text-white hover:bg-blue-700">
                          จัดการสนาม
                        </Button>
                      </Link>
                      <Link href="/admin/reviews">
                        <Button variant="default" size="default" className="bg-yellow-500 text-white hover:bg-yellow-600">
                          จัดการรีวิว
                        </Button>
                      </Link>
                    </>
                  )}
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
                <NotificationBell />
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
                      <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">โปรไฟล์</Link>
                      <Link href="/bookings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">ประวัติการจอง</Link>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">ออกจากระบบ</button>
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

