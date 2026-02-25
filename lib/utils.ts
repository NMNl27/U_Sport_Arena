import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cache for resolved image URLs
const imageUrlCache = new Map<string, string>()

// Resolve a field row's image URL consistently.
export async function resolveFieldImageUrl(supabase: any, row: any) {
  const fld = row ?? {}
  const cacheKey = `${fld.fields_id || fld.id || 'unknown'}_${fld.vip || 'normal'}`
  
  // Return cached result if available
  if (imageUrlCache.has(cacheKey)) {
    return imageUrlCache.get(cacheKey)!
  }
  
  const existing = fld.image_url ?? fld.imageUrl ?? fld.image ?? fld.imageURL
  if (existing) {
    imageUrlCache.set(cacheKey, existing)
    return existing
  }
  
  // Normalize vip truthy values: true, 'true', '1', 1, 't', 'yes'
  const vipVal = fld.vip
  const vipStr = vipVal === undefined || vipVal === null ? "" : String(vipVal).toLowerCase()
  const isVip = vipVal === true || ["true", "1", "t", "yes", "y"].includes(vipStr)
  const imageName = isVip ? "StadiumVIP.jpg" : "Stadium.jpg"
  
  try {
    const { data } = supabase.storage.from("fields").getPublicUrl(imageName)
    const publicUrl = data && (data as any).publicUrl
    if (publicUrl) {
      imageUrlCache.set(cacheKey, publicUrl)
      return publicUrl
    }
  } catch {
    // ignore and fall back
  }
  
  const fallbackUrl = "/assets/images/stadium.jpg"
  imageUrlCache.set(cacheKey, fallbackUrl)
  return fallbackUrl
}

// Fetch promotion images from Supabase bucket
export async function fetchPromotionImages(supabase: any) {
  try {
    console.log("Attempting to list files from promotions-image bucket...")
    
    // First, try to get bucket info
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      console.log("Available buckets:", buckets?.map((b: any) => b.name))
    } catch (err) {
      console.log("Cannot list buckets:", err)
    }
    
    // Try with different options
    const options = [
      { bucket: "promotions-image", path: "", options: { limit: 10 } },
      { bucket: "promotions-image", path: "", options: {} },
      { bucket: "promotions-image", path: null, options: { limit: 10 } }
    ]
    
    let data = null
    let error = null
    let bucketUsed = ""
    
    for (const option of options) {
      try {
        console.log(`Trying: bucket=${option.bucket}, path=${option.path}, options=`, option.options)
        const result = await supabase.storage
          .from(option.bucket)
          .list(option.path, option.options)
        
        if (!result.error && result.data && result.data.length > 0) {
          data = result.data
          bucketUsed = option.bucket
          console.log(`Success with ${option.bucket}:`, data)
          break
        } else {
          console.log(`No files with ${option.bucket}:`, result.data, "Error:", result.error)
        }
      } catch (err) {
        console.log(`Error with ${option.bucket}:`, err)
      }
    }
    
    // If still no data, try fields bucket
    if (!data || data.length === 0) {
      console.log("Trying fields bucket...")
      const result = await supabase.storage
        .from("fields")
        .list("", { limit: 10 })
      data = result.data
      error = result.error
      bucketUsed = "fields"
    }
    
    // Try direct URL approach for promotions-image
    if (!data || data.length === 0) {
      console.log("Trying direct URL approach...")
      const directUrls = [
        {
          url: `${supabase.supabaseUrl}/storage/v1/object/public/promotions-image/promo1.jpg`,
          alt: "Promotion 1"
        },
        {
          url: `${supabase.supabaseUrl}/storage/v1/object/public/promotions-image/promo2.jpg`,
          alt: "Promotion 2"
        },
        {
          url: `${supabase.supabaseUrl}/storage/v1/object/public/promotions-image/promo3.jpg`,
          alt: "Promotion 3"
        }
      ]
      
      console.log("Trying direct URLs:", directUrls)
      return directUrls
    }
    
    if (error || !data || data.length === 0) {
      console.log("No files found in any bucket, using fallback images...")
      return [
        {
          url: "https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg",
          alt: "U Sport Arena Promo"
        },
        {
          url: "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&h=400&fit=crop",
          alt: "Football Field"
        },
        {
          url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=400&fit=crop",
          alt: "Fitness Center"
        }
      ]
    }
    
    console.log(`Files found in ${bucketUsed} bucket:`, data)
    
    const imageUrls = await Promise.all(
      data.map(async (file: any) => {
        const { data: publicUrlData } = supabase.storage
          .from(bucketUsed)
          .getPublicUrl(file.name)
        
        console.log(`Public URL for ${file.name}:`, publicUrlData.publicUrl)
        
        return {
          url: publicUrlData.publicUrl,
          alt: file.name.replace(/\.[^/.]+$/, "") // Remove file extension
        }
      })
    )
    
    console.log("Final image URLs:", imageUrls)
    return imageUrls
  } catch (error) {
    console.error("Error fetching promotion images:", error)
    // Fallback to default images
    console.log("Using fallback images...")
    return [
      {
        url: "https://img.salehere.co.th/p/1200x0/2023/10/14/w52bktu2aajd.jpg",
        alt: "U Sport Arena Promo"
      },
      {
        url: "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&h=400&fit=crop",
        alt: "Football Field"
      },
      {
        url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=400&fit=crop",
        alt: "Fitness Center"
      }
    ]
  }
}

