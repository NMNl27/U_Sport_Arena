"use client"

import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { supabase } from "@/lib/supabase"
import { Booking } from "@/types/supabase"

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select("*")
          .order("start_time", { ascending: false })

        if (fetchError) {
          console.error("Error fetching bookings:", fetchError)
          setError(fetchError.message || "Failed to fetch bookings")
        } else {
          setBookings(data || [])
        }
      } catch (e) {
        console.error("Unexpected error:", e)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage your football field booking system</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome, Admin!</h2>
            <p className="text-gray-600">
              This is the admin dashboard. You can manage fields, bookings, and users from here.
            </p>
          </div>

          {/* Bookings Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">All Bookings</h2>

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626] mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading bookings...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {!loading && !error && bookings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">No bookings found.</p>
              </div>
            )}

            {!loading && !error && bookings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">User ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Field ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Start Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">End Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900 font-mono">
                          {booking.id.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                          {booking.user_id.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                          {booking.field_id.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {formatDate(booking.start_time)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {formatDate(booking.end_time)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : booking.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              booking.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : booking.payment_status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {booking.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && bookings.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Total bookings: <span className="font-semibold">{bookings.length}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
