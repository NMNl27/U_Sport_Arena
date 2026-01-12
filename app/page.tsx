"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { mockFields } from "@/lib/mockData"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

type Venue = {
  id: string
  name: string
  location: string
  rating?: number
  reviews?: number
  type?: string
  image: string
  pricePerHour?: number
  status?: string
}

function getFormattedDate() {
  const date = new Date()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${date.getDate()} ${months[date.getMonth()]}`
}

export default function Home() {
  const [filterType, setFilterType] = useState<"all" | "football" | "fitness">("all")
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const currentDate = getFormattedDate()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      // If logged-in user with role 'user', fetch from Supabase `fields` table
      if (profile && profile.role === "user") {
        try {
          const supabase = createClient()
          const { data, error } = await supabase.from("fields").select("*")
          if (!mounted) return
          if (!error && data) {
            const mapped: Venue[] = (data as any[]).map((r) => {
              const rawType = (r.type ?? r.field_type ?? "").toString()
              const normType = rawType ? rawType.toLowerCase() : "football"
              return {
                id: String(r.fields_id ?? r.id ?? r.field_id ?? r.fieldId ?? r.uuid),
                name: r.name ?? "Untitled",
                location: r.Location ?? r.location ?? "",
                image: r.image_url ?? "/assets/images/stadium.jpg",
                type: normType,
                pricePerHour: r.price ?? r.pricePerHour ?? 0,
                status: String(r.status ?? "available").toLowerCase(),
              }
            })
            setVenues(mapped)
          } else {
            console.error("Error loading fields from Supabase:", error)
            setVenues(mockFields.map((f) => {
              const inferred = (f as any).type ?? ((String(f.surface || "").toLowerCase().includes("gym")) ? "fitness" : "football")
              return {
                id: f.id,
                name: f.name,
                location: f.location,
                image: f.image,
                type: String(inferred).toLowerCase(),
                pricePerHour: f.pricePerHour,
                status: (f as any).status || "available",
              }
            }))
          }
        } catch (e) {
          console.error("Unexpected error loading fields:", e)
            setVenues(mockFields.map((f) => ({ id: f.id, name: f.name, location: f.location, image: f.image, type: "football", pricePerHour: f.pricePerHour, status: String((f as any).status || "available").toLowerCase() })))
        }
      } else {
        // Not a logged-in 'user' — use mock data
        setVenues(mockFields.map((f) => {
          const inferred = (f as any).type ?? ((String(f.surface || "").toLowerCase().includes("gym")) ? "fitness" : "football")
          return { id: f.id, name: f.name, location: f.location, image: f.image, type: String(inferred).toLowerCase(), pricePerHour: f.pricePerHour, status: String((f as any).status || "available").toLowerCase() }
        }))
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [profile])

  // Apply type filter, then for normal users hide fields that are not available
  let visibleVenues = filterType === "all" ? venues : venues.filter((v) => v.type === filterType)
  if (profile && profile.role === "user") {
    visibleVenues = visibleVenues.filter((v) => String((v.status || "available")).toLowerCase() === "available")
  }
  const filteredVenues = visibleVenues

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Banner Section */}
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <img
              src="https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg"
              alt="U Sport Arena Promo"
              className="w-full max-w-4xl rounded-lg shadow-lg object-cover"
            />
          </div>
        </div>
      </div>

      {/* Available Venues Section */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Available Venues</h2>
            
            {/* Filter Badges */}
            <div className="flex items-center gap-2">
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">{currentDate}</span>
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("football")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === "football"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Football
              </button>
              <button
                onClick={() => setFilterType("fitness")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === "fitness"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Fitness
              </button>
            </div>
          </div>
          
          {/* Venues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredVenues.map((venue) => (
              <Link key={venue.id} href={`/fields/${venue.id}`}>
                <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative">
                    <img
                      src={venue.image}
                      alt={venue.name}
                      className="w-full h-48 object-cover"
                    />
                    <button className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{venue.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {venue.location}
                    </p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">{venue.rating} ({venue.reviews})</span>
                      <span className="text-sm text-gray-600 capitalize">{venue.type}</span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-sm text-gray-600">ราคา:</span>
                      <div className="text-2xl font-bold text-red-600">฿{venue.pricePerHour ? Number(venue.pricePerHour).toLocaleString() : "-"} <span className="text-sm font-normal text-gray-600">/ ชั่วโมง</span></div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4 text-gray-600">
                      {/* Icons removed: feature icons (kept as comment for future reference) */}
                    </div>
                    
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
                      Book Now
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
