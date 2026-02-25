"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { resolveFieldImageUrl, fetchPromotionImages } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { ChevronLeft, ChevronRight } from "lucide-react"

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

function getFormattedDate() {
  const date = new Date()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export default function Home() {
  const [filterType, setFilterType] = useState<"all" | "football" | "fitness" | "swimming">("all")
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [sliderImages, setSliderImages] = useState<Array<{url: string, alt: string}>>([
    {
      url: "https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg",
      alt: "U Sport Arena Promo"
    },
    {
      url: "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&h=400&fit=crop",
      alt: "Football Field"
    },
    {
      url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=400&fit=crop",
      alt: "Fitness Center"
    }
  ])
  const { profile } = useAuth()
  const currentDate = getFormattedDate()

  // Fetch promotion images from Supabase
  useEffect(() => {
    const loadPromotionImages = async () => {
      try {
        console.log("Fetching promotion images...")
        const supabase = createClient()
        const images = await fetchPromotionImages(supabase)
        console.log("Fetched images:", images)
        setSliderImages(images)
      } catch (error) {
        console.error("Error loading promotion images:", error)
      }
    }
    loadPromotionImages()
  }, [])

  // Auto-slide effect
  useEffect(() => {
    if (sliderImages.length === 0) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [sliderImages.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length)
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("fields").select("*").order("fields_id", { ascending: true })
        
        // Fetch all reviews to calculate ratings
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("field_id, rating, is_reply")
        
        if (!mounted) return
        if (!error && data) {
          // Calculate rating stats per field (เฉพาะรีวิวหลัก)
          const ratingMap = new Map<number, { sum: number; count: number }>()
          reviewsData?.forEach((r: any) => {
            if (!r.is_reply && r.rating !== null) { // นับเฉพาะรีวิวหลักที่มีคะแนน
              const fieldId = r.field_id
              if (!ratingMap.has(fieldId)) {
                ratingMap.set(fieldId, { sum: 0, count: 0 })
              }
              const stats = ratingMap.get(fieldId)!
              stats.sum += r.rating
              stats.count += 1
            }
          })
          
          const mapped: Venue[] = await Promise.all((data as any[]).map(async (r) => {
            const rawType = (r.type ?? r.field_type ?? "").toString().trim()
            let normType = rawType.toLowerCase()
            
            if (
              normType.includes("fitness") || 
              normType.includes("gym") || 
              normType.includes("ฟิตเนส") || 
              normType.includes("ยิม") ||
              normType.includes("ออกกำลังกาย")
            ) {
              normType = "fitness"
            }
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
            
            const fieldId = Number(r.fields_id ?? r.id ?? r.field_id)
            const ratingStats = ratingMap.get(fieldId)
            const avgRating = ratingStats ? ratingStats.sum / ratingStats.count : 0

            return {
              id: String(r.fields_id ?? r.id ?? r.field_id ?? r.fieldId ?? r.uuid),
              name: r.name ?? "Untitled",
              location: r.Location ?? r.location ?? "",
              image: imageUrl,
              type: normType,
              vip: (r.vip === true || String(r.vip) === 'true' || String(r.vip) === '1' || r.is_vip === true) as any,
              pricePerHour: r.price ?? r.pricePerHour ?? 0,
              status: String(r.status ?? "available").toLowerCase(),
              rating: avgRating > 0 ? Number(avgRating.toFixed(1)) : 0,
              reviews: ratingStats?.count ?? 0,
            }
          }))
          setVenues(mapped)
        } else {
          console.error("Error loading fields from Supabase:", error)
          setVenues([])
        }
      } catch (e) {
        console.error("Unexpected error loading fields:", e)
        setVenues([])
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
      {/* Hero Slider Section */}
      <div className="bg-gray-50 py-10">
        <div className="container mx-auto px-2">
          <div className="relative max-w-3xl mx-auto">
            {/* Slider Container */}
            <div className="relative overflow-hidden rounded-lg shadow-lg">
              <div 
                className="flex transition-transform duration-500 ease-in-out h-96"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {sliderImages.map((image, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-96 object-cover"
                    />
                  </div>
                ))}
              </div>
              
              {/* Navigation Buttons */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              
              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {sliderImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      currentSlide === index ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Venues Section */}
      <div className="bg-white py-8">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">สนามที่เปิดให้จอง</h2>
            
            {/* Filter Badges */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setFilterType("football")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === "football"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ฟุตบอล
              </button>
              <button
                onClick={() => setFilterType("fitness")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === "fitness"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ฟิตเนส
              </button>
              <button
                onClick={() => setFilterType("swimming")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterType === "swimming"
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                สระว่ายน้ำ
              </button>
            </div>
          </div>
          
          {/* Venues Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredVenues.map((venue) => (
              <Link key={venue.id} href={`/fields/${venue.id}`}>
                <div className={`bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer border-2 ${venue.vip ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-yellow-200/50' : 'border-gray-200'}`}>
                  <div className="relative">
                    {venue.vip && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg transform rotate-3">
                          VIP
                        </div>
                      </div>
                    )}
                    <img
                      src={venue.image ?? undefined}
                      alt={venue.name}
                      className="w-full h-48 object-cover"
                    />
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
                      {(venue.reviews ?? 0) > 0 ? (
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">{venue.rating} ({venue.reviews})</span>
                      ) : (
                        <span className="bg-gray-300 text-white px-2 py-1 rounded text-xs font-semibold">ยังไม่มีรีวิว</span>
                      )}
                      <span className="text-sm text-gray-600 capitalize">{venue.type === 'football' ? 'ฟุตบอล' : venue.type === 'fitness' ? 'ฟิตเนส' : venue.type === 'swimming' ? 'สระว่ายน้ำ' : venue.type}</span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-sm text-gray-600">ราคา:</span>
                      <div className="text-2xl font-bold text-red-600">฿{venue.pricePerHour ? Number(venue.pricePerHour).toLocaleString() : "-"} <span className="text-sm font-normal text-gray-600">/ ชั่วโมง</span></div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4 text-gray-600">
                      {/* Icons removed: feature icons (kept as comment for future reference) */}
                    </div>
                    
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
                      จองตอนนี้
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-6 mt-[25vh]"> {/* เปลี่ยน mt-lg เป็น mt-12 */}
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2026 U-Sport Arena. All rights reserved.</p>
            <p className="mt-1">ระบบจองสนามกีฬาออนไลน์</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
