"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

interface ReviewFormProps {
  fieldId: string
  onReviewSubmitted?: () => void
}

export function ReviewForm({ fieldId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนเขียนรีวิว")
      return
    }

    if (rating === 0) {
      alert("กรุณาให้คะแนนรีวิว")
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("reviews").insert({
        field_id: Number(fieldId),
        user_id: user.id,
        rating: rating,
        comment: comment,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error submitting review:", error)
        alert("เกิดข้อผิดพลาดในการส่งรีวิว: " + error.message)
      } else {
        setRating(0)
        setComment("")
        alert("ส่งรีวิวเรียบร้อยแล้ว!")
        onReviewSubmitted?.()
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("เกิดข้อผิดพลาดในการส่งรีวิว")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">เขียนรีวิว</h3>

      {/* Star Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ให้คะแนน
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${
                star <= rating ? "text-yellow-400" : "text-gray-300"
              } hover:text-yellow-400`}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            {rating === 5 && "ยอดเยี่ยม!"}
            {rating === 4 && "ดีมาก"}
            {rating === 3 && "พอใช้"}
            {rating === 2 && "ไม่ค่อยดี"}
            {rating === 1 && "แย่มาก"}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          ความคิดเห็น
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="เขียนรีวิวของคุณ..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          rows={4}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        {isSubmitting ? "กำลังส่ง..." : "ส่งรีวิว"}
      </Button>

      {!user && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          กรุณา{" "}
          <a href="/login" className="text-red-600 hover:underline">
            เข้าสู่ระบบ
          </a>{" "}
          เพื่อเขียนรีวิว
        </p>
      )}
    </form>
  )
}
