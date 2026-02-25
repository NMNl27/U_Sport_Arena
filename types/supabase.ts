// Database Types - Exact Schema Match

export interface User {
  user_id: string // UUID, Primary Key
  username: string
  email: string
  // optional avatar URL stored in `users` profile
  avatar_url?: string | null
  // whether user account is active (true) or banned/inactive (false)
  status_active?: boolean
  role: string
  phone_number: string
  membership_type: string
}

export interface Field {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  status: string
}

export interface Booking {
  id: string
  user_id: string
  field_id: string
  start_time: string // ISO timestamp
  end_time: string // ISO timestamp
  status: string
  payment_status: string
  promotion_id: string | null
  total_price?: number
  created_at: string // ISO timestamp when booking was created
}

export interface Promotion {
  id: string
  name: string
  description: string | null
  discount_percentage: number | null
  discount_amount: number | null
  valid_from: string
  valid_until: string
  status: string
}

export interface Payment {
  id: string
  booking_id: string
  amount: number
  payment_method: string
  status: string
  transaction_id: string | null
  created_at: string
}

export interface Review {
  id: string
  booking_id: string
  user_id: string
  field_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface Log {
  id: string
  user_id: string | null
  action: string
  details: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'booking' | 'payment' | 'promotion' | 'system' | 'review'
  is_read: boolean
  related_id?: string | null
  created_at: string
}


