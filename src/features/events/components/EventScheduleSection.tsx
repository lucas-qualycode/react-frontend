import { Button, DatePicker, Form, Select, Spin, TimePicker, Typography, message } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Schedule } from '@/shared/types/api'
import { useCreateSchedule, useEventSchedules, useUpdateSchedule } from '../hooks'

const { RangePicker } = DatePicker

type ScheduleFormValues = {
  dateRange: [Dayjs, Dayjs]
  start_time: Dayjs
  end_time: Dayjs
  timezone: string
}

function listTimeZones(): string[] {
  try {
    const iv = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    if (typeof iv.supportedValuesOf === 'function') {
      return iv.supportedValuesOf('timeZone').slice()
    }
  } catch {
    /* ignore */
  }
  return ['UTC', 'America/New_York', 'America/Sao_Paulo', 'Europe/London']
}

export function EventScheduleSection({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const [form] = Form.useForm<ScheduleFormValues>()
  const { data: schedules = [], isLoading } = useEventSchedules(eventId)
  const primary: Schedule | undefined = schedules[0]
  const createMutation = useCreateSchedule()
  const updateMutation = useUpdateSchedule()

  const timeZones = useMemo(() => listTimeZones(), [])
  const tzOptions = useMemo(
    () => timeZones.map((z) => ({ value: z, label: z })),
    [timeZones],
  )

  useEffect(() => {
    if (isLoading) return
    if (primary) {
      form.setFieldsValue({
        dateRange: [dayjs(primary.start_date), dayjs(primary.end_date)],
        start_time: dayjs(primary.start_time, 'HH:mm'),
        end_time: dayjs(primary.end_time, 'HH:mm'),
        timezone: primary.timezone,
      })
      return
    }
    let browserTz = 'UTC'
    try {
      browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      /* ignore */
    }
    form.setFieldsValue({
      dateRange: [dayjs(), dayjs()],
      start_time: dayjs('09:00', 'HH:mm'),
      end_time: dayjs('17:00', 'HH:mm'),
      timezone: browserTz,
    })
  }, [isLoading, primary?.id, form])

  async function onFinish(values: ScheduleFormValues) {
    const [start, end] = values.dateRange
    const start_date = start.format('YYYY-MM-DD')
    const end_date = end.format('YYYY-MM-DD')
    const start_time = values.start_time.format('HH:mm')
    const end_time = values.end_time.format('HH:mm')
    const timezone = values.timezone
    try {
      if (primary) {
        await updateMutation.mutateAsync({
          scheduleId: primary.id,
          eventId,
          payload: {
            start_date,
            end_date,
            start_time,
            end_time,
            timezone,
          },
        })
      } else {
        await createMutation.mutateAsync({
          event_id: eventId,
          start_date,
          end_date,
          start_time,
          end_time,
          timezone,
          status: 'active',
          exclusions: [],
        })
      }
      message.success(t('events.schedule.saveSuccess'))
    } catch (e) {
      const text = e instanceof Error ? e.message : t('events.schedule.saveError')
      message.error(text)
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return <Spin />
  }

  return (
    <div style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        {t('events.schedule.sectionTitle')}
      </Typography.Title>
      {schedules.length > 1 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t('events.schedule.multipleHint')}
        </Typography.Paragraph>
      ) : null}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="dateRange"
          label={t('events.schedule.dateRangeLabel')}
          rules={[{ required: true, message: t('events.schedule.dateRangeRequired') }]}
        >
          <RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item
          name="start_time"
          label={t('events.schedule.startTimeLabel')}
          rules={[{ required: true, message: t('events.schedule.timeRequired') }]}
        >
          <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={1} />
        </Form.Item>
        <Form.Item
          name="end_time"
          label={t('events.schedule.endTimeLabel')}
          rules={[{ required: true, message: t('events.schedule.timeRequired') }]}
        >
          <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={1} />
        </Form.Item>
        <Form.Item
          name="timezone"
          label={t('events.schedule.timezoneLabel')}
          rules={[{ required: true, message: t('events.schedule.timezoneRequired') }]}
        >
          <Select
            showSearch
            allowClear={false}
            optionFilterProp="label"
            options={tzOptions}
            style={{ width: '100%' }}
            placeholder={t('events.schedule.timezonePlaceholder')}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={pending}>
            {t('events.schedule.save')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
