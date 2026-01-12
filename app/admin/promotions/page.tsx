"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Promotion } from "@/types/supabase"
import { createClient } from "@/lib/supabase/client"
import { isPromotionValid, getPromotionDisplayText } from "@/lib/promotions"

export default function PromotionsAdmin() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discountType: "fixed" as "fixed" | "percentage",
    discountValue: "",
    validFrom: "",
    validUntil: "",
    status: "active" as "active" | "inactive",
  })

  useEffect(() => {
    setMounted(true)
    loadPromotions()
  }, [])

  const loadPromotions = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading promotions:', error)
        return
      }

      setPromotions(data || [])
    } catch (error) {
      console.error('Error loading promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      discountType: "fixed",
      discountValue: "",
      validFrom: "",
      validUntil: "",
      status: "active",
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleAddPromotion = async () => {
    if (
      !formData.name ||
      !formData.discountValue ||
      !formData.validFrom ||
      !formData.validUntil
    ) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }

    try {
      const supabase = createClient()
      const discountValue = parseFloat(formData.discountValue)

      const promotionData = {
        name: formData.name.toUpperCase(),
        description: formData.description,
        discount_amount: formData.discountType === "fixed" ? discountValue : null,
        discount_percentage: formData.discountType === "percentage" ? discountValue : null,
        valid_from: formData.validFrom,
        valid_until: formData.validUntil,
        status: formData.status,
      }

      const { data, error } = await supabase
        .from('promotions')
        .insert([promotionData])
        .select()
        .single()

      if (error) {
        console.error('Error adding promotion:', error)
        alert("เกิดข้อผิดพลาดในการเพิ่มโปรโมชั่น")
        return
      }

      setPromotions([data, ...promotions])
      resetForm()
      alert("เพิ่มโปรโมชั่นสำเร็จ!")
    } catch (error) {
      console.error('Error adding promotion:', error)
      alert("เกิดข้อผิดพลาดในการเพิ่มโปรโมชั่น")
    }
  }

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm("ต้องการลบโปรโมชั่นนี้หรือไม่?")) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting promotion:', error)
        alert("เกิดข้อผิดพลาดในการลบโปรโมชั่น")
        return
      }

      setPromotions(promotions.filter((p) => p.id !== id))
      alert("ลบโปรโมชั่นสำเร็จ!")
    } catch (error) {
      console.error('Error deleting promotion:', error)
      alert("เกิดข้อผิดพลาดในการลบโปรโมชั่น")
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      const promotion = promotions.find(p => p.id === id)
      if (!promotion) return

      const newStatus = promotion.status === "active" ? "inactive" : "active"

      const supabase = createClient()
      const { error } = await supabase
        .from('promotions')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) {
        console.error('Error updating promotion status:', error)
        alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ")
        return
      }

      setPromotions(
        promotions.map((p) =>
          p.id === id ? { ...p, status: newStatus } : p
        )
      )
    } catch (error) {
      console.error('Error updating promotion status:', error)
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ")
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg font-semibold">
        กำลังโหลด...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-red-600 hover:text-red-700 font-medium mb-4 inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                กลับไป
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">จัดการโปรโมชั่น</h1>
              <p className="text-gray-600 mt-2">
                สร้างและจัดการรหัสส่วนลดสำหรับการจองสนาม
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              {showForm ? "ยกเลิก" : "+ เพิ่มโปรโมชั่นใหม่"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? "แก้ไขโปรโมชั่น" : "สร้างโปรโมชั่นใหม่"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  รหัสโปรโมชั่น *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="เช่น SUMMER200, VIP500"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  คำอธิบาย
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="เช่น ส่วนลดฤดูร้อน 200 บาท"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ประเภทส่วนลด *
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountType: e.target.value as "fixed" | "percentage",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                >
                  <option value="fixed">จำนวนเงินคงที่ (บาท)</option>
                  <option value="percentage">ร้อยละ (%)</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  จำนวนส่วนลด *
                </label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: e.target.value })
                  }
                  placeholder={formData.discountType === "fixed" ? "200" : "20"}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Valid From */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  วันที่เริ่มต้น *
                </label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, validFrom: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  วันที่สิ้นสุด *
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) =>
                    setFormData({ ...formData, validUntil: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  สถานะ
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                >
                  <option value="active">เปิดใช้งาน</option>
                  <option value="inactive">ปิดใช้งาน</option>
                </select>
              </div>
            </div>

            {/* Form Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAddPromotion}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                บันทึกโปรโมชั่น
              </button>
              <button
                onClick={resetForm}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Promotions List */}
        {promotions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
                  promo.status === "active"
                    ? "border-l-green-600"
                    : "border-l-gray-400"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {promo.name}
                    </h3>
                    {promo.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {promo.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      promo.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {promo.status === "active" ? "ใช้งาน" : "ปิด"}
                  </span>
                </div>

                {/* Discount */}
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">ส่วนลด</p>
                  <p className="text-2xl font-bold text-red-600">
                    {getPromotionDisplayText(promo)}
                  </p>
                </div>

                {/* Dates */}
                <div className="space-y-2 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">ตั้งแต่:</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(promo.valid_from).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">ถึง:</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(promo.valid_until).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </div>

                {/* Valid Badge */}
                {isPromotionValid(promo) ? (
                  <div className="bg-green-50 border border-green-300 rounded p-2 mb-4">
                    <p className="text-xs text-green-700 font-semibold">
                      ✓ โปรโมชั่นยังคงใช้ได้
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-300 rounded p-2 mb-4">
                    <p className="text-xs text-red-700 font-semibold">
                      ✕ โปรโมชั่นหมดอายุ
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(promo.id)}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                      promo.status === "active"
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {promo.status === "active" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  </button>
                  <button
                    onClick={() => handleDeletePromotion(promo.id)}
                    className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors text-sm"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ไม่มีโปรโมชั่น
            </h3>
            <p className="text-gray-600 mb-6">สร้างโปรโมชั่นใหม่เพื่อเริ่มต้น</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              + เพิ่มโปรโมชั่นแรก
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
