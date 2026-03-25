import { fetchApi } from '@/shared/api/client'
import type { Event, EventType } from '@/shared/types/api'

export type CreateEventPayload = {
  name: string
  description?: string
  location?: string
  location_address?: string
  location_link?: string
  type_ids: string[]
  imageURL?: string
  active?: boolean
  is_paid?: boolean
  is_online?: boolean
}

export type UpdateEventPayload = {
  name?: string
  description?: string
  location?: string
  location_address?: string
  location_link?: string
  type_ids?: string[]
  imageURL?: string
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

export async function listEventTypes(params?: {
  active?: boolean
  deleted?: boolean
}): Promise<EventType[]> {
  const q = new URLSearchParams()
  if (params?.active !== undefined) q.set('active', String(params.active))
  if (params?.deleted !== undefined) q.set('deleted', String(params.deleted))
  const qs = q.toString()
  const path = qs ? `event-types?${qs}` : 'event-types'
  const res = await fetchApi(path)
  if (!res.ok) throw new Error('Failed to load event types')
  return res.json() as Promise<EventType[]>
}

export type CreateEventTypePayload = {
  name: string
  description?: string
  active?: boolean
}

export async function createEventType(payload: CreateEventTypePayload): Promise<EventType> {
  const res = await fetchApi('event-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create event type')
  return res.json() as Promise<EventType>
}

