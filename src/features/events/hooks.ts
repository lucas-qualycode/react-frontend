import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteEvent, listUserEvents } from './api'
import type { Event } from '@/shared/types/api'

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

