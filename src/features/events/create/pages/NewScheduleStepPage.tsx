import { Button, Card, Flex, Form, message } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createWizardProductsPath,
  createWizardVenuePath,
} from '@/features/events/create/createWizardSteps'
import { useCreateSchedule, useEventSchedules, useUpdateSchedule } from '@/features/events/hooks'
import { EventScheduleFields } from '@/features/events/shared/components/EventScheduleFields'
import { useEventScheduleFormHydration } from '@/features/events/shared/hooks/useEventScheduleFormHydration'
import {
  assertScheduleEndNotBeforeStart,
  assertScheduleStartInFutureIfChanged,
  isScheduleDirty,
  snapshotScheduleForDirty,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'

export function NewScheduleStepPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const [form] = Form.useForm<EventFormValues>()
  const { data: schedules = [], isLoading: schedulesLoading } = useEventSchedules(eventId)
  const createScheduleMutation = useCreateSchedule()
  const updateScheduleMutation = useUpdateSchedule()
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

  async function handleNext() {
    if (!eventId) return
    try {
      const values = form.getFieldsValue(true) as EventFormValues
      const schedSnap = snapshotScheduleForDirty(values)
      const scheduleId = resolvePrimaryScheduleId()
      const dirty = isScheduleDirty(schedSnap, scheduleBaselineRef.current)

      if (dirty && schedSnap !== '') {
        await form.validateFields([
          'schedule_date',
          'schedule_end_date',
          'schedule_start_time',
          'schedule_end_time',
          'schedule_timezone',
        ])
        const d = values.schedule_date as Dayjs | undefined
        const dEnd = values.schedule_end_date as Dayjs | undefined
        const st = values.schedule_start_time as Dayjs | undefined
        const et = values.schedule_end_time as Dayjs | undefined
        const tz = values.schedule_timezone as string | undefined
        if (!d || !dEnd || !st || !et || !tz) return
        try {
          assertScheduleEndNotBeforeStart(d, st, dEnd, et, tz, t)
          assertScheduleStartInFutureIfChanged(d, st, tz, scheduleBaselineRef.current, t)
        } catch (e) {
          message.error(e instanceof Error ? e.message : t('events.schedule.startMustBeFuture'))
          return
        }
        const parsed = JSON.parse(schedSnap) as {
          start_date: string
          end_date: string
          start_time: string
          end_time: string
          timezone: string
        }
        const payload = {
          start_date: parsed.start_date,
          end_date: parsed.end_date,
          start_time: parsed.start_time,
          end_time: parsed.end_time,
          timezone: parsed.timezone,
        }
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
      }
      navigate(createWizardProductsPath(eventId))
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(t('events.form.submitError'))
    }
  }

  function handleSkip() {
    if (!eventId) return
    navigate(createWizardProductsPath(eventId))
  }

  const saving = createScheduleMutation.isPending || updateScheduleMutation.isPending

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <Form form={form} layout="vertical" preserve>
        <EventScheduleFields
          form={form}
          schedulesLoading={schedulesLoading}
          schedulesCount={schedules.length}
          scheduleFieldPlaceholders={scheduleFieldPlaceholders}
          scheduleBaseline={scheduleBaselineRef.current}
        />
        <Form.Item style={{ marginBottom: 0 }}>
          <Flex justify="flex-end" gap={8} wrap="wrap" style={{ width: '100%' }}>
            <Button htmlType="button" onClick={() => eventId && navigate(createWizardVenuePath(eventId))}>
              {t('events.create.back')}
            </Button>
            <Button htmlType="button" onClick={handleSkip}>
              {t('events.create.skip')}
            </Button>
            <Button type="primary" loading={saving} onClick={() => void handleNext()}>
              {t('events.create.next')}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Card>
  )
}
