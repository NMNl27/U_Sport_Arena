import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Field Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The football field you're looking for doesn't exist.
        </p>
        <Link href="/">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            Back to Home
          </Button>
        </Link>
      </div>
    </main>
  )
}

