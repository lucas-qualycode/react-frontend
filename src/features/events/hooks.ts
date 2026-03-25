import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEvent,
  createEventType,
  deleteEvent,
  getEvent,
  listEventTypes,
  listUserEvents,
  updateEvent,
  type CreateEventPayload,
  type CreateEventTypePayload,
  type UpdateEventPayload,
} from './api'
import type { Event, EventType } from '@/shared/types/api'

function compareByCreatedAtDesc(a: Event, b: Event): number {
  const at = a.created_at ? new Date(a.created_at).getTime() : 0
  const bt = b.created_at ? new Date(b.created_at).getTime() : 0
  return bt - at
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

export function useEventTypes() {
  return useQuery({
    queryKey: ['eventTypes'],
    queryFn: async (): Promise<EventType[]> => listEventTypes({ active: true, deleted: false }),
    staleTime: 60_000,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
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
    },
  })
}

export function useCreateEventType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEventTypePayload) => createEventType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTypes'] })
    },
  })
}

