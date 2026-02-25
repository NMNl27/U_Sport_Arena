import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { resolveFieldImageUrl } from "@/lib/utils"
import { ReviewForm } from "@/components/ReviewForm"
import { ReviewsWrapper } from "@/app/fields/[id]/ReviewsWrapper"

export default async function FieldDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const idNum = Number(params.id)
  
  // Parallel queries for better performance
  const [fieldResult, reviewsResult] = await Promise.all([
    supabase
      .from("fields")
      .select("*")
      .eq("fields_id", idNum)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("rating, is_reply")
      .eq("field_id", idNum)
  ])

  const { data: field, error } = fieldResult
  const { data: reviews } = reviewsResult

  if (error || !field) {
    notFound()
  }

  // Calculate average rating
  const validRatings = reviews?.filter(r => !r.is_reply && typeof r.rating === 'number' && !isNaN(r.rating) && r.rating !== null) || []
  const averageRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length
    : 0

  // Normalize common column name variants
  const fld: any = field
  const location = fld.Location ?? fld.location ?? fld.address ?? fld.Address ?? ""

  // Use cached image resolution
  const imageUrl = await resolveFieldImageUrl(supabase, fld)

  const isAvailable = String(fld.status ?? "available").toLowerCase() === "available"

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-red-600 mb-6 transition-colors"
          >
            ← กลับไป
          </Link>

          {/* Field Image */}
          <div className="h-96 bg-gradient-to-br from-red-50 to-red-100 rounded-lg mb-8 overflow-hidden">
            <img src={imageUrl} alt={(field as any).name ?? "Field"} className="w-full h-full object-cover" />
          </div>

          {/* Field Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl font-bold text-gray-900">
                {(field as any).name}
              </h1>
              {validRatings.length > 0 && (
                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                  {averageRating.toFixed(1)} ({validRatings.length})
                </span>
              )}
            </div>
            <p className="text-gray-600 text-lg mb-6">{(field as any).description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  สถานที่ตั้ง
                </h3>
                <p className="text-gray-900">{location}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  ราคา
                </h3>
                <p className="text-2xl font-bold text-red-600">
                  ฿{(field as any).pricePerHour ?? (field as any).price ?? "-"}
                  <span className="text-base font-normal text-gray-600">
                    /ชั่วโมง
                  </span>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  ขนาด
                </h3>
                <p className="text-gray-900">{(field as any).size}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  พื้นสนาม
                </h3>
                <p className="text-gray-900">{(field as any).surface || "-"}</p>
              </div>
            </div>

            {/* Book Now Button */}
            {isAvailable ? (
              <Link href={`/reservation/${params.id}`}>
                <Button
                  size="lg"
                  className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  จองตอนนี้
                </Button>
              </Link>
            ) : (
              <div className="w-full md:w-auto px-4 py-3 rounded-lg bg-gray-100 text-gray-700 text-center">
                สถานะสนาม: {(field as any).status || "unavailable"} — ไม่สามารถจองได้ขณะนี้
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">รีวิวจากผู้ใช้</h2>
            <ReviewsWrapper fieldId={params.id} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-6 mt-[20vh]">
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

