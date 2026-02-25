"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trash2, Star, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"

interface Review {
  id: number
  field_id: number
  user_id: string
  rating: number
  comment: string
  created_at: string
  parent_id?: number
  is_reply?: boolean
  field?: {
    name: string
  }
  user?: {
    user_id: string
    username: string
    email: string
    user_metadata?: {
      full_name?: string
    }
  }
}

// Field Rating Chart Component
function FieldRatingChart({ reviews }: { reviews: Review[] }) {
  // Calculate average rating per field (เฉพาะรีวิวหลัก)
  const fieldStats = reviews.reduce((acc, review) => {
    if (!review.is_reply && review.rating !== null) { // นับเฉพาะรีวิวหลัก
      const fieldId = review.field_id
      const fieldName = review.field?.name || `สนาม #${fieldId}`
      if (!acc[fieldId]) {
        acc[fieldId] = { name: fieldName, totalRating: 0, count: 0 }
      }
      acc[fieldId].totalRating += review.rating
      acc[fieldId].count += 1
    }
    return acc
  }, {} as Record<number, { name: string; totalRating: number; count: number }>)

  // Convert to array and sort by average rating (descending)
  const sortedFields = Object.entries(fieldStats)
    .map(([fieldId, stats]) => ({
      fieldId: Number(fieldId),
      name: stats.name,
      avg: stats.count > 0 ? stats.totalRating / stats.count : 0,
      count: stats.count
    }))
    .sort((a, b) => b.avg - a.avg)

  const maxAvg = Math.max(...sortedFields.map(f => f.avg), 5)

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => (
        <div key={field.fieldId} className="flex items-center gap-4">
          <Link
            href={`/fields/${field.fieldId}`}
            className="w-48 text-sm font-medium text-gray-700 truncate hover:text-red-600 hover:underline"
          >
            {field.name}
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    field.avg >= 4.5 ? 'bg-green-500' :
                    field.avg >= 4.0 ? 'bg-emerald-500' :
                    field.avg >= 3.5 ? 'bg-yellow-500' :
                    field.avg >= 3.0 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(field.avg / maxAvg) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900 w-12">
                {field.avg.toFixed(1)}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-500 w-16 text-right">
            {field.count} รีวิว
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showStarBreakdown, setShowStarBreakdown] = useState(false)
  const [collapsedReviews, setCollapsedReviews] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [filterField, setFilterField] = useState<string>("all")
  const [filterRating, setFilterRating] = useState<string>("all")
  const [filterOnlyReplies, setFilterOnlyReplies] = useState<boolean>(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null)
  const supabase = createClient()

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, field:field_id(name), user:user_id(*)")
        .order("created_at", { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setReviews(data || [])
      }
    } catch (err) {
      setError("Failed to fetch reviews")
    } finally {
      setLoading(false)
    }
  }

  const toggleCollapse = (reviewId: number) => {
    setCollapsedReviews(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  const deleteReview = async (review: Review) => {
    setReviewToDelete(review)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteReview = async () => {
    if (!reviewToDelete) return

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewToDelete.id)

      if (error) {
        alert("เกิดข้อผิดพลาดในการลบรีวิว: " + error.message)
      } else {
        setReviews(reviews.filter(r => r.id !== reviewToDelete.id))
        alert("ลบรีวิวเรียบร้อยแล้ว")
        setShowDeleteConfirm(false)
        setReviewToDelete(null)
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลบรีวิว")
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setReviewToDelete(null)
  }

  // ฟังก์ชันกรองรีวิว
  const filteredReviews = reviews.filter(review => {
    // ค้นหาตามคำค้นหา
    const matchesSearch = searchTerm === "" || 
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.field?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // กรองตามสนาม
    const matchesField = filterField === "all" || review.field_id.toString() === filterField
    
    // กรองตามคะแนน (เฉพาะรีวิวหลัก)
    const matchesRating = filterRating === "all" || 
      (filterOnlyReplies ? true : (!review.is_reply && review.rating === parseInt(filterRating)))
    
    // กรองเฉพาะการตอบกลับ
    const matchesOnlyReplies = !filterOnlyReplies || review.is_reply
    
    return matchesSearch && matchesField && matchesRating && matchesOnlyReplies
  })

  // ดึงรายชื่อสนามที่มีรีวิว
  const uniqueFields = Array.from(new Set(reviews.map(r => r.field_id))).map(fieldId => {
    const review = reviews.find(r => r.field_id === fieldId)
    return { id: fieldId, name: review?.field?.name || `สนาม #${fieldId}` }
  })

  useEffect(() => {
    fetchReviews()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              กลับไป
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">จัดการรีวิว</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-600">
            {error}
          </div>
        )}

        <div style={{ position: 'relative', minHeight: '800px' }}>
          {/* Left Sidebar - Stats */}
          <div style={{ position: 'absolute', left: '0', top: '0', width: '280px' }}>
            {/* Total Reviews */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-4">
              <p className="text-sm text-gray-500 mb-1">รีวิวทั้งหมด</p>
              <p className="text-3xl font-bold text-gray-900">{reviews.length}</p>
            </div>

            {/* Average Rating */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-4">
              <p className="text-sm text-gray-500 mb-1">คะแนนเฉลี่ย</p>
              <p className="text-3xl font-bold text-yellow-500">
                {(() => {
                  const mainReviews = reviews.filter(r => !r.is_reply && r.rating !== null)
                  return mainReviews.length > 0
                    ? (mainReviews.reduce((sum, r) => sum + r.rating, 0) / mainReviews.length).toFixed(1)
                    : "0.0"
                })()} {" "}
                <Star className="inline w-6 h-6" />
              </p>
            </div>

            {/* Star Rating Breakdown Dropdown */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowStarBreakdown(!showStarBreakdown)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">แยกจำนวนตามดาว</span>
                {showStarBreakdown ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {showStarBreakdown && (
                <div className="border-t border-gray-100">
                  {/* 5 Star */}
                  <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="text-yellow-500">★★★★★</span> 5 ดาว
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {reviews.filter(r => !r.is_reply && r.rating === 5).length}
                    </span>
                  </div>
                  {/* 4 Star */}
                  <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="text-yellow-500">★★★★</span><span className="text-gray-300">★</span> 4 ดาว
                    </span>
                    <span className="text-lg font-bold text-emerald-500">
                      {reviews.filter(r => !r.is_reply && r.rating === 4).length}
                    </span>
                  </div>
                  {/* 3 Star */}
                  <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="text-yellow-500">★★★</span><span className="text-gray-300">★★</span> 3 ดาว
                    </span>
                    <span className="text-lg font-bold text-yellow-500">
                      {reviews.filter(r => !r.is_reply && r.rating === 3).length}
                    </span>
                  </div>
                  {/* 2 Star */}
                  <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="text-yellow-500">★★</span><span className="text-gray-300">★★★</span> 2 ดาว
                    </span>
                    <span className="text-lg font-bold text-orange-500">
                      {reviews.filter(r => !r.is_reply && r.rating === 2).length}
                    </span>
                  </div>
                  {/* 1 Star */}
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="text-yellow-500">★</span><span className="text-gray-300">★★★★</span> 1 ดาว
                    </span>
                    <span className="text-lg font-bold text-red-500">
                      {reviews.filter(r => !r.is_reply && r.rating === 1).length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ paddingLeft: '300px' }}>
            {/* Field Rating Comparison Chart */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">เปรียบเทียบคะแนนรีวิวแต่ละสนาม</h2>
                <FieldRatingChart reviews={reviews} />
              </div>
            )}

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">กรองรีวิว</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ค้นหา */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาความคิดเห็น, ผู้ใช้, หรือสนาม..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                {/* กรองตามสนาม */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">สนาม</label>
                  <select
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">ทุกสนาม</option>
                    {uniqueFields.map(field => (
                      <option key={field.id} value={field.id.toString()}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* กรองตามคะแนน/ประเภท */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ประเภท</label>
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="5">5 ดาว</option>
                    <option value="4">4 ดาว</option>
                    <option value="3">3 ดาว</option>
                    <option value="2">2 ดาว</option>
                    <option value="1">1 ดาว</option>
                  </select>
                </div>
                
                {/* แสดงเฉพาะการตอบกลับ */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filterOnlyReplies}
                      onChange={(e) => setFilterOnlyReplies(e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">เฉพาะการตอบกลับ</span>
                  </label>
                </div>
              </div>
              
              {/* แสดงผลการกรอง */}
              <div className="mt-4 text-sm text-gray-600">
                พบ {filteredReviews.length} จาก {reviews.length} รายการ
              </div>
            </div>

            {/* Reviews List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">ผู้ใช้</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">สนาม</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">คะแนน</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">ความคิดเห็น</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">วันที่</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">ยังไม่มีรีวิวในระบบ</td>
                      </tr>
                    ) : (
                      filterOnlyReplies ? (
                        // แสดงเฉพาะการตอบกลับ (ทุกระดับ)
                        (() => {
                          console.log('Filter mode: Only replies, filterRating:', filterRating)
                          
                          // ถ้าเลือก "ทั้งหมด" ให้แสดงการตอบกลับทั้งหมด
                          if (filterRating === "all") {
                            const allReplies = filteredReviews.filter(review => review.is_reply)
                            console.log('All replies found:', allReplies.length)
                            
                            // สร้างฟังก์ชันสำหรับสร้างโครงสร้างแบบซ้อนกัน
                            const buildNestedStructure = (flatReplies: any[], parentId?: number | null, level: number = 1): any[] => {
                              const directReplies = flatReplies.filter(r => {
                                if (parentId === null || parentId === undefined) {
                                  // ระดับบนสุด: หาการตอบกลับที่ parent_id ไม่ใช่ null และไม่มี parent ใน flatReplies
                                  return r.parent_id !== null && r.parent_id !== undefined && 
                                         !flatReplies.some(parent => parent.id === r.parent_id)
                                } else {
                                  // ระดับอื่นๆ: หาการตอบกลับที่ parent_id ตรงกับ parentId
                                  return r.parent_id === parentId
                                }
                              })
                              return directReplies.map(reply => ({
                                ...reply,
                                level,
                                nestedReplies: buildNestedStructure(flatReplies, reply.id, level + 1)
                              }))
                            }
                            
                            const nestedReplies = buildNestedStructure(allReplies, undefined, 1)
                            console.log('Nested replies structure:', nestedReplies)
                            
                            // ฟังก์ชันสำหรับแสดงผล
                            const renderNestedRepliesForFilter = (replies: any[], level: number = 1) => {
                              return replies.map((reply) => (
                                <React.Fragment key={reply.id}>
                                  <tr className={`${level > 1 ? 'bg-gray-100' : 'bg-gray-50'} hover:bg-gray-200`}>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {reply.user?.username ||
                                        reply.user?.email?.split("@")[0] ||
                                        "ผู้ใช้"}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                          ตอบกลับ {level > 1 && `(${level})`}
                                        </span>
                                        <Link
                                          href={`/fields/${reply.field_id}`}
                                          className="text-red-600 hover:underline text-sm"
                                        >
                                          {reply.field?.name || `สนาม #${reply.field_id}`}
                                        </Link>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="text-gray-400 text-sm">-</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                      <div className="max-w-md">
                                        <div className="text-xs text-blue-600 mb-1">
                                          ตอบกลับรีวิว #{reply.parent_id}
                                        </div>
                                        <div className="text-sm">
                                          {reply.comment || "-"}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                      {formatDate(reply.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteReview(reply)}
                                        className="text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                  {reply.nestedReplies && reply.nestedReplies.length > 0 && 
                                    renderNestedRepliesForFilter(reply.nestedReplies, level + 1)
                                  }
                                </React.Fragment>
                              ))
                            }
                            
                            return renderNestedRepliesForFilter(nestedReplies)
                          } else {
                            // ถ้าเลือกคะแนน ให้กรองตามรีวิวหลักที่มีคะแนนนั้น
                            console.log('Filtering by rating:', filterRating)
                            const mainReviewsMatchingFilter = filteredReviews.filter(review => 
                              !review.is_reply && 
                              review.rating === parseInt(filterRating)
                            )
                            console.log('Main reviews with this rating:', mainReviewsMatchingFilter.length)
                            const mainReviewIds = mainReviewsMatchingFilter.map(r => r.id)
                            console.log('Main review IDs:', mainReviewIds)
                            
                            // ดึงการตอบกลับทั้งหมดที่เกี่ยวข้องกับรีวิวหลักเหล่านั้น (ทุกระดับ)
                            const getAllRelatedReplies = (reviewIds: number[], allReplies: any[]): any[] => {
                              const relatedReplyIds = new Set<number>()
                              
                              // ฟังก์ชัน recursive เพื่อหา reply ID ทั้งหมดที่เกี่ยวข้อง
                              const findRelatedReplies = (parentIds: number[]) => {
                                const directReplies = allReplies.filter(r => 
                                  r.is_reply && 
                                  parentIds.includes(r.parent_id!)
                                )
                                
                                directReplies.forEach(reply => {
                                  if (!relatedReplyIds.has(reply.id)) {
                                    relatedReplyIds.add(reply.id)
                                    // หาการตอบกลับของ reply นี้ต่อ
                                    findRelatedReplies([reply.id])
                                  }
                                })
                              }
                              
                              findRelatedReplies(reviewIds)
                              return allReplies.filter(r => relatedReplyIds.has(r.id))
                            }
                            
                            const allMatchingReplies = getAllRelatedReplies(mainReviewIds, filteredReviews)
                            console.log('All matching replies (all levels):', allMatchingReplies.length)
                            
                            // สร้างฟังก์ชันสำหรับสร้างโครงสร้างแบบซ้อนกัน
                            const buildNestedStructure = (flatReplies: any[], parentId?: number | null, level: number = 1): any[] => {
                              let directReplies: any[] = []
                              
                              if (parentId === null || parentId === undefined) {
                                // ระดับบนสุด: หาการตอบกลับระดับแรกที่เกี่ยวข้องกับรีวิวหลัก
                                directReplies = flatReplies.filter(r => 
                                  r.is_reply === true && 
                                  mainReviewIds.includes(r.parent_id!)
                                )
                              } else {
                                // ระดับอื่นๆ: หาการตอบกลับที่ parent_id ตรงกับ parentId
                                directReplies = flatReplies.filter(r => r.parent_id === parentId)
                              }
                              
                              return directReplies.map(reply => ({
                                ...reply,
                                level,
                                nestedReplies: buildNestedStructure(flatReplies, reply.id, level + 1)
                              }))
                            }
                            
                            const nestedReplies = buildNestedStructure(allMatchingReplies, undefined, 1)
                            console.log('Nested replies structure:', nestedReplies)
                            
                            // ฟังก์ชันสำหรับแสดงผล
                            const renderNestedRepliesForFilter = (replies: any[], level: number = 1) => {
                              return replies.map((reply) => (
                                <React.Fragment key={reply.id}>
                                  <tr className={`${level > 1 ? 'bg-gray-100' : 'bg-gray-50'} hover:bg-gray-200`}>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {reply.user?.username ||
                                        reply.user?.email?.split("@")[0] ||
                                        "ผู้ใช้"}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                          ตอบกลับ {level > 1 && `(${level})`}
                                        </span>
                                        <Link
                                          href={`/fields/${reply.field_id}`}
                                          className="text-red-600 hover:underline text-sm"
                                        >
                                          {reply.field?.name || `สนาม #${reply.field_id}`}
                                        </Link>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="text-gray-400 text-sm">-</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                      <div className="max-w-md">
                                        <div className="text-xs text-blue-600 mb-1">
                                          ตอบกลับรีวิว #{reply.parent_id}
                                        </div>
                                        <div className="text-sm">
                                          {reply.comment || "-"}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                      {formatDate(reply.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteReview(reply)}
                                        className="text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                  {reply.nestedReplies && reply.nestedReplies.length > 0 && 
                                    renderNestedRepliesForFilter(reply.nestedReplies, level + 1)
                                  }
                                </React.Fragment>
                              ))
                            }
                            
                            return renderNestedRepliesForFilter(nestedReplies)
                          }
                        })()
                      ) : (
                        // แสดงแบบปกติ (รีวิวหลัก + การตอบกลับ)
                        filteredReviews
                          .filter(review => !review.is_reply) // แสดงเฉพาะรีวิวหลัก
                          .map((review) => {
                            // ดึงการตอบกลับทั้งหมดของรีวิวนี้ (ไม่กรองตามคะแนน)
                            const replies = filteredReviews.filter(r => r.parent_id === review.id)
                            const isCollapsed = !collapsedReviews.has(review.id)
                            
                            // ฟังก์ชันสำหรับดึงการตอบกลับซ้อนกันแบบ recursive
                            const getNestedReplies = (parentId: number, level: number = 1): (Review & { level: number; nestedReplies: any[] })[] => {
                              const directReplies = filteredReviews.filter(r => r.parent_id === parentId)
                              return directReplies.map(reply => ({
                                ...reply,
                                level,
                                nestedReplies: getNestedReplies(reply.id, level + 1)
                              }))
                            }
                            
                            // ฟังก์ชันสำหรับนับการตอบกลับทั้งหมด (ทุกระดับ)
                            const countAllReplies = (replies: any[]): number => {
                              return replies.reduce((total, reply) => {
                                return total + 1 + (reply.nestedReplies ? countAllReplies(reply.nestedReplies) : 0)
                              }, 0)
                            }
                            
                            // ฟังก์ชันสำหรับแสดงการตอบกลับซ้อนกัน
                            const renderNestedReplies = (replies: any[], level: number = 1) => {
                              return replies.map((reply) => (
                                <React.Fragment key={reply.id}>
                                  <tr className={`${level > 1 ? 'bg-gray-100' : 'bg-gray-50'} hover:bg-gray-200`}>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {reply.user?.username ||
                                        reply.user?.email?.split("@")[0] ||
                                        "ผู้ใช้"}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                          ตอบกลับ {level > 1 && `(${level})`}
                                        </span>
                                        <Link
                                          href={`/fields/${reply.field_id}`}
                                          className="text-red-600 hover:underline text-sm"
                                        >
                                          {reply.field?.name || `สนาม #${reply.field_id}`}
                                        </Link>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="text-gray-400 text-sm">-</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                      <div className="max-w-md">
                                        <div className="text-xs text-blue-600 mb-1">
                                          ตอบกลับรีวิว #{reply.parent_id}
                                        </div>
                                        <div className="text-sm">
                                          {reply.comment || "-"}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                      {formatDate(reply.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteReview(reply)}
                                        className="text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                  {reply.nestedReplies && reply.nestedReplies.length > 0 && 
                                    renderNestedReplies(reply.nestedReplies, level + 1)
                                  }
                                </React.Fragment>
                              ))
                            }
                            
                            const allRepliesWithNesting = getNestedReplies(review.id)
                            const totalReplyCount = countAllReplies(allRepliesWithNesting)
                            
                            return (
                              <React.Fragment key={review.id}>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {review.user?.username ||
                                      review.user?.email?.split("@")[0] ||
                                      "ผู้ใช้"}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <Link
                                        href={`/fields/${review.field_id}`}
                                        className="text-red-600 hover:underline"
                                      >
                                        {review.field?.name || `สนาม #${review.field_id}`}
                                      </Link>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-yellow-500">
                                      {"★".repeat(review.rating)}
                                      {"☆".repeat(5 - review.rating)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-700">
                                    <div className="max-w-md">
                                      <div>{review.comment || "-"}</div>
                                      {totalReplyCount > 0 && (
                                        <button
                                          onClick={() => toggleCollapse(review.id)}
                                          className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
                                        >
                                          {isCollapsed ? (
                                            <><ChevronDown className="w-3 h-3" /> แสดง {totalReplyCount} การตอบกลับ</>
                                          ) : (
                                            <><ChevronUp className="w-3 h-3" /> ซ่อน {totalReplyCount} การตอบกลับ</>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                    {formatDate(review.created_at)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteReview(review)}
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                                
                                {/* แสดงการตอบกลับเมื่อไม่ได้ซ่อน */}
                                {!isCollapsed && renderNestedReplies(allRepliesWithNesting)}
                              </React.Fragment>
                            )
                          })
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && reviewToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบรีวิว</h3>
                <p className="text-sm text-gray-600">คุณต้องการลบรีวิวนี้หรือไม่?</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">ผู้ใช้:</span>
                  <span className="text-sm text-gray-900">
                    {reviewToDelete.user?.username || reviewToDelete.user?.email?.split("@")[0] || "ผู้ใช้"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">สนาม:</span>
                  <span className="text-sm text-gray-900">
                    {reviewToDelete.field?.name || `สนาม #${reviewToDelete.field_id}`}
                  </span>
                </div>
                {!reviewToDelete.is_reply && reviewToDelete.rating && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">คะแนน:</span>
                    <span className="text-yellow-500 text-sm">
                      {"★".repeat(reviewToDelete.rating)}
                      {"☆".repeat(5 - reviewToDelete.rating)}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-gray-600">ความคิดเห็น:</span>
                  <span className="text-sm text-gray-900 text-right max-w-xs">
                    {reviewToDelete.comment || "-"}
                  </span>
                </div>
                {reviewToDelete.is_reply && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600">ประเภท:</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      การตอบกลับ
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>คำเตือน:</strong> คอมเมนท์นี้จะไม่สามารถกู้คืนได้
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDeleteReview}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
