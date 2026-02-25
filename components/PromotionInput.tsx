"use client"

import { useState, useEffect } from "react"
import { Promotion } from "@/types/supabase"
import { searchPromotionByCode, isPromotionValid, getPromotionDisplayText, canUserUsePromotion } from "@/lib/promotions"

interface PromotionInputProps {
  onApplyPromotion: (promotion: Promotion | null) => void
  appliedPromotion: Promotion | null
  onCodeChange?: (hasCode: boolean) => void
  userId?: string | null
}

export function PromotionInput({ onApplyPromotion, appliedPromotion, onCodeChange, userId }: PromotionInputProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Reset code when promotion is applied
  useEffect(() => {
    if (appliedPromotion) {
      setCode("")
      setSuccess(false)
      setError("")
    }
  }, [appliedPromotion])

  const handleApplyCode = async () => {
    if (!code.trim()) {
      setError("กรุณากรอกรหัสส่วนลด")
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const promotion = await searchPromotionByCode(code)

      if (!promotion) {
        setError("รหัสส่วนลดไม่ถูกต้อง")
        setLoading(false)
        return
      }

      if (!isPromotionValid(promotion)) {
        setError("โปรโมชั่นหมดอายุแล้ว")
        setLoading(false)
        return
      }

      // Check if user has already used this promotion
      if (userId && promotion) {
        console.log('Checking promotion usage for user:', { userId, promotionId: promotion.id, promotionName: promotion.name })
        const canUse = await canUserUsePromotion(promotion.id, userId)
        if (!canUse) {
          setError("คุณได้ใช้รหัสส่วนลดนี้ไปแล้ว")
          setLoading(false)
          return
        }
      } else {
        console.log('Skipping promotion usage check:', { userId, promotion: !!promotion })
      }

      onApplyPromotion(promotion)
      setSuccess(true)
      setCode("")
      setError("")
      onCodeChange?.(false)
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการตรวจสอบรหัสส่วนลด")
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePromotion = () => {
    onApplyPromotion(null)
    setCode("")
    setError("")
    setSuccess(false)
    onCodeChange?.(false)
  }

  return (
    <div className="border-t pt-4 mb-6">
      {appliedPromotion ? (
        // Show applied promotion
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-green-600 text-white rounded-full p-2 mt-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-900">ใช้โปรโมชั่นสำเร็จ!</p>
                <p className="text-sm text-green-800">
                  {appliedPromotion.name}: {getPromotionDisplayText(appliedPromotion)}
                </p>
                {appliedPromotion.description && (
                  <p className="text-xs text-green-700 mt-1">{appliedPromotion.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleRemovePromotion}
              className="text-green-600 hover:text-green-900 font-semibold"
            >
              ลบ
            </button>
          </div>
        </div>
      ) : (
        // Show input form
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            รหัสส่วนลด
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const newValue = e.target.value
                setCode(newValue)
                const hasCode = newValue.trim().length > 0 && !appliedPromotion
                console.log("PromotionInput onChange:", { newValue, hasCode, appliedPromotion, onCodeChange })
                if (onCodeChange) {
                  onCodeChange(hasCode)
                }
              }}
              onKeyPress={(e) => e.key === "Enter" && handleApplyCode()}
              placeholder="ใส่รหัสส่วนลด"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 text-sm"
              disabled={loading}
            />
            <button
              onClick={handleApplyCode}
              disabled={loading || !code.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? "กำลังตรวจสอบ..." : "ใช้"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-sm text-red-700 font-semibold">⚠️ {error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
              <p className="text-sm text-green-700 font-semibold">✓ ใช้โปรโมชั่นสำเร็จ!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
