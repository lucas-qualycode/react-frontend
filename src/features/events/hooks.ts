import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEvent,
  createLocation,
  createSchedule,
  createTag,
  deleteEvent,
  getEvent,
  listLocations,
  listSchedules,
  listTags,
  listUserEvents,
  updateEvent,
  updateSchedule,
  type CreateEventPayload,
  type CreateLocationPayload,
  type CreateSchedulePayload,
  type CreateTagPayload,
  type UpdateEventPayload,
  type UpdateSchedulePayload,
} from './api'
import type { Event, Schedule, Tag } from '@/shared/types/api'

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
