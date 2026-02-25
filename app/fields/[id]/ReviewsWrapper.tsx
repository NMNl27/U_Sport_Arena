"use client"

import { useState } from "react"
import { ReviewForm } from "@/components/ReviewForm"
import { ReviewsList } from "@/components/ReviewsList"

interface ReviewsWrapperProps {
  fieldId: string
}

export function ReviewsWrapper({ fieldId }: ReviewsWrapperProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleReviewSubmitted = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Review Form */}
      <ReviewForm fieldId={fieldId} onReviewSubmitted={handleReviewSubmitted} />

      {/* Reviews List */}
      <ReviewsList fieldId={fieldId} refresh={refreshKey > 0} />
    </div>
  )
}
