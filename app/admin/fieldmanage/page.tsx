"use client"

import { useEffect, useState, useMemo } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Field } from "@/types/supabase"

export default function FieldManagePage() {
  const [fieldsList, setFieldsList] = useState<Field[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [fieldsPkName, setFieldsPkName] = useState<string | null>(null)
  const [fieldsColumns, setFieldsColumns] = useState<string[] | null>(null)
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [fieldForm, setFieldForm] = useState({ name: "", Location: "Khlong 6, Pathum Thani", price: "", image_url: "", status: "available", type: "", size: "", surface: "", vip: false })
  const [fieldImageFile, setFieldImageFile] = useState<File | null>(null)
  const [uploadingFieldImage, setUploadingFieldImage] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null)
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterVip, setFilterVip] = useState<string>('all')

  const handlePostgrestMissingColumn = (err: any) => {
    try {
      const msg: string = err?.message || ""
      const m = msg.match(/Could not find '([^']+)' column/)
      if (m && m[1]) return m[1]
    } catch (e) {
      // ignore
    }
    return null
  }

  const loadFields = async () => {
    setFieldsLoading(true)
    try {
      const { data, error } = await supabase.from("fields").select("*").order("name", { ascending: true })
      if (error) {
        console.error("Error loading fields:", error)
        setFieldsList([])
        return
      }

      const rows = (data as any[]) || []
      let pk: string | null = null
      let keys: string[] = []
      if (rows.length > 0) {
        keys = Object.keys(rows[0])
        const tableName = "fields"
        const singular = tableName.replace(/s$/, "")
        if (keys.includes("id")) pk = "id"
        else if (keys.includes(`${singular}_id`)) pk = `${singular}_id`
        else if (keys.includes(`${tableName}_id`)) pk = `${tableName}_id`
        else if (keys.includes("fieldId")) pk = "fieldId"
        else if (keys.includes("uuid")) pk = "uuid"
        else {
          const idKey = keys.find((k) => /_id$/.test(k))
          pk = idKey ?? keys[0]
        }
      }

      setFieldsPkName(pk)
      setFieldsColumns(keys.length > 0 ? keys : null)

      const normalized = rows.map((r: any) => {
        const idVal = pk ? r[pk] : (r.id ?? r.field_id ?? r.fieldId ?? r.uuid)
        return { ...(r as any), id: String(idVal) }
      })

      setFieldsList(normalized)
    } catch (e) {
      console.error("Unexpected error loading fields:", e)
      setFieldsList([])
    } finally {
      setFieldsLoading(false)
    }
  }

  useEffect(() => {
    loadFields()
  }, [])

  // Apply filters to fields
  const filteredFields = useMemo(() => {
    return fieldsList.filter((field) => {
      const status = (field as any).status || 'available'
      const type = (field as any).type || ''
      const isVip = (field as any).vip === true || String((field as any).vip) === 'true' || String((field as any).vip) === '1' || (field as any).is_vip === true

      // Status filter
      if (filterStatus !== 'all' && status.toLowerCase() !== filterStatus.toLowerCase()) {
        return false
      }

      // Type filter
      if (filterType !== 'all' && type.toLowerCase() !== filterType.toLowerCase()) {
        return false
      }

      // VIP filter
      if (filterVip !== 'all') {
        if (filterVip === 'vip' && !isVip) return false
        if (filterVip === 'regular' && isVip) return false
      }

      return true
    })
  }, [fieldsList, filterStatus, filterType, filterVip])

  const openAddField = () => {
    setEditingField(null)
    setFieldForm({ name: "", Location: "Khlong 6, Pathum Thani", price: "", image_url: "", status: "available", type: "", size: "", surface: "", vip: false })
    setFieldImageFile(null)
    setShowFieldForm(true)
  }

  const openEditField = (f: Field) => {
    setEditingField(f)
    setFieldForm({
      name: f.name,
      Location: (f as any).Location || "",
      price: String(f.price),
      image_url: f.image_url || "",
      status: (f as any).status ?? "available",
      type: (f as any).type ?? "",
      size: (f as any).size ?? "",
      surface: (f as any).surface ?? "",
      vip: (f as any).vip === true || String((f as any).vip) === 'true' || String((f as any).vip) === '1' || (f as any).is_vip === true,
    })
    setFieldImageFile(null)
    setShowFieldForm(true)
  }

  const uploadFieldImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingFieldImage(true)

      const form = new FormData()
      form.append('file', file)
      form.append('filename', file.name)

      const resp = await fetch('/api/admin/upload-field-image', {
        method: 'POST',
        body: form,
      })

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = json?.error || `Upload failed with status ${resp.status}`
        alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + msg)
        return null
      }

      return json?.publicUrl || null
    } catch (e: any) {
      console.error('Unexpected error uploading image:', e)
      alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + String(e?.message || e))
      return null
    } finally {
      setUploadingFieldImage(false)
    }
  }

  const saveField = async () => {
    if (!fieldForm.name || !fieldForm.price) {
      alert("กรุณากรอกชื่อและราคา")
      return
    }

    let imageUrl = fieldForm.image_url
    if (fieldImageFile) {
      const uploadedUrl = await uploadFieldImage(fieldImageFile)
      if (uploadedUrl) {
        imageUrl = uploadedUrl
        setFieldForm(prev => ({ ...prev, image_url: imageUrl }))
      } else {
        return
      }
    }

    const priceNum = parseFloat(fieldForm.price)
    let payload: Record<string, any> = {
      name: fieldForm.name,
      price: priceNum,
    }
    if (fieldForm.Location !== undefined) payload.Location = fieldForm.Location
    if (imageUrl !== undefined) payload.image_url = imageUrl
    if (fieldForm.status !== undefined) payload.status = fieldForm.status
    if (fieldForm.type !== undefined) payload.type = fieldForm.type
    if (fieldForm.size !== undefined) payload.size = fieldForm.size
    if (fieldForm.surface !== undefined) payload.surface = fieldForm.surface
    if (fieldForm.vip !== undefined) payload.vip = fieldForm.vip

    if (fieldsColumns && fieldsColumns.length > 0) {
      const allowed = new Set(fieldsColumns)
      payload = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.has(k)))
    }

    const handlePostgrestMissingColumn = (err: any) => {
      try {
        const msg: string = err?.message || ""
        const m = msg.match(/Could not find the '([^']+)' column/)
        if (m && m[1]) return m[1]
      } catch (e) {
        // ignore
      }
      return null
    }

    try {
      if (editingField) {
        const candidateSet = new Set<string>()
        if (fieldsColumns && fieldsColumns.length > 0) {
          ;["id", "field_id", "fields_id", "fieldId", "uuid"].forEach((c) => {
            if (fieldsColumns.includes(c)) candidateSet.add(c)
          })
          fieldsColumns.forEach((c) => { if (/_id$/.test(c)) candidateSet.add(c) })
          if (fieldsPkName) candidateSet.add(fieldsPkName)
        }
        ;[fieldsPkName, "fields_id", "field_id", "id", "fieldId", "uuid"].forEach((c) => { if (c) candidateSet.add(c) })
        const candidates = Array.from(candidateSet).filter(Boolean) as string[]

        let updated = false
        for (const candidate of candidates) {
          try {
            let attemptFiltered = (fieldsColumns && fieldsColumns.length > 0)
              ? Object.fromEntries(Object.entries(payload).filter(([k]) => fieldsColumns!.includes(k)))
              : { ...payload }

            let candidateValue: any = (editingField as any)[candidate] ?? (editingField as any).id
            if (typeof candidateValue === 'string' && /^\d+$/.test(candidateValue)) {
              candidateValue = Number(candidateValue)
            }

            while (true) {
              const apiResp = await fetch('/api/admin/fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidate, candidateValue, attemptFiltered }),
              })
              const res = await apiResp.json()

              if (!res.error && res.data) {
                const readRow = res.data as any
                setFieldsList(prev => prev.map(f => {
                  const fPk = (f as any)[candidate] ?? (f as any).id
                  if (String(fPk) === String(candidateValue)) {
                    return { ...f, ...readRow, id: String(readRow[candidate] ?? readRow.fields_id ?? readRow.id ?? (f as any).id) }
                  }
                  return f
                }))
                alert("อัปเดตฐานข้อมูลเรียบร้อย")
                updated = true
                break
              }

              const msg: string = res.error?.message || ""
              const missing = handlePostgrestMissingColumn(res.error)
              if (missing && Object.prototype.hasOwnProperty.call(attemptFiltered, missing)) {
                delete (attemptFiltered as any)[missing]
                if (Object.keys(attemptFiltered).length === 0) break
                continue
              }

              if (/Could not find the '\\w+' column/.test(msg) || (res.error?.code === "42703") || (res.error?.code === "PGRST204")) {
                break
              }

              console.error("Error updating field:", res.error)
              alert("เกิดข้อผิดพลาดในการอัปเดตสนาม")
              break
            }

            if (updated) break
          } catch (e) {
            console.error("Unexpected error during update attempt:", e)
          }
        }
      } else {
        let attemptPayload = { ...payload }
        while (true) {
          const apiResp = await fetch('/api/admin/fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'insert', insertPayload: attemptPayload }),
          })
          const res = await apiResp.json()

          if (!res.error && res.data) {
            const readRow = res.data as any
            const newRow = { ...(readRow as any), id: String(readRow.fields_id ?? readRow.id ?? readRow.field_id ?? readRow.fieldId ?? readRow.uuid) }
            setFieldsList(prev => [...prev, newRow])
            alert("สร้างสนามเรียบร้อย")
            break
          }

          const missing = handlePostgrestMissingColumn(res.error)
          if (missing && Object.prototype.hasOwnProperty.call(attemptPayload, missing)) {
            delete (attemptPayload as any)[missing]
            if (Object.keys(attemptPayload).length === 0) break
            continue
          }

          console.error("Error creating field:", res.error)
          alert("เกิดข้อผิดพลาดในการสร้างสนาม")
          break
        }
      }

      setShowFieldForm(false)
      await loadFields()
    } catch (e) {
      console.error("Unexpected error saving field:", e)
      alert("เกิดข้อผิดพลาด")
    }
  }

  const deleteField = async (field: Field) => {
    setFieldToDelete(field)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteField = async () => {
    if (!fieldToDelete) return
    
    try {
      const deleteCandidateSet = new Set<string>()
      if (fieldsColumns && fieldsColumns.length > 0) {
        ;["id", "field_id", "fields_id", "fieldId", "uuid"].forEach((c) => { if (fieldsColumns.includes(c)) deleteCandidateSet.add(c) })
        fieldsColumns.forEach((c) => { if (/_id$/.test(c)) deleteCandidateSet.add(c) })
        if (fieldsPkName) deleteCandidateSet.add(fieldsPkName)
      }
      ;[fieldsPkName, "fields_id", "field_id", "id", "fieldId", "uuid"].forEach((c) => { if (c) deleteCandidateSet.add(c) })
      const candidates = Array.from(deleteCandidateSet).filter(Boolean) as string[]

      let deleted = false
      for (const candidate of candidates) {
        try {
          let candidateValue: any = (fieldsList.find(f => String((f as any).id) === String((fieldToDelete as any).id)) as any)?.[candidate] ?? (fieldToDelete as any).id
          if (typeof candidateValue === 'string' && /^\d+$/.test(candidateValue)) candidateValue = Number(candidateValue)

          const apiResp = await fetch('/api/admin/fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', candidate, candidateValue }),
          })
          const res = await apiResp.json()

          if (!res.error) {
            setFieldsList(prev => prev.filter(f => String((f as any)[candidate] ?? (f as any).id) !== String(candidateValue)))
            deleted = true
            break
          }

          const msg: string = res.error?.message || ""
          if (/Could not find the '\\w+' column/.test(msg) || (res.error?.code === "42703") || (res.error?.code === "PGRST204")) {
            continue
          }

          console.error("Error deleting field:", res.error)
          alert("เกิดข้อผิดพลาดในการลบสนาม")
          return
        } catch (e) {
          console.error("Unexpected error deleting field:", e)
          alert("เกิดข้อผิดพลาด")
          return
        }
      }

      if (!deleted) {
        alert("เกิดข้อผิดพลาดในการลบสนาม")
        return
      }

      alert("ลบสนามเรียบร้อย")
      setShowDeleteConfirm(false)
      setFieldToDelete(null)
    } catch (e) {
      console.error("Unexpected error deleting field:", e)
      alert("เกิดข้อผิดพลาด")
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setFieldToDelete(null)
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <main className="min-h-screen bg-white">
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/admin" className="text-red-600 hover:text-red-700 font-medium mb-4 inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  กลับไป
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">จัดการสนาม</h1>
                <p className="text-gray-600 mt-2">เพิ่ม/แก้ไข/ลบสนาม และอัปโหลดรูปภาพ</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-2 py-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4 -mt-3">
              <h2 className="text-2xl font-semibold text-gray-900">รายการสนาม</h2>
              <button onClick={openAddField} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">+ เพิ่มสนาม</button>
            </div>

            {/* Filter Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">สถานะสนาม</label>
                  <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="available">ว่าง</option>
                    <option value="maintenance">กำลังซ่อม</option>
                    <option value="unavailable">ไม่ว่าง</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทกีฬา</label>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="ฟุตบอล">ฟุตบอล</option>
                    <option value="สระว่ายน้ำ">สระว่ายน้ำ</option>
                    <option value="ฟิตเนส">ฟิตเนส</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทสนาม</label>
                  <select 
                    value={filterVip} 
                    onChange={(e) => setFilterVip(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="regular">สนามทั่วไป</option>
                    <option value="vip">สนาม VIP</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setFilterStatus('all')
                      setFilterType('all')
                      setFilterVip('all')
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    ล้างตัวกรอง
                  </button>
                </div>
              </div>
            </div>

            {fieldsLoading ? (
              <div className="text-center py-8">กำลังโหลดสนาม...</div>
            ) : filteredFields.length === 0 ? (
              <div className="text-center py-8">
                {fieldsList.length === 0 ? "ไม่มีสนาม" : "ไม่มีสนามที่ตรงกับเงื่อนไขการกรอง"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFields.map((f) => {
                  const isVip = ((f as any).vip === true || String((f as any).vip) === 'true' || String((f as any).vip) === '1' || (f as any).is_vip === true)
                  const fieldId = String((f as any).id)
                  return (
                    <div key={fieldId} className={`relative border rounded-lg p-4 ${isVip ? 'border-yellow-400 bg-yellow-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{f.name}</h3>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              (String((f as any).status || "").toLowerCase() === "available") ? "bg-green-100 text-green-800" :
                              (String((f as any).status || "").toLowerCase() === "maintenance") ? "bg-yellow-100 text-yellow-800" :
                              (String((f as any).status || "").toLowerCase() === "unavailable") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {(f as any).status ?? "available"}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ml-2 ${
                              (String((f as any).type || "").toLowerCase() === "football") ? "bg-blue-100 text-blue-800" :
                              (String((f as any).type || "").toLowerCase() === "fitness") ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {(f as any).type ?? "-"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{(f as any).Location}</p>
                          {(f as any).size && <p className="text-sm">ขนาด: <span className="font-semibold">{(f as any).size}</span></p>}
                          {(f as any).surface && <p className="text-sm">พื้นสนาม: <span className="font-semibold">{(f as any).surface}</span></p>}
                          <p className="mt-2 text-sm">ราคา: <span className="font-semibold">{f.price}</span> บาท</p>
                          {isVip && (
                            <div className="mt-2">
                              <span className="inline-block bg-yellow-500 text-white px-2 py-1 text-xs font-semibold rounded">VIP</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {(f as any).image_url && (
                            <img 
                              src={(f as any).image_url} 
                              alt={f.name} 
                              className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                            />
                          )}
                          <div className="flex flex-col gap-2">
                            <button onClick={() => openEditField(f)} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded">แก้ไข</button>
                            <button onClick={() => deleteField(f)} className="px-3 py-1 bg-red-100 text-red-700 rounded">ลบ</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {showFieldForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">{editingField ? "แก้ไขสนาม" : "สร้างสนามใหม่"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">ชื่อสนาม</label>
                  <input value={fieldForm.name} onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">ราคา</label>
                  <input type="number" value={fieldForm.price} onChange={(e) => setFieldForm({ ...fieldForm, price: e.target.value })} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">สถานะ</label>
                  <select value={fieldForm.status} onChange={(e) => setFieldForm({ ...fieldForm, status: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="available">available</option>
                    <option value="maintenance">maintenance</option>
                    <option value="unavailable">unavailable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">ประเภท</label>
                  <select value={fieldForm.type} onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">เลือกประเภท</option>
                    <option value="ฟุตบอล">ฟุตบอล</option>
                    <option value="สระว่ายน้ำ">สระว่ายน้ำ</option>
                    <option value="ฟิตเนส">ฟิตเนส</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">ขนาด</label>
                  <select value={fieldForm.size} onChange={(e) => setFieldForm({ ...fieldForm, size: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">เลือกขนาด</option>
                    <option value="7 คน">7 คน</option>
                    <option value="11 คน">11 คน</option>
                    <option value="-">-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">พื้นสนาม (สำหรับฟุตบอล)</label>
                  <select value={fieldForm.surface} onChange={(e) => setFieldForm({ ...fieldForm, surface: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="">เลือกพื้นสนาม</option>
                    <option value="สนามหญ้าจริง">สนามหญ้าจริง</option>
                    <option value="สนามหญ้าเทียม">สนามหญ้าเทียม</option>
                    <option value="-">-</option>
                  </select>
                </div>
                                <div>
                  <label className="block text-sm font-medium">อัพโหลดรูปภาพ</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFieldImageFile(e.target.files?.[0] || null)}
                    disabled={uploadingFieldImage}
                    className="w-full px-3 py-2 border rounded"
                  />
                  {uploadingFieldImage && <p className="text-sm text-blue-600 mt-1">กำลังอัพโหลดรูปภาพ...</p>}
                  {fieldImageFile && <p className="text-sm text-green-600 mt-1">เลือก: {fieldImageFile.name}</p>}
                  {fieldForm.image_url && !fieldImageFile && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">รูปภาพปัจจุบัน:</p>
                      <img src={fieldForm.image_url} alt="field" className="max-h-20 rounded" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">VIP</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="field-vip"
                      type="checkbox"
                      checked={fieldForm.vip}
                      onChange={(e) => setFieldForm({ ...fieldForm, vip: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label htmlFor="field-vip" className="text-sm text-gray-600">เป็นสนาม VIP</label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">ตำแหน่งที่ตั้ง</label>
                  <textarea value={fieldForm.Location} onChange={(e) => setFieldForm({ ...fieldForm, Location: e.target.value })} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
              <div className="mt-4 flex gap-3 justify-end">
                <button onClick={() => { setShowFieldForm(false); setFieldImageFile(null); }} className="px-4 py-2 bg-gray-200 rounded">ยกเลิก</button>
                <button onClick={saveField} disabled={uploadingFieldImage} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">บันทึก</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && fieldToDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบสนาม</h3>
                  <p className="text-sm text-gray-600">คุณต้องการลบสนามนี้หรือไม่?</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  {fieldToDelete.image_url && (
                    <img 
                      src={fieldToDelete.image_url} 
                      alt={fieldToDelete.name} 
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{fieldToDelete.name}</p>
                    <p className="text-sm text-gray-600">{(fieldToDelete as any).Location}</p>
                    <p className="text-sm font-medium text-gray-900">ราคา: {fieldToDelete.price} บาท</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>คำเตือน:</strong> การลบสนามนี้จะไม่สามารถกู้คืนได้
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
                  onClick={confirmDeleteField}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  ยืนยันการลบ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  )
}
