export interface EventTagEmbed {
  id: string
  name: string
  parent_tag_id?: string | null
}

export interface Location {
  id: string
  venue_name: string
  formatted_address?: string | null
  maps_url?: string | null
  street_line1?: string | null
  street_line2?: string | null
  locality?: string | null
  region?: string | null
  postal_code?: string | null
  country?: string | null
  website_url?: string | null
  latitude?: number | null
  longitude?: number | null
  place_provider?: string | null
  place_id?: string | null
  deleted?: boolean
  created_at?: string
  updated_at?: string
  created_by?: string
  last_updated_by?: string
}

export interface ScheduleExclusion {
  id: string
  type: string
  value: string | string[]
  description?: string | null
}

export interface Schedule {
  id: string
  event_id: string
  parent_id?: string | null
  stand_id?: string | null
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  timezone: string
  exclusions: ScheduleExclusion[]
  status: 'active' | 'cancelled' | 'completed'
  notes?: string | null
  created_at: string
  updated_at: string
  last_updated_by: string
}

export interface Event {
  id: string
  name: string
  description?: string
  location_id?: string | null
  location?: Location | null
  active: boolean
  is_paid: boolean
  is_online: boolean
  tags?: EventTagEmbed[]
  imageURL?: string
  deleted?: boolean
  created_at?: string
  updated_at?: string
  created_by?: string
  last_updated_by?: string
}

export interface Tag {
  id: string
  name: string
  description?: string
  parent_tag_id?: string | null
  applies_to: string[]
  depth?: number
  active?: boolean
  deleted?: boolean
  created_at?: string
  updated_at?: string
  created_by?: string
  last_updated_by?: string
}

export interface Invitation {
  id: string
  [key: string]: unknown
}

export interface ProductInventoryEmbed {
  id: string
  available_quantity: number
  reserved_quantity: number
  total_quantity: number
}

export type ProductKind = 'TICKET' | 'MERCH'

export type FulfillmentType = 'DIGITAL' | 'WILL_CALL' | 'SHIPPING' | 'PICKUP'

export interface Product {
  id: string
  name: string
  description: string
  imageURL?: string | null
  parent_id?: string | null
  parent_type?: string | null
  type?: ProductKind | null
  fulfillment_type?: FulfillmentType | null
  fulfillment_profile_id?: string | null
  user_id: string
  is_free: boolean
  value: number
  quantity: number
  max_per_user: number
  request_additional_info: boolean
  active: boolean
  deleted?: boolean
  created_at: string
  updated_at: string
  created_by: string
  last_updated_by: string
  metadata?: Record<string, unknown>
  tags?: EventTagEmbed[]
  inventory?: ProductInventoryEmbed | null
}

export interface Address {
  id: string
  [key: string]: unknown
}

export interface Order {
  id: string
  [key: string]: unknown
}

export interface Payment {
  id: string
  [key: string]: unknown
}

export interface User {
  uid: string
  email?: string
  [key: string]: unknown
}
