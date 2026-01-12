import { Promotion } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'

/**
 * Calculate discount amount based on promotion type
 * @param basePrice - Original price
 * @param promotion - Promotion object
 * @returns Discount amount in baht
 */
export function calculateDiscount(basePrice: number, promotion: Promotion): number {
  if (!isPromotionValid(promotion)) {
    return 0
  }

  let discount = 0

  // Calculate discount based on type
  if (promotion.discount_amount && promotion.discount_amount > 0) {
    // Fixed amount discount (e.g., 200 baht off)
    discount = promotion.discount_amount
  } else if (promotion.discount_percentage && promotion.discount_percentage > 0) {
    // Percentage discount (e.g., 20% off)
    discount = (basePrice * promotion.discount_percentage) / 100
  }

  // Don't allow discount to exceed the base price
  return Math.min(discount, basePrice)
}

/**
 * Calculate final price after applying promotion
 * @param basePrice - Original price
 * @param promotion - Promotion object
 * @returns Final price
 */
export function calculateFinalPrice(basePrice: number, promotion: Promotion | null): number {
  if (!promotion) {
    return basePrice
  }

  const discount = calculateDiscount(basePrice, promotion)
  return Math.max(0, basePrice - discount)
}

/**
 * Check if promotion is valid (not expired, active status)
 * @param promotion - Promotion object
 * @returns true if promotion is valid and usable
 */
export function isPromotionValid(promotion: Promotion): boolean {
  if (!promotion || promotion.status !== 'active') {
    return false
  }

  const now = new Date()
  const validFrom = new Date(promotion.valid_from)
  const validUntil = new Date(promotion.valid_until)

  return now >= validFrom && now <= validUntil
}

/**
 * Format promotion code for display
 * @param promotion - Promotion object
 * @returns Formatted promotion description
 */
export function getPromotionDisplayText(promotion: Promotion): string {
  if (promotion.discount_amount && promotion.discount_amount > 0) {
    return `ลด ${promotion.discount_amount} บาท`
  } else if (promotion.discount_percentage && promotion.discount_percentage > 0) {
    return `ลด ${promotion.discount_percentage}%`
  }
  return 'โปรโมชั่น'
}

/**
 * Mock promotion data for testing
 */
export const mockPromotions: Promotion[] = [
  {
    id: 'promo-001',
    name: 'SUMMER200',
    description: 'ส่วนลดฤดูร้อน 200 บาท',
    discount_percentage: null,
    discount_amount: 200,
    valid_from: new Date('2025-01-01').toISOString(),
    valid_until: new Date('2026-12-31').toISOString(),
    status: 'active',
  },
  {
    id: 'promo-002',
    name: 'WELCOME20',
    description: 'ส่วนลด 20% สำหรับสมาชิกใหม่',
    discount_percentage: 20,
    discount_amount: null,
    valid_from: new Date('2025-01-01').toISOString(),
    valid_until: new Date('2026-12-31').toISOString(),
    status: 'active',
  },
  {
    id: 'promo-003',
    name: 'VIPUSER500',
    description: 'ส่วนลด 500 บาทสำหรับสมาชิก VIP',
    discount_percentage: null,
    discount_amount: 500,
    valid_from: new Date('2025-01-01').toISOString(),
    valid_until: new Date('2026-12-31').toISOString(),
    status: 'active',
  },
  {
    id: 'promo-004',
    name: 'EXPIRED2024',
    description: 'โปรโมชั่นที่หมดอายุแล้ว',
    discount_percentage: null,
    discount_amount: 300,
    valid_from: new Date('2023-01-01').toISOString(),
    valid_until: new Date('2024-12-31').toISOString(),
    status: 'active',
  },
]

/**
 * Search for promotion by code (queries Supabase database with fallback to mock data)
 * @param code - Promotion code
 * @returns Promotion object or null
 */
export async function searchPromotionByCode(code: string): Promise<Promotion | null> {
  try {
    const supabase = createClient()
    const normalizedCode = code.toUpperCase().trim()

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('name', normalizedCode)
      .single()

    if (error || !data) {
      // Fallback to mock data if database query fails or no data found
      console.log('Database query failed or no data, using mock data fallback')
      const mockPromotion = mockPromotions.find(
        (p) => p.name.toUpperCase() === normalizedCode
      )
      return mockPromotion || null
    }

    return data as Promotion
  } catch (error) {
    console.error('Error searching promotion:', error)
    // Fallback to mock data
    const normalizedCode = code.toUpperCase().trim()
    const mockPromotion = mockPromotions.find(
      (p) => p.name.toUpperCase() === normalizedCode
    )
    return mockPromotion || null
  }
}
