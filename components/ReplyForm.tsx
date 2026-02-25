"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

interface ReplyFormProps {
  parentId: number
  fieldId: number
  isReplyToReply?: boolean
  onReplySubmitted?: () => void
  onCancel?: () => void
}

export function ReplyForm({ parentId, fieldId, isReplyToReply = false, onReplySubmitted, onCancel }: ReplyFormProps) {
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนตอบกลับ")
      return
    }

    if (!comment.trim()) {
      alert("กรุณากรอกความคิดเห็น")
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("reviews").insert({
        field_id: fieldId,
        user_id: user.id,
        comment: comment.trim(),
        is_reply: true,
        parent_id: parentId,
        rating: null, // การตอบกลับไม่มีคะแนน
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error submitting reply:", error)
        alert("เกิดข้อผิดพลาดในการตอบกลับ: " + error.message)
      } else {
        setComment("")
        alert("ตอบกลับเรียบร้อยแล้ว!")
        onReplySubmitted?.()
      }
    } catch (error) {
      console.error("Error submitting reply:", error)
      alert("เกิดข้อผิดพลาดในการตอบกลับ")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`mt-4 p-4 ${isReplyToReply ? 'bg-gray-100' : 'bg-gray-50'} rounded-lg border border-gray-200`}>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label
            htmlFor={`reply-${parentId}`}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {isReplyToReply ? 'เขียนการตอบกลับเพิ่มเติม' : 'เขียนการตอบกลับ'}
          </label>
          <textarea
            id={`reply-${parentId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isReplyToReply ? 'เขียนความคิดเห็นเพิ่มเติม...' : 'เขียนความคิดเห็นของคุณ...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "กำลังส่ง..." : "ตอบกลับ"}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
