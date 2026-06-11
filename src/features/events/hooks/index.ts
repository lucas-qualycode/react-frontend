import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FIELD_DEFINITIONS_GC_MS,
  FIELD_DEFINITIONS_STALE_MS,
  readFieldDefinitionsCache,
  writeFieldDefinitionsCache,
} from '@/shared/api/fieldDefinitionsCache'
import {
  completeEventSetup,
  createDraftEvent,
  createInvitation,
  createLocation,
  createProduct,
  createSchedule,
  createTag,
  deleteEvent,
  deleteInvitation,
  deleteProduct,
  getEvent,
  getEventSetup,
  getInvitation,
  listEventProducts,
  listEventUserProducts,
  listFieldDefinitions,
  listInvitationProducts,
  listInvitations,
  listLocations,
  listSchedules,
  listTags,
  listUserEvents,
  patchEventCommerce,
  patchEventIdentity,
  patchEventVenue,
  regenerateInvitationAccessToken,
  updateProduct,
  updateSchedule,
  updateInvitation,
  type CreateDraftEventPayload,
  type CreateInvitationPayload,
  type CreateLocationPayload,
  type CreateProductPayload,
  type CreateSchedulePayload,
  type CreateTagPayload,
  type PatchEventCommercePayload,
  type PatchEventIdentityPayload,
  type PatchEventVenuePayload,
  type UpdateInvitationPayload,
  type UpdateProductPayload,
  type UpdateSchedulePayload,
} from '../api'
import type {
  Event,
  FieldDefinition,
  Invitation,
  Product,
  Schedule,
  Tag,
} from '@/shared/types/api'
import { compareScheduleByCreatedAtAsc } from '../scheduleList'
import { useInvitationAccess } from '@/shared/api/InvitationAccessContext'

export function useUserEvents(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['userEvents', userId],
    queryFn: async (): Promise<Event[]> => listUserEvents(userId!),
    enabled: !!userId,
    select: (events) => events.slice().sort(compareByCreatedAtDesc),
    staleTime: 30_000,
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
    },
  })
}

function compareByCreatedAtDesc(a: Event, b: Event): number {
  const at = a.created_at ? new Date(a.created_at).getTime() : 0
  const bt = b.created_at ? new Date(b.created_at).getTime() : 0
  return bt - at
}

export function useEvent(eventId: string | undefined) {
  const invitationAccess = useInvitationAccess()
  return useQuery({
    queryKey: ['event', eventId, invitationAccess?.token ?? ''],
    queryFn: async (): Promise<Event> => getEvent(eventId!, invitationAccess),
    enabled: !!eventId,
    staleTime: 30_000,
  })
}

export function useEventSetup(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventSetup', eventId],
    queryFn: async () => getEventSetup(eventId!),
    enabled: !!eventId,
    staleTime: 10_000,
  })
}

export function useEventTags() {
  return useQuery({
    queryKey: ['eventTags'],
    queryFn: async (): Promise<Tag[]> => listTags({ active: true, applies_to: 'EVENT' }),
    staleTime: 60_000,
  })
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
    staleTime: 30_000,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLocationPayload) => createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useCreateDraftEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDraftEventPayload) => createDraftEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
    },
  })
}

export function usePatchEventIdentity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: PatchEventIdentityPayload }) =>
      patchEventIdentity(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
      queryClient.invalidateQueries({ queryKey: ['eventSetup'] })
    },
  })
}

export function usePatchEventVenue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: PatchEventVenuePayload }) =>
      patchEventVenue(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
      queryClient.invalidateQueries({ queryKey: ['eventSetup'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function usePatchEventCommerce() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: PatchEventCommercePayload }) =>
      patchEventCommerce(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
    },
  })
}

export function useCompleteEventSetup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => completeEventSetup(eventId),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['eventSetup', eventId] })
    },
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTagPayload) => createTag(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTags'] })
      queryClient.invalidateQueries({ queryKey: ['productTags'] })
    },
  })
}

export function useEventSchedules(eventId: string | undefined) {
  return useQuery({
    queryKey: ['schedules', eventId],
    queryFn: async (): Promise<Schedule[]> => listSchedules(eventId!),
    enabled: !!eventId,
    select: (list) => list.slice().sort(compareScheduleByCreatedAtAsc),
  })
}

export function useEventInvitations(eventId: string | undefined) {
  return useQuery({
    queryKey: ['invitations', eventId],
    queryFn: async (): Promise<Invitation[]> => listInvitations(eventId!),
    enabled: !!eventId,
    staleTime: 30_000,
  })
}

export function useInvitation(
  eventId: string | undefined,
  invitationId: string | undefined,
) {
  const invitationAccess = useInvitationAccess()
  return useQuery({
    queryKey: ['invitation', eventId, invitationId, invitationAccess?.token ?? ''],
    queryFn: async (): Promise<Invitation> =>
      getInvitation(eventId!, invitationId!, invitationAccess),
    enabled: !!eventId && !!invitationId,
    staleTime: 30_000,
  })
}

export function useRegenerateInvitationAccessToken(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) =>
      regenerateInvitationAccessToken(eventId!, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', eventId] })
    },
  })
}

export function useInvitationTags() {
  return useQuery({
    queryKey: ['invitationTags'],
    queryFn: async (): Promise<Tag[]> =>
      listTags({ active: true, applies_to: 'INVITATION' }),
    staleTime: 60_000,
  })
}

export function useCreateInvitation(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInvitationPayload) => createInvitation(eventId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', eventId] })
      queryClient.invalidateQueries({ queryKey: ['invitation'] })
    },
  })
}

export function useUpdateInvitation(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invitationId,
      payload,
    }: {
      invitationId: string
      payload: UpdateInvitationPayload
    }) => updateInvitation(eventId!, invitationId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', eventId] })
      queryClient.invalidateQueries({ queryKey: ['invitation', variables.invitationId] })
      queryClient.invalidateQueries({ queryKey: ['invitation'] })
    },
  })
}

export function useDeleteInvitation(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => deleteInvitation(eventId!, invitationId),
    onSuccess: (_data, invitationId) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', eventId] })
      queryClient.removeQueries({ queryKey: ['invitation', invitationId] })
    },
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string
      payload: CreateSchedulePayload
    }) => createSchedule(eventId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] })
    },
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      scheduleId,
      eventId,
      payload,
    }: {
      scheduleId: string
      eventId: string
      payload: UpdateSchedulePayload
    }) => updateSchedule(eventId, scheduleId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] })
    },
  })
}

function isGiftProduct(p: Product): boolean {
  return p.type === 'GIFT'
}

export function useEventGiftProducts(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventProducts', eventId, 'gift'],
    queryFn: async (): Promise<Product[]> =>
      listEventProducts(eventId!, { type: 'GIFT' }),
    enabled: !!eventId,
    select: (list) => list.filter(isGiftProduct),
    staleTime: 30_000,
  })
}

export function useInvitationGiftProducts(
  eventId: string | undefined,
  invitationId: string | undefined,
) {
  const invitationAccess = useInvitationAccess()
  return useQuery({
    queryKey: [
      'invitationProducts',
      eventId,
      invitationId,
      'gift',
      invitationAccess?.token ?? '',
    ],
    queryFn: async (): Promise<Product[]> =>
      listInvitationProducts(eventId!, invitationId!, {
        type: 'GIFT',
        invitationAccess,
      }),
    enabled: !!eventId && !!invitationId && !!invitationAccess,
    select: (list) => list.filter(isGiftProduct),
    staleTime: 30_000,
  })
}

export function useEventMerchProducts(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventProducts', eventId, 'merch'],
    queryFn: async (): Promise<Product[]> =>
      listEventProducts(eventId!, { type: 'GIFT' }),
    enabled: !!eventId,
    staleTime: 30_000,
  })
}

export function useEventTicketProducts(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventProducts', eventId, 'ticket'],
    queryFn: async (): Promise<Product[]> =>
      listEventProducts(eventId!, { type: 'TICKET' }),
    enabled: !!eventId,
    staleTime: 30_000,
  })
}

export function useInvitationTicketProducts(
  eventId: string | undefined,
  invitationId: string | undefined,
) {
  const invitationAccess = useInvitationAccess()
  return useQuery({
    queryKey: [
      'invitationProducts',
      eventId,
      invitationId,
      'ticket',
      invitationAccess?.token ?? '',
    ],
    queryFn: async (): Promise<Product[]> =>
      listInvitationProducts(eventId!, invitationId!, {
        type: 'TICKET',
        invitationAccess,
      }),
    enabled: !!eventId && !!invitationId && !!invitationAccess,
    staleTime: 30_000,
  })
}

export function useProductTags() {
  return useQuery({
    queryKey: ['productTags'],
    queryFn: async (): Promise<Tag[]> =>
      listTags({ active: true, applies_to: 'PRODUCT' }),
    staleTime: 60_000,
  })
}

export const fieldDefinitionsQueryKey = ['fieldDefinitions'] as const

export function useFieldDefinitions(enabled: boolean) {
  const cached = readFieldDefinitionsCache()

  return useQuery({
    queryKey: fieldDefinitionsQueryKey,
    queryFn: async (): Promise<FieldDefinition[]> => {
      const data = await listFieldDefinitions()
      writeFieldDefinitionsCache(data)
      return data
    },
    enabled,
    staleTime: FIELD_DEFINITIONS_STALE_MS,
    gcTime: FIELD_DEFINITIONS_GC_MS,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.fetchedAt,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string
      payload: CreateProductPayload
    }) => createProduct(eventId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventProducts', variables.eventId] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      productId: string
      eventId: string
      payload: UpdateProductPayload
    }) => updateProduct(vars.eventId, vars.productId, vars.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventProducts', variables.eventId] })
    },
  })
}

function useEventUserProductsByCatalog(
  eventId: string | undefined,
  catalogProductIds: Set<string>,
  productId: string | null | undefined,
  queryScope: 'gift' | 'ticket',
) {
  return useQuery({
    queryKey: ['eventUserProducts', eventId, queryScope, productId ?? 'all'],
    queryFn: () => listEventUserProducts(eventId!, { productId: productId ?? undefined }),
    enabled: !!eventId,
    select: (items) => items.filter((item) => catalogProductIds.has(item.product_id)),
    staleTime: 30_000,
  })
}

export function useEventGiftUserProducts(
  eventId: string | undefined,
  productId?: string | null,
) {
  const merchQ = useEventMerchProducts(eventId)
  const giftProductIds = useMemo(
    () => new Set((merchQ.data ?? []).map((p) => p.id)),
    [merchQ.data],
  )

  return useEventUserProductsByCatalog(eventId, giftProductIds, productId, 'gift')
}

export function useEventTicketUserProducts(
  eventId: string | undefined,
  ticketId?: string | null,
) {
  const ticketQ = useEventTicketProducts(eventId)
  const ticketProductIds = useMemo(
    () => new Set((ticketQ.data ?? []).map((p) => p.id)),
    [ticketQ.data],
  )

  return useEventUserProductsByCatalog(eventId, ticketProductIds, ticketId, 'ticket')
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, eventId }: { productId: string; eventId: string }) =>
      deleteProduct(eventId, productId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventProducts', variables.eventId] })
    },
  })
}
