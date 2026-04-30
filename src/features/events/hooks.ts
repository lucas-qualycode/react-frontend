import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEvent,
  createInvitation,
  createLocation,
  createProduct,
  createSchedule,
  createTag,
  deleteEvent,
  deleteProduct,
  getEvent,
  getInvitation,
  listEventProducts,
  listFieldDefinitions,
  listInvitations,
  listLocations,
  listSchedules,
  listTags,
  listUserEvents,
  updateEvent,
  updateProduct,
  updateSchedule,
  updateInvitation,
  type CreateEventPayload,
  type CreateInvitationPayload,
  type CreateLocationPayload,
  type CreateProductPayload,
  type CreateSchedulePayload,
  type CreateTagPayload,
  type UpdateEventPayload,
  type UpdateInvitationPayload,
  type UpdateProductPayload,
  type UpdateSchedulePayload,
} from './api'
import type {
  Event,
  FieldDefinition,
  Invitation,
  Product,
  Schedule,
  Tag,
} from '@/shared/types/api'

function compareByCreatedAtDesc(a: Event, b: Event): number {
  const at = a.created_at ? new Date(a.created_at).getTime() : 0
  const bt = b.created_at ? new Date(b.created_at).getTime() : 0
  return bt - at
}

function compareScheduleByCreatedAtAsc(a: Schedule, b: Schedule): number {
  const at = new Date(a.created_at).getTime()
  const bt = new Date(b.created_at).getTime()
  return at - bt
}

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

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async (): Promise<Event> => getEvent(eventId!),
    enabled: !!eventId,
    staleTime: 30_000,
  })
}

export function useEventTags() {
  return useQuery({
    queryKey: ['eventTags'],
    queryFn: async (): Promise<Tag[]> => listTags({ active: true, deleted: false, applies_to: 'EVENT' }),
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

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: UpdateEventPayload }) =>
      updateEvent(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
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

export function useInvitation(invitationId: string | undefined) {
  return useQuery({
    queryKey: ['invitation', invitationId],
    queryFn: async (): Promise<Invitation> => getInvitation(invitationId!),
    enabled: !!invitationId,
    staleTime: 30_000,
  })
}

export function useInvitationTags() {
  return useQuery({
    queryKey: ['invitationTags'],
    queryFn: async (): Promise<Tag[]> =>
      listTags({ active: true, deleted: false, applies_to: 'INVITATION' }),
    staleTime: 60_000,
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInvitationPayload) => createInvitation(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', variables.event_id] })
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
    }) => updateInvitation(invitationId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', eventId] })
      queryClient.invalidateQueries({ queryKey: ['invitation', variables.invitationId] })
      queryClient.invalidateQueries({ queryKey: ['invitation'] })
    },
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSchedulePayload) => createSchedule(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.event_id] })
    },
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      scheduleId,
      payload,
    }: {
      scheduleId: string
      eventId: string
      payload: UpdateSchedulePayload
    }) => updateSchedule(scheduleId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.eventId] })
    },
  })
}

function isMerchandiseProduct(p: Product): boolean {
  return p.type !== 'TICKET'
}

function isTicketProduct(p: Product): boolean {
  return p.type === 'TICKET'
}

export function useEventMerchProducts(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventProducts', eventId, 'merch'],
    queryFn: async (): Promise<Product[]> => listEventProducts(eventId!),
    enabled: !!eventId,
    select: (list) => list.filter(isMerchandiseProduct),
    staleTime: 30_000,
  })
}

export function useEventTicketProducts(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventProducts', eventId, 'ticket'],
    queryFn: async (): Promise<Product[]> =>
      listEventProducts(eventId!, { type: 'TICKET' }),
    enabled: !!eventId,
    select: (list) => list.filter(isTicketProduct),
    staleTime: 30_000,
  })
}

export function useProductTags() {
  return useQuery({
    queryKey: ['productTags'],
    queryFn: async (): Promise<Tag[]> =>
      listTags({ active: true, deleted: false, applies_to: 'PRODUCT' }),
    staleTime: 60_000,
  })
}

export function useFieldDefinitions(enabled: boolean) {
  return useQuery({
    queryKey: ['fieldDefinitions'],
    queryFn: async (): Promise<FieldDefinition[]> => listFieldDefinitions(),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: (_data, variables) => {
      if (variables.parent_id) {
        queryClient.invalidateQueries({ queryKey: ['eventProducts', variables.parent_id] })
      }
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
    }) => updateProduct(vars.productId, vars.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventProducts', variables.eventId] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId }: { productId: string; eventId: string }) =>
      deleteProduct(productId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventProducts', variables.eventId] })
    },
  })
}
