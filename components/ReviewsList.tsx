"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ReplyForm } from "./ReplyForm"
import { useAuth } from "@/contexts/AuthContext"

interface Review {
  id: number
  field_id: number
  user_id: string
  rating?: number
  comment: string
  created_at: string
  parent_id?: number
  is_reply: boolean
  user?: {
    user_id: string
    username: string
    email: string
    user_metadata?: {
      full_name?: string
    }
  }
  replies?: Review[]
}

interface ReplyItemProps {
  reply: Review
  fieldId: number
  onReplySubmitted: () => void
}

// --- Helper Function สำหรับจัดการวันที่ให้เหมือนกันทุกจุด ---
const globalFormatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function ReplyItem({ reply, fieldId, onReplySubmitted }: ReplyItemProps) {
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const { user } = useAuth()

  return (
    <div className="pt-4 mt-4 border-t border-gray-100 first:border-t-0 first:mt-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xs font-semibold flex-shrink-0">
          {(reply.user?.username?.[0] || reply.user?.email?.[0] || "U").toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-gray-900 text-sm truncate">
              {reply.user?.username || reply.user?.email?.split("@")[0] || "ผู้ใช้"}
            </p>
            <p className="text-xs text-gray-400">
              {globalFormatDate(reply.created_at)}
            </p>
          </div>
          
          <p className="text-gray-700 text-sm break-words leading-relaxed">
            {reply.comment}
          </p>
          
          {user && (
            <button
              onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
              className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              {replyingTo === reply.id ? "ยกเลิก" : "ตอบกลับ"}
            </button>
          )}

          {replyingTo === reply.id && (
            <div className="mt-3">
              <ReplyForm
                parentId={reply.id}
                fieldId={fieldId}
                isReplyToReply={true}
                onReplySubmitted={() => {
                  setReplyingTo(null)
                  onReplySubmitted()
                }}
                onCancel={() => setReplyingTo(null)}
              />
            </div>
          )}
        </div>
      </div>

      {reply.replies && reply.replies.length > 0 && (
        <div className="space-y-1">
          {reply.replies.map((nestedReply) => (
            <ReplyItem 
              key={nestedReply.id} 
              reply={nestedReply} 
              fieldId={fieldId}
              onReplySubmitted={onReplySubmitted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ReviewsListProps {
  fieldId: string
  refresh?: boolean
}

export function ReviewsList({ fieldId, refresh }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchReviews = async () => {
    try {
      // Single query to get all reviews (main + replies) with user data
      const { data: allReviews, error } = await supabase
        .from("reviews")
        .select("*, user:user_id(*)")
        .eq("field_id", Number(fieldId))
        .order("created_at", { ascending: false })

      if (error) return

      // Separate main reviews and replies
      const mainReviews = allReviews?.filter((r: Review) => !r.is_reply) || []
      const replies = allReviews?.filter((r: Review) => r.is_reply) || []

      // Build reply hierarchy efficiently
      const buildReplyTree = (parentId: number): Review[] => {
        return replies
          .filter(reply => reply.parent_id === parentId)
          .map(reply => ({
            ...reply,
            replies: buildReplyTree(reply.id)
          }))
      }

      // Attach replies to main reviews
      const reviewsWithReplies = mainReviews.map(review => ({
        ...review,
        replies: buildReplyTree(review.id)
      }))

      setReviews(reviewsWithReplies)
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [fieldId, refresh])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 rounded-xl p-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-4/5 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const validRatings = reviews.filter((r: Review) => !r.is_reply && r.rating)
  const averageRating = validRatings.length > 0
    ? validRatings.reduce((sum: number, r: Review) => sum + (r.rating || 0), 0) / validRatings.length
    : 0

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-red-50 rounded-xl p-6">
        <div className="flex items-center gap-6">
          <div className="text-4xl font-black text-red-600">
            {averageRating.toFixed(1)}
          </div>
          <div>
            <div className="text-yellow-400 text-xl">
              {"★".repeat(Math.round(averageRating))}
              <span className="text-gray-300">{"★".repeat(5 - Math.round(averageRating))}</span>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              จาก {validRatings.length} รีวิวผู้ใช้งาน
            </div>
          </div>
        </div>
      </div>

      {/* Main Reviews List */}
      <div className="space-y-4">
        {reviews.filter((r: Review) => !r.is_reply).map((review) => (
          <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold flex-shrink-0">
                  {(review.user?.username?.[0] || "U").toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{review.user?.username || "ผู้ใช้"}</p>
                  <p className="text-xs text-gray-500">{globalFormatDate(review.created_at)}</p>
                </div>
              </div>
              {review.rating && (
                <div className="text-yellow-400 text-sm">
                  {"★".repeat(review.rating)}
                </div>
              )}
            </div>
            
            <p className="text-gray-800 mb-4 leading-relaxed">{review.comment}</p>
            
            {user && (
              <button
                onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                className="text-sm text-red-600 hover:underline font-semibold"
              >
                {replyingTo === review.id ? "ยกเลิกการตอบ" : "ตอบกลับ"}
              </button>
            )}
            
            {replyingTo === review.id && (
              <div className="mt-4">
                <ReplyForm
                  parentId={review.id}
                  fieldId={Number(fieldId)}
                  onReplySubmitted={() => {
                    setReplyingTo(null)
                    fetchReviews()
                  }}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}
            
            {/* Nested Replies Section */}
            {review.replies && review.replies.length > 0 && (
              <div className="mt-6 pt-2 border-t border-gray-50">
                {review.replies.map((reply) => (
                  <ReplyItem 
                    key={reply.id} 
                    reply={reply} 
                    fieldId={Number(fieldId)}
                    onReplySubmitted={fetchReviews}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}