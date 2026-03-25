export interface EventTagEmbed {
  id: string
  name: string
  parent_tag_id?: string | null
}

export interface Event {
  id: string
  name: string
  description?: string
  location?: string
  location_address?: string
  location_link?: string
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
