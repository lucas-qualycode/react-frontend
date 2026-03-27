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

export interface Product {
  id: string
  name?: string
  parent_id?: string
  [key: string]: unknown
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
