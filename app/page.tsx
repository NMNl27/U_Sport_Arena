import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is logged in, show dashboard option
  if (session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-start justify-center pt-8 md:pt-12">
        <div className="container mx-auto px-4 py-0">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-stretch">
              {/* Left: Welcome & Primary actions */}
              <div className="flex-1 flex flex-col justify-center items-start gap-4">
                <div className="flex items-center gap-4">
                  <img
                      src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
                      alt="U Sport Arena Logo"
                      className="h-28 w-28 rounded-full object-cover shadow-md -ml-4"
                    />
                  <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Welcome back</h2>
                    <p className="text-base md:text-lg text-gray-600">Book your next game in a few taps</p>
                  </div>
                </div>
 
                <div className="w-full flex flex-col sm:flex-row gap-6 mt-4">
                  <Link href="/fields" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-destructive to-destructive/85 text-destructive-foreground text-base md:text-lg px-8 py-3 md:px-10 md:py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all font-semibold">
                      Browse Fields
                    </Button>
                  </Link>

                  <Link href="/bookings" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full border-2 border-destructive text-destructive text-sm md:text-base px-5 py-2 rounded-lg">
                      My Bookings
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right: Compact summary / quick links */}
              <div className="w-full md:w-[30rem] bg-gray-50 border border-gray-100 rounded-xl p-4 md:p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Upcoming</div>
                    <div className="text-base font-semibold text-gray-800">No upcoming bookings</div>
                  </div>
                  <div className="text-base text-gray-400">—</div>
                </div>

                <div className="h-px bg-gray-100 my-1" />

                <div className="text-base text-gray-600">Quick actions available from the main menu.</div>

              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Guest UI - Landing Page
  return (
    <main className="h-screen bg-gradient-to-br from-white via-red-50 to-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-0">
        <div className="max-w-3xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <img
                src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
                alt="U Sport Arena Logo"
                className="h-20 w-20 rounded-full object-cover shadow-lg transform hover:scale-105 transition-transform"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome to U Sport Arena
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-2 max-w-2xl mx-auto">
              Book premium football fields
            </p>
            <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto">
              Find and reserve the perfect field for your next game, tournament, or training session.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex justify-center items-center mb-8">
            <Link href="/bookings" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto max-w-xl mx-auto bg-gradient-to-r from-destructive to-destructive/85 text-destructive-foreground text-lg md:text-xl px-10 md:px-16 py-3 md:py-4 rounded-lg shadow-2xl hover:shadow-2xl transition-transform transform hover:-translate-y-0.5 hover:scale-105 font-semibold tracking-wide text-center"
              >
                Booking
              </Button>
            </Link>
          </div>

          {/* Features Section: hidden on small screens to avoid scrolling */}
          <div className="hidden md:grid grid-cols-3 gap-8 mt-8">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg
                    className="w-7 h-7 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                Premium Fields
              </h3>
              <p className="text-gray-600 text-center text-sm">
                Access to top-quality football fields with professional facilities
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg
                  className="w-7 h-7 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                Easy Booking
              </h3>
              <p className="text-gray-600 text-center text-sm">
                Simple and fast booking process. Reserve your field in minutes
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg
                  className="w-7 h-7 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
                Secure & Reliable
              </h3>
              <p className="text-gray-600 text-center text-sm">
                Safe payment processing and reliable booking confirmation
              </p>
            </div>
          </div>

          {/* Small-screen compact features to keep everything on one screen */}
          <div className="md:hidden flex justify-between items-center mt-6 gap-3">
            <div className="flex-1 bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-destructive mb-1">🏟️</div>
              <div className="text-xs font-semibold">Fields</div>
            </div>
            <div className="flex-1 bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-destructive mb-1">⚡</div>
              <div className="text-xs font-semibold">Quick Book</div>
            </div>
            <div className="flex-1 bg-white p-3 rounded-lg shadow-sm text-center">
              <div className="text-destructive mb-1">🔒</div>
              <div className="text-xs font-semibold">Secure</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
