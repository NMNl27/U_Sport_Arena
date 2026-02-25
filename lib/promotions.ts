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
 * Check if user has already used this promotion
 * @param promotionId - Promotion ID
 * @param userId - User ID
 * @returns true if user can use this promotion
 */
export async function canUserUsePromotion(promotionId: string, userId: string): Promise<boolean> {
  if (!userId) {
    console.log('canUserUsePromotion: No userId provided')
    return false
  }
  
  try {
    const supabase = createClient()
    console.log('Checking promotion usage:', { promotionId, userId })
    
    const { data, error } = await supabase
      .from('promotion_usage')
      .select('id')
      .eq('promotion_id', promotionId)
      .eq('user_id', userId)
      .single()
    
    console.log('Promotion usage check result:', { data, error })
    
    // Check specific error types
    if (error) {
      // Table doesn't exist or permission issues - allow usage for now
      if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('permission')) {
        console.log('promotion_usage table not accessible, allowing usage')
        return true
      }
    }
    
    // If no record found (error), user can use the promotion
    // If record found (data), user cannot use the promotion
    const canUse = !!error
    console.log('User can use promotion:', canUse)
    return canUse
  } catch (error) {
    console.error('Error checking promotion usage:', error)
    // If there's a complete error, allow usage (better than blocking legitimate users)
    return true
  }
}

/**
 * Search for promotion by code (queries Supabase database only)
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
      console.log('Promotion not found in database:', { code: normalizedCode, error })
      return null
    }

    return data as Promotion
  } catch (error) {
    console.error('Error searching promotion:', error)
    return null
  }
}
