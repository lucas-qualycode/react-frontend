import { fetchApi } from '@/shared/api/client'
import type {
  Event,
  FieldDefinition,
  FulfillmentType,
  Location,
  Product,
  ProductKind,
  Schedule,
  Tag,
} from '@/shared/types/api'

async function apiErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: unknown; detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
    if (typeof j.error === 'string') return j.error
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`
}

export type CreateLocationPayload = {
  venue_name: string
  formatted_address?: string
  maps_url?: string
}

export type CreateEventPayload = {
  name: string
  description?: string
  location_id?: string | null
  tag_ids: string[]
  imageURL?: string
  active?: boolean
  is_paid?: boolean
  is_online?: boolean
}

export type UpdateEventPayload = {
  name?: string
  description?: string
  location_id?: string | null
  tag_ids?: string[]
  imageURL?: string | null
  active?: boolean
  is_paid?: boolean
  is_online?: boolean
}

export async function listUserEvents(userId: string): Promise<Event[]> {
  const params = new URLSearchParams({ created_by: userId, deleted: 'false' })
  const res = await fetchApi(`events?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to load events')
  return res.json() as Promise<Event[]>
}

export async function getEvent(eventId: string): Promise<Event> {
  const res = await fetchApi(`events/${eventId}`)
  if (!res.ok) throw new Error('Failed to load event')
  return res.json() as Promise<Event>
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const res = await fetchApi('events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create event')
  return res.json() as Promise<Event>
}

export async function updateEvent(
  eventId: string,
  payload: UpdateEventPayload
): Promise<Event> {
  const res = await fetchApi(`events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update event')
  return res.json() as Promise<Event>
}

export async function deleteEvent(eventId: string): Promise<Event> {
  const res = await fetchApi(`events/${eventId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete event')
  return res.json() as Promise<Event>
}

export async function listLocations(): Promise<Location[]> {
  const params = new URLSearchParams({ deleted: 'false' })
  const res = await fetchApi(`locations?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to load locations')
  return res.json() as Promise<Location[]>
}

export async function createLocation(payload: CreateLocationPayload): Promise<Location> {
  const body: Record<string, string> = {
    venue_name: payload.venue_name.trim(),
  }
  const fa = payload.formatted_address?.trim()
  const mu = payload.maps_url?.trim()
  if (fa) body.formatted_address = fa
  if (mu) body.maps_url = mu
  const res = await fetchApi('locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create location')
  return res.json() as Promise<Location>
}

export async function listTags(params?: {
  active?: boolean
  deleted?: boolean
  applies_to?: string
}): Promise<Tag[]> {
  const q = new URLSearchParams()
  if (params?.active !== undefined) q.set('active', String(params.active))
  if (params?.deleted !== undefined) q.set('deleted', String(params.deleted))
  if (params?.applies_to !== undefined) q.set('applies_to', params.applies_to)
  const qs = q.toString()
  const path = qs ? `tags?${qs}` : 'tags'
  const res = await fetchApi(path)
  if (!res.ok) throw new Error('Failed to load tags')
  return res.json() as Promise<Tag[]>
}

export type CreateTagPayload = {
  name: string
  description?: string
  active?: boolean
  parent_tag_id?: string | null
  applies_to: string[]
}

export async function createTag(payload: CreateTagPayload): Promise<Tag> {
  const res = await fetchApi('tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create tag')
  return res.json() as Promise<Tag>
}

export type CreateSchedulePayload = {
  event_id: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  timezone: string
  status: Schedule['status']
  exclusions?: Schedule['exclusions']
  notes?: string | null
}

export type UpdateSchedulePayload = {
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  timezone?: string
  status?: Schedule['status']
  exclusions?: Schedule['exclusions']
  notes?: string | null
}

export async function listSchedules(eventId: string): Promise<Schedule[]> {
  const params = new URLSearchParams({ event_id: eventId })
  const res = await fetchApi(`schedules?${params.toString()}`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Schedule[]>
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<Schedule> {
  const res = await fetchApi('schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      exclusions: payload.exclusions ?? [],
    }),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Schedule>
}

export async function updateSchedule(
  scheduleId: string,
  payload: UpdateSchedulePayload
): Promise<Schedule> {
  const res = await fetchApi(`schedules/${scheduleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Schedule>
}

export type ProductAdditionalInfoFieldInput = {
  field_id: string
  order?: number
  required?: boolean
}

export type CreateProductPayload = {
  name: string
  description: string
  imageURL?: string | null
  parent_id: string | null
  parent_type: string | null
  type?: ProductKind | null
  fulfillment_type?: FulfillmentType | null
  is_free: boolean
  value: number
  quantity: number
  max_per_user: number
  additional_info_fields?: ProductAdditionalInfoFieldInput[]
  active?: boolean
  metadata?: Record<string, unknown>
  tag_ids?: string[]
}

export type UpdateProductPayload = {
  name?: string
  description?: string
  imageURL?: string | null
  parent_id?: string | null
  parent_type?: string | null
  type?: ProductKind | null
  fulfillment_type?: FulfillmentType | null
  is_free?: boolean
  value?: number
  quantity?: number
  max_per_user?: number
  additional_info_fields?: ProductAdditionalInfoFieldInput[]
  active?: boolean
  metadata?: Record<string, unknown>
  tag_ids?: string[]
}

export async function listFieldDefinitions(): Promise<FieldDefinition[]> {
  const params = new URLSearchParams({
    deleted: 'false',
    active: 'true',
  })
  const res = await fetchApi(`field-definitions?${params.toString()}`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<FieldDefinition[]>
}

export async function listEventProducts(
  eventId: string,
  opts?: { type?: ProductKind },
): Promise<Product[]> {
  const params = new URLSearchParams({
    parent_id: eventId,
    deleted: 'false',
  })
  if (opts?.type) {
    params.set('type', opts.type)
  }
  const res = await fetchApi(`products?${params.toString()}`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Product[]>
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const additional_info_fields = payload.additional_info_fields ?? []
  const res = await fetchApi('products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      additional_info_fields,
      tag_ids: payload.tag_ids ?? [],
      metadata: payload.metadata ?? {},
      active: payload.active ?? true,
    }),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Product>
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload
): Promise<Product> {
  const res = await fetchApi(`products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Product>
}

export async function deleteProduct(productId: string): Promise<void> {
  const res = await fetchApi(`products/${productId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
}
