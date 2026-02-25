"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { resolveFieldImageUrl } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

type Venue = {
  id: string
  name: string
  location: string
  rating?: number
  reviews?: number
  type?: string
  image?: string | null
  vip?: boolean
  pricePerHour?: number
  status?: string
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([])
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const { data, error } = await supabase.from("fields").select("*").order("fields_id", { ascending: true })
        
        if (!error && data) {
          const mapped: Venue[] = await Promise.all((data as any[]).map(async (r) => {
            // Get raw type from DB
            const rawType = (r.type ?? r.field_type ?? "").toString().trim()
            
            // Normalize to match filter keys: "football" or "fitness"
            let normType = rawType.toLowerCase()
            
            // Check for Fitness keywords (English & Thai)
            if (
              normType.includes("fitness") || 
              normType.includes("gym") || 
              normType.includes("ฟิตเนส") || 
              normType.includes("ยิม") ||
              normType.includes("ออกกำลังกาย")
            ) {
              normType = "fitness"
            }
            // Check for Football keywords (English & Thai)
            else if (
              normType.includes("football") || 
              normType.includes("soccer") || 
              normType.includes("turf") || 
              normType.includes("grass") || 
              normType.includes("stadium") || 
              normType.includes("สนามฟุตบอล") || 
              normType.includes("บอล") || 
              normType.includes("หญ้า")
            ) {
              normType = "football"
            }
            // Check for Swimming Pool keywords (English & Thai)
            else if (
              normType.includes("swimming") || 
              normType.includes("pool") || 
              normType.includes("สระว่ายน้ำ") || 
              normType.includes("สระ") ||
              normType.includes("ว่ายน้ำ")
            ) {
              normType = "swimming"
            }

            const imageUrl = await resolveFieldImageUrl(supabase, r)

            // Get real review data
            let avgRating = 0
            let reviewCount = 0
            
            try {
              const { data: reviews, error: reviewError } = await supabase
                .from("reviews")
                .select("rating, is_reply")
                .eq("field_id", r.fields_id)
              
              if (!reviewError && reviews && reviews.length > 0) {
                // คำนวณเฉพาะรีวิวหลัก (ไม่ใช่การตอบกลับ)
                const mainReviews = reviews.filter(r => !r.is_reply && r.rating !== null)
                const totalRating = mainReviews.reduce((sum, review) => sum + (review.rating || 0), 0)
                avgRating = mainReviews.length > 0 ? totalRating / mainReviews.length : 0
                reviewCount = mainReviews.length
              }
            } catch (err) {
              // Silent error handling
            }

            return {
              id: String(r.fields_id ?? r.id ?? r.field_id ?? r.fieldId ?? r.uuid),
              name: r.name ?? "Untitled",
              location: r.Location ?? r.location ?? "",
              image: imageUrl,
              type: normType,
              vip: (r.vip === true || String(r.vip) === 'true' || String(r.vip) === '1' || r.is_vip === true) as any,
              pricePerHour: r.price ?? r.pricePerHour ?? 0,
              status: String(r.status ?? "available").toLowerCase(),
              rating: avgRating,
              reviews: reviewCount
            }
          }))
          
          setVenues(mapped)
        } else {
          console.error('Error loading venues:', error)
          setVenues([])
        }
      } catch (error) {
        console.error('Error loading venues:', error)
        setVenues([])
      } finally {
        setLoading(false)
      }
    }
    
    loadVenues()
  }, [supabase])

  // Debug: Show all available venues
  useEffect(() => {
    // Silent
  }, [loading, venues])

  useEffect(() => {
    if (!query || query.trim() === '') {
      setFilteredVenues(venues)
      return
    }

    const searchTerm = query.toLowerCase().trim()
    const filtered = venues.filter(venue => {
      // Search by field name
      const nameMatch = venue.name?.toLowerCase().includes(searchTerm)
      
      // Search by field type
      const typeMatch = venue.type?.toLowerCase().includes(searchTerm)
      
      // Search by location
      const locationMatch = venue.location?.toLowerCase().includes(searchTerm)
      
      // Enhanced search for swimming pools - only when searching for swimming terms
      const isSwimmingSearch = searchTerm.includes('swimming') || 
                             searchTerm.includes('สระ') || 
                             searchTerm.includes('ว่าย') || 
                             searchTerm.includes('น้ำ')
      
      const swimmingMatch = isSwimmingSearch && (
        venue.type?.toLowerCase().includes('swimming') ||
        venue.type?.toLowerCase().includes('สระ') ||
        venue.type?.toLowerCase().includes('ว่าย') ||
        venue.type?.toLowerCase().includes('น้ำ') ||
        venue.name?.toLowerCase().includes('swimming') ||
        venue.name?.toLowerCase().includes('สระ') ||
        venue.name?.toLowerCase().includes('ว่าย') ||
        venue.name?.toLowerCase().includes('น้ำ')
      )
      
      // Enhanced search for football - when searching for football terms
      const isFootballSearch = searchTerm.includes('football') || 
                              searchTerm.includes('ฟุตบอล') || 
                              searchTerm.includes('บอล') || 
                              searchTerm.includes('สนามฟุตบอล') ||
                              searchTerm.includes('stadium')
      
      const footballMatch = isFootballSearch && (
        venue.type?.toLowerCase().includes('football') ||
        venue.type?.toLowerCase().includes('stadium') ||
        venue.name?.toLowerCase().includes('stadium') ||
        venue.name?.toLowerCase().includes('ฟุตบอล') ||
        venue.name?.toLowerCase().includes('บอล') ||
        venue.name?.toLowerCase().includes('สนาม')
      )
      
      return nameMatch || typeMatch || locationMatch || swimmingMatch || footballMatch
    })

    setFilteredVenues(filtered)
  }, [query, venues])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังค้นหาสนามกีฬา...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {query && query.trim() ? `ผลการค้นหา: "${query}"` : "สนามกีฬาทั้งหมด"}
              </h1>
              <p className="text-gray-600 mt-1">
                {query && query.trim() ? `พบ ${filteredVenues.length} สนามที่ตรงกับการค้นหา` : `มีสนามทั้งหมด ${venues.length} สนาม`}
              </p>
            </div>
            <Link 
              href="/"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              ← กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredVenues.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ไม่พบสนามกีฬาที่ค้นหา
            </h3>
            <p className="text-gray-600 mb-6">
              ลองค้นหาด้วยคำอื่นๆ หรือตรวจสอบการสะกดคำ
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              ดูสนามทั้งหมด
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <Link
                key={venue.id}
                href={`/fields/${venue.id}`}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={venue.image || "/assets/images/stadium.jpg"}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {venue.vip && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                      VIP
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg">{venue.name}</h3>
                    <p className="text-white/90 text-sm">{venue.location}</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {venue.type || "สนามกีฬา"}
                    </span>
                    {venue.pricePerHour && (
                      <span className="text-lg font-bold text-red-600">
                        ฿{venue.pricePerHour.toLocaleString('th-TH')}/ชม
                      </span>
                    )}
                  </div>
                  {venue.rating && venue.rating > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1">{venue.rating.toFixed(1)}</span>
                      </div>
                      {venue.reviews && venue.reviews > 0 && (
                        <span>({venue.reviews} รีวิว)</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-gray-400">ไม่มีรีวิว</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPageContent
