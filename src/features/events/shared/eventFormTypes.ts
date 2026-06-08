import type { Dayjs } from 'dayjs'
import type { EventVisibility } from '@/shared/types/api'

export type EventFormValues = {
  name: string
  description: string
  location_id: string
  imageURL: string
  tag_ids: string[]
  is_paid: boolean
  is_online: boolean | null
  visibility: EventVisibility
  schedule_date?: Dayjs
  schedule_end_date?: Dayjs
  schedule_start_time?: Dayjs
  schedule_end_time?: Dayjs
  schedule_timezone?: string
}

export type EventCoreInitialValues = Partial<EventFormValues> & { active?: boolean }
