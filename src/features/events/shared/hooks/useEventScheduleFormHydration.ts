import type { FormInstance } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useRef } from 'react'
import { snapshotScheduleFromLoaded } from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import type { Schedule } from '@/shared/types/api'

export function useEventScheduleFormHydration(
  eventId: string | undefined,
  form: FormInstance<EventFormValues>,
  schedules: Schedule[],
  schedulesLoading: boolean,
) {
  const scheduleBaselineRef = useRef('')
  const scheduleHydratedKeyRef = useRef('')
  const primaryScheduleIdRef = useRef<string | undefined>(undefined)
  const primarySchedule = schedules[0]

  useEffect(() => {
    scheduleHydratedKeyRef.current = ''
    scheduleBaselineRef.current = ''
    primaryScheduleIdRef.current = undefined
    form.setFieldsValue({
      schedule_date: undefined,
      schedule_end_date: undefined,
      schedule_start_time: undefined,
      schedule_end_time: undefined,
      schedule_timezone: undefined,
    })
  }, [eventId, form])

  useEffect(() => {
    if (schedulesLoading || !eventId) return
    const key = `${eventId}:${primarySchedule?.id ?? 'new'}`
    if (scheduleHydratedKeyRef.current === key) return
    scheduleHydratedKeyRef.current = key
    scheduleBaselineRef.current = snapshotScheduleFromLoaded(primarySchedule)
    primaryScheduleIdRef.current = primarySchedule?.id
    if (primarySchedule) {
      form.setFieldsValue({
        schedule_date: dayjs(primarySchedule.start_date),
        schedule_end_date: dayjs(primarySchedule.end_date),
        schedule_start_time: dayjs(primarySchedule.start_time, 'HH:mm'),
        schedule_end_time: dayjs(primarySchedule.end_time, 'HH:mm'),
        schedule_timezone: primarySchedule.timezone,
      })
    } else {
      let browserTz = 'UTC'
      try {
        browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      } catch {
        /* ignore */
      }
      form.setFieldsValue({ schedule_timezone: browserTz })
    }
  }, [eventId, schedulesLoading, primarySchedule?.id, form, primarySchedule])

  function rememberCreatedSchedule(schedule: Schedule) {
    primaryScheduleIdRef.current = schedule.id
    scheduleHydratedKeyRef.current = `${eventId}:${schedule.id}`
  }

  function resolvePrimaryScheduleId(): string | undefined {
    return primarySchedule?.id ?? primaryScheduleIdRef.current
  }

  return {
    scheduleBaselineRef,
    primarySchedule,
    rememberCreatedSchedule,
    resolvePrimaryScheduleId,
  }
}
