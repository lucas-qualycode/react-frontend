import { fetchApi } from '@/shared/api/client'
import {
  appendInvitationAccessQuery,
  InvitationAccessFailure,
  readApiErrorDetail,
  type InvitationAccess,
} from '@/shared/api/invitationAccess'
import { isInvitationGuestView } from '@/features/events/components/invitationFlow/lib/guestInvitationApi'
import type {
  Event,
  EventPrimaryCategory,
  EventVisibility,
  FieldDefinition,
  FulfillmentType,
  Invitation,
  InvitationDestinationType,
  InvitationGuestSlotStatus,
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

export type CreateDraftEventPayload = {
  name: string
  description?: string
  tag_ids: string[]
  visibility?: EventVisibility
  primary_category?: EventPrimaryCategory
}

export type PatchEventIdentityPayload = {
  name?: string
  description?: string
  tag_ids?: string[]
  imageURL?: string | null
  visibility?: EventVisibility
  primary_category?: EventPrimaryCategory
}

export type PatchEventVenuePayload = {
  is_online: boolean
  location_id?: string | null
}

export type PatchEventCommercePayload = {
  is_paid: boolean
}

export type SetupStatus = {
  status: 'draft' | 'ready' | 'active'
  missing: string[]
  sections: Record<string, boolean>
}

export type CompleteSetupResponse = {
  event_id: string
  active: boolean
  setup_completed_at: string
}

export async function listUserEvents(userId: string): Promise<Event[]> {
  const params = new URLSearchParams({ created_by: userId })
  const res = await fetchApi(`events?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to load events')
  return res.json() as Promise<Event[]>
}

export async function getEvent(
  eventId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<Event> {
  const path = appendInvitationAccessQuery(`events/${eventId}`, invitationAccess)
  const res = await fetchApi(path, undefined, invitationAccess)
  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    if (
      detail === 'invitation_expired' ||
      detail === 'invitation_access_token_invalid'
    ) {
      throw new InvitationAccessFailure(detail)
    }
    throw new Error(detail ?? 'Failed to load event')
  }
  return res.json() as Promise<Event>
}

export async function createDraftEvent(payload: CreateDraftEventPayload): Promise<Event> {
  const res = await fetchApi('events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Event>
}

export async function patchEventIdentity(
  eventId: string,
  payload: PatchEventIdentityPayload,
): Promise<Event> {
  const res = await fetchApi(`events/${eventId}/identity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Event>
}

export async function patchEventVenue(
  eventId: string,
  payload: PatchEventVenuePayload,
): Promise<Event> {
  const res = await fetchApi(`events/${eventId}/venue`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Event>
}

export async function patchEventCommerce(
  eventId: string,
  payload: PatchEventCommercePayload,
): Promise<Event> {
  const res = await fetchApi(`events/${eventId}/commerce`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Event>
}

export async function getEventSetup(eventId: string): Promise<SetupStatus> {
  const res = await fetchApi(`events/${eventId}/setup`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<SetupStatus>
}

export async function completeEventSetup(eventId: string): Promise<CompleteSetupResponse> {
  const res = await fetchApi(`events/${eventId}/setup/complete`, { method: 'POST' })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<CompleteSetupResponse>
}

export async function deleteEvent(eventId: string): Promise<Event> {
  const res = await fetchApi(`events/${eventId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete event')
  return res.json() as Promise<Event>
}

export async function listLocations(): Promise<Location[]> {
  const res = await fetchApi('locations')
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
  const res = await fetchApi(`events/${eventId}/schedules`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Schedule[]>
}

export async function createSchedule(
  eventId: string,
  payload: CreateSchedulePayload,
): Promise<Schedule> {
  const res = await fetchApi(`events/${eventId}/schedules`, {
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
  eventId: string,
  scheduleId: string,
  payload: UpdateSchedulePayload,
): Promise<Schedule> {
  const res = await fetchApi(`events/${eventId}/schedules/${scheduleId}`, {
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
  const params = new URLSearchParams({ active: 'true' })
  const res = await fetchApi(`field-definitions?${params.toString()}`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<FieldDefinition[]>
}

export async function listEventProducts(
  eventId: string,
  opts: { type: ProductKind },
): Promise<Product[]> {
  const params = new URLSearchParams({ type: opts.type })
  const res = await fetchApi(`events/${eventId}/products?${params.toString()}`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Product[]>
}

export async function listInvitationProducts(
  invitationId: string,
  opts: { type: ProductKind; invitationAccess?: InvitationAccess | null },
): Promise<Product[]> {
  const params = new URLSearchParams({ type: opts.type })
  const path = appendInvitationAccessQuery(
    `invitations/${invitationId}/products?${params.toString()}`,
    opts.invitationAccess,
    { includeInvitationId: false },
  )
  const res = await fetchApi(path, undefined, opts.invitationAccess)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Product[]>
}

export async function createProduct(
  eventId: string,
  payload: CreateProductPayload,
): Promise<Product> {
  const additional_info_fields = payload.additional_info_fields ?? []
  const res = await fetchApi(`events/${eventId}/products`, {
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
  eventId: string,
  productId: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const res = await fetchApi(`events/${eventId}/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Product>
}

export async function deleteProduct(eventId: string, productId: string): Promise<void> {
  const res = await fetchApi(`events/${eventId}/products/${productId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
}

export async function listInvitations(eventId: string): Promise<Invitation[]> {
  const res = await fetchApi(`events/${eventId}/invitations`)
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Invitation[]>
}

export type CreateInvitationPayload = {
  name: string
  destination: string
  destination_type: InvitationDestinationType
  expires_at: string
  ticket_id?: string | null
  metadata?: Record<string, unknown>
  tag_ids?: string[]
  guest_slot_count?: number
  guests?: { first_name: string; required_field_ids: string[] }[]
}

export type CreateInvitationResponse = Invitation & { access_token?: string }

export async function createInvitation(
  eventId: string,
  payload: CreateInvitationPayload,
): Promise<CreateInvitationResponse> {
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    destination: payload.destination.trim(),
    destination_type: payload.destination_type,
    expires_at: payload.expires_at,
    metadata: payload.metadata ?? {},
    tag_ids: payload.tag_ids ?? [],
    guest_slot_count: payload.guest_slot_count ?? 0,
  }
  const tid = payload.ticket_id?.trim()
  if (tid) body.ticket_id = tid
  if (payload.guests !== undefined) {
    body.guests = payload.guests.map((g) => ({
      first_name: (g.first_name ?? '').trim(),
      required_field_ids: g.required_field_ids ?? [],
    }))
  }
  const res = await fetchApi(`events/${eventId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<CreateInvitationResponse>
}

export async function regenerateInvitationAccessToken(
  eventId: string,
  invitationId: string,
): Promise<{ access_token: string }> {
  const res = await fetchApi(
    `events/${eventId}/invitations/${invitationId}/access-token`,
    { method: 'POST' },
  )
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<{ access_token: string }>
}

export async function getInvitation(
  invitationId: string,
  invitationAccess?: InvitationAccess | null,
): Promise<Invitation> {
  const path = appendInvitationAccessQuery(
    `invitations/${invitationId}`,
    invitationAccess,
    { includeInvitationId: false },
  )
  const res = await fetchApi(path, undefined, invitationAccess)
  if (!res.ok) {
    const detail = await readApiErrorDetail(res)
    if (
      detail === 'invitation_expired' ||
      detail === 'invitation_access_token_invalid'
    ) {
      throw new InvitationAccessFailure(detail)
    }
    throw new Error(detail ?? `Request failed (${res.status})`)
  }
  const data = (await res.json()) as unknown
  if (isInvitationGuestView(data)) {
    return {
      ...data.invitation,
      guest_slots: data.guest_slots.map(({ user_product: _up, ...slot }) => ({
        ...slot,
        status: slot.status as InvitationGuestSlotStatus,
      })),
    }
  }
  return data as Invitation
}

export type UpdateInvitationPayload = {
  name?: string
  destination?: string
  destination_type?: InvitationDestinationType
  expires_at?: string
  ticket_id?: string | null
  metadata?: Record<string, unknown>
  tag_ids?: string[]
  guest_slot_count?: number
  guests?: { first_name: string; required_field_ids: string[] }[]
}

export async function updateInvitation(
  eventId: string,
  invitationId: string,
  payload: UpdateInvitationPayload,
): Promise<Invitation> {
  const body: Record<string, unknown> = {}
  if (payload.name !== undefined) body.name = payload.name.trim()
  if (payload.destination !== undefined) body.destination = payload.destination.trim()
  if (payload.destination_type !== undefined) body.destination_type = payload.destination_type
  if (payload.expires_at !== undefined) body.expires_at = payload.expires_at
  if (payload.metadata !== undefined) body.metadata = payload.metadata
  if (payload.tag_ids !== undefined) body.tag_ids = payload.tag_ids
  if (payload.guest_slot_count !== undefined) body.guest_slot_count = payload.guest_slot_count
  if (payload.ticket_id !== undefined) {
    const tid = payload.ticket_id?.trim()
    body.ticket_id = tid || null
  }
  if (payload.guests !== undefined) {
    body.guests = payload.guests.map((g) => ({
      first_name: (g.first_name ?? '').trim(),
      required_field_ids: g.required_field_ids ?? [],
    }))
  }
  const res = await fetchApi(`events/${eventId}/invitations/${invitationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
  return res.json() as Promise<Invitation>
}

export async function deleteInvitation(eventId: string, invitationId: string): Promise<void> {
  const res = await fetchApi(`events/${eventId}/invitations/${invitationId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res))
}
