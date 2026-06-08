import { App, Divider, Form, Typography } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EventScheduleFields } from '@/features/events/shared/components/EventScheduleFields'
import { useEventScheduleFormHydration } from '@/features/events/shared/hooks/useEventScheduleFormHydration'
import {
  assertScheduleEndNotBeforeStart,
  assertScheduleStartInFutureIfChanged,
  isScheduleDirty,
  snapshotScheduleForDirty,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import { useCreateSchedule, useEventSchedules, useUpdateSchedule } from '@/features/events/hooks'
import { useDebouncedAutoSave } from '@/features/events/edit/hooks/useDebouncedAutoSave'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

export function EditSchedulePage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { eventId } = useEventEditContext()
  const [form] = Form.useForm<EventFormValues>()
  const allFormValues = Form.useWatch([], form) as EventFormValues | undefined
  const autoSavingRef = useRef(false)
  const createScheduleMutation = useCreateSchedule()
  const updateScheduleMutation = useUpdateSchedule()
  const { data: schedules = [], isLoading: schedulesLoading } = useEventSchedules(eventId)
  const {
    scheduleBaselineRef,
    rememberCreatedSchedule,
    resolvePrimaryScheduleId,
  } = useEventScheduleFormHydration(eventId, form, schedules, schedulesLoading)

  const scheduleFieldPlaceholders = useMemo(() => {
    const dateExample = dayjs().format('YYYY-MM-DD')
    const startExample = '09:00'
    const endExample = '18:00'
    let tzExample = 'UTC'
    try {
      tzExample = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      /* ignore */
    }
    return {
      date: t('events.schedule.datePlaceholder', { example: dateExample }),
      endDate: t('events.schedule.endDatePlaceholder', { example: dateExample }),
      startTime: t('events.schedule.startTimePlaceholder', { example: startExample }),
      endTime: t('events.schedule.endTimePlaceholder', { example: endExample }),
      timezone: t('events.schedule.timezonePlaceholder', { example: tzExample }),
    }
  }, [t])

  const isDirty = useMemo(() => {
    const raw = form.getFieldsValue(true) as EventFormValues
    const schedSnap = snapshotScheduleForDirty(raw)
    return isScheduleDirty(schedSnap, scheduleBaselineRef.current)
  }, [allFormValues, form, scheduleBaselineRef])

  const persist = useCallback(async () => {
    if (autoSavingRef.current || schedulesLoading || !isDirty) return

    const values = form.getFieldsValue(true) as EventFormValues
    const schedSnap = snapshotScheduleForDirty(values)
    if (!isScheduleDirty(schedSnap, scheduleBaselineRef.current)) return

    const d = values.schedule_date
    const dEnd = values.schedule_end_date
    const st = values.schedule_start_time
    const et = values.schedule_end_time
    const tz = values.schedule_timezone
    if (
      !d ||
      !dEnd ||
      !st ||
      !et ||
      !tz ||
      !d.isValid() ||
      !dEnd.isValid() ||
      !st.isValid() ||
      !et.isValid()
    ) {
      return
    }
    try {
      assertScheduleEndNotBeforeStart(d, st, dEnd, et, tz, t)
    } catch {
      return
    }
    try {
      assertScheduleStartInFutureIfChanged(d, st, tz, scheduleBaselineRef.current, t)
    } catch {
      return
    }

    const start_date = d.format('YYYY-MM-DD')
    const end_date = dEnd.format('YYYY-MM-DD')
    const start_time = st.format('HH:mm')
    const end_time = et.format('HH:mm')
    const payload = {
      start_date,
      end_date,
      start_time,
      end_time,
      timezone: tz,
    }

    autoSavingRef.current = true
    try {
      const scheduleId = resolvePrimaryScheduleId()
      if (scheduleId) {
        await updateScheduleMutation.mutateAsync({
          scheduleId,
          eventId,
          payload,
        })
      } else {
        const created = await createScheduleMutation.mutateAsync({
          eventId,
          payload: {
            ...payload,
            status: 'active',
            exclusions: [],
          },
        })
        rememberCreatedSchedule(created)
      }
      scheduleBaselineRef.current = schedSnap
      message.success(t('events.edit.saveSuccess'))
    } catch (e) {
      const text = e instanceof Error ? e.message : t('events.form.submitError')
      message.error(text)
    } finally {
      autoSavingRef.current = false
    }
  }, [
    createScheduleMutation,
    eventId,
    form,
    isDirty,
    message,
    rememberCreatedSchedule,
    resolvePrimaryScheduleId,
    schedulesLoading,
    scheduleBaselineRef,
    t,
    updateScheduleMutation,
  ])

  useDebouncedAutoSave(persist, isDirty, allFormValues, { enabled: !schedulesLoading })

  return (
    <EditTabShell showSave={false}>
      <Form form={form} layout="vertical" preserve>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
          {t('events.schedule.sectionTitle')}
        </Typography.Title>
        <Divider style={{ margin: '0 0 16px' }} />
        <EventScheduleFields
          form={form}
          schedulesLoading={schedulesLoading}
          schedulesCount={schedules.length}
          scheduleFieldPlaceholders={scheduleFieldPlaceholders}
          scheduleBaseline={scheduleBaselineRef.current}
        />
      </Form>
    </EditTabShell>
  )
}
