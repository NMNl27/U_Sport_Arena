"use client"

import ProtectedRoute from "@/components/ProtectedRoute"

function BookingsContent() {
  return (
    <main className="h-screen bg-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-0">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">My Bookings</h1>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <p className="text-gray-600">Your bookings will appear here.</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function BookingsPage() {
  return (
    <ProtectedRoute>
      <BookingsContent />
    </ProtectedRoute>
  )
}

