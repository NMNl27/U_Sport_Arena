import { notFound } from "next/navigation"
import Link from "next/link"
import { mockFields } from "@/lib/mockData"
import { Button } from "@/components/ui/button"

export default function FieldDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const field = mockFields.find((f) => f.id === params.id)

  if (!field) {
    notFound()
  }

  const isAvailable = (field as any).status === "available" || (field as any).status === undefined

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-red-600 mb-6 transition-colors"
          >
            ← Back to Fields
          </Link>

          {/* Field Image */}
          <div className="h-96 bg-gradient-to-br from-red-50 to-red-100 rounded-lg mb-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-4xl font-bold">
                  {field.name.charAt(0)}
                </span>
              </div>
              <p className="text-gray-600">Field Image</p>
            </div>
          </div>

          {/* Field Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {field.name}
            </h1>
            <p className="text-gray-600 text-lg mb-6">{field.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Location
                </h3>
                <p className="text-gray-900">{field.location}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Price
                </h3>
                <p className="text-2xl font-bold text-red-600">
                  ฿{field.pricePerHour}
                  <span className="text-base font-normal text-gray-600">
                    /hour
                  </span>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Size
                </h3>
                <p className="text-gray-900">{field.size}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Surface
                </h3>
                <p className="text-gray-900">{field.surface}</p>
              </div>
            </div>

            {/* Book Now Button */}
            {isAvailable ? (
              <Link href={`/reservation/${params.id}`}>
                <Button
                  size="lg"
                  className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  Book Now
                </Button>
              </Link>
            ) : (
              <div className="w-full md:w-auto px-4 py-3 rounded-lg bg-gray-100 text-gray-700 text-center">
                สถานะสนาม: {(field as any).status || "unavailable"} — ไม่สามารถจองได้ขณะนี้
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

