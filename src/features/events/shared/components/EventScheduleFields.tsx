import { useMemo } from 'react'
import { DatePicker, Form, Select, Spin, TimePicker, Typography } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import {
  assertScheduleEndNotBeforeStart,
  assertScheduleStartInFutureIfChanged,
  FIELD_ITEM_STYLE,
  listTimeZones,
} from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'

export type ScheduleFieldPlaceholders = {
  date: string
  endDate: string
  startTime: string
  endTime: string
  timezone: string
}

type EventScheduleFieldsProps = {
  form: FormInstance<EventFormValues>
  schedulesLoading: boolean
  schedulesCount: number
  scheduleFieldPlaceholders: ScheduleFieldPlaceholders
  scheduleBaseline: string
}

export function EventScheduleFields({
  form,
  schedulesLoading,
  schedulesCount,
  scheduleFieldPlaceholders,
  scheduleBaseline,
}: EventScheduleFieldsProps) {
  const { t } = useTranslation()

  const tzOptions = useMemo(
    () => listTimeZones().map((z) => ({ value: z, label: z })),
    [],
  )

  if (schedulesLoading) {
    return <Spin />
  }

  return (
    <>
      {schedulesCount > 1 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t('events.schedule.multipleHint')}
        </Typography.Paragraph>
      ) : null}
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="schedule_date"
        label={t('events.form.scheduleStartDateLabel')}
      >
        <DatePicker
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
          placeholder={scheduleFieldPlaceholders.date}
          disabledDate={(current) => {
            if (!current?.isValid()) return false
            return current.isBefore(dayjs().startOf('day'))
          }}
          onChange={(v) => {
            if (v?.isValid()) {
              const end = form.getFieldValue('schedule_end_date') as Dayjs | undefined
              if (!end?.isValid()) {
                form.setFieldsValue({ schedule_end_date: v })
              }
            }
          }}
        />
      </Form.Item>
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="schedule_end_date"
        label={t('events.form.scheduleEndDateLabel')}
        dependencies={['schedule_date', 'schedule_start_time', 'schedule_end_time', 'schedule_timezone']}
        rules={[
          {
            validator: async (_: unknown, value: Dayjs | undefined) => {
              if (!value?.isValid()) return
              const d = form.getFieldValue('schedule_date') as Dayjs | undefined
              const st = form.getFieldValue('schedule_start_time') as Dayjs | undefined
              const et = form.getFieldValue('schedule_end_time') as Dayjs | undefined
              const tz = form.getFieldValue('schedule_timezone') as string | undefined
              assertScheduleEndNotBeforeStart(d, st, value, et, tz, t)
            },
          },
        ]}
      >
        <DatePicker
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
          placeholder={scheduleFieldPlaceholders.endDate}
          onChange={(v) => {
            if (v?.isValid()) {
              const start = form.getFieldValue('schedule_date') as Dayjs | undefined
              if (!start?.isValid()) {
                form.setFieldsValue({ schedule_date: v })
              }
            }
          }}
          disabledDate={(current) => {
            if (!current?.isValid()) return false
            const today = dayjs().startOf('day')
            if (current.isBefore(today)) return true
            const sd = form.getFieldValue('schedule_date') as Dayjs | undefined
            if (!sd?.isValid()) return false
            return current.isBefore(sd.startOf('day'))
          }}
        />
      </Form.Item>
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="schedule_start_time"
        label={t('events.schedule.startTimeLabel')}
        dependencies={['schedule_end_time', 'schedule_date', 'schedule_end_date', 'schedule_timezone']}
        rules={[
          {
            validator: async (_: unknown, value: Dayjs | undefined) => {
              const et = form.getFieldValue('schedule_end_time') as Dayjs | undefined
              const d = form.getFieldValue('schedule_date') as Dayjs | undefined
              const dEnd = form.getFieldValue('schedule_end_date') as Dayjs | undefined
              const tz = form.getFieldValue('schedule_timezone') as string | undefined
              if (!value?.isValid() || !et?.isValid()) return
              assertScheduleEndNotBeforeStart(d, value, dEnd, et, tz, t)
              assertScheduleStartInFutureIfChanged(d, value, tz, scheduleBaseline, t)
            },
          },
        ]}
      >
        <TimePicker
          needConfirm={false}
          format="HH:mm"
          style={{ width: '100%' }}
          minuteStep={1}
          placeholder={scheduleFieldPlaceholders.startTime}
        />
      </Form.Item>
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="schedule_end_time"
        label={t('events.schedule.endTimeLabel')}
        dependencies={['schedule_start_time', 'schedule_date', 'schedule_end_date', 'schedule_timezone']}
        rules={[
          {
            validator: async (_: unknown, value: Dayjs | undefined) => {
              const st = form.getFieldValue('schedule_start_time') as Dayjs | undefined
              const d = form.getFieldValue('schedule_date') as Dayjs | undefined
              const dEnd = form.getFieldValue('schedule_end_date') as Dayjs | undefined
              const tz = form.getFieldValue('schedule_timezone') as string | undefined
              if (!st?.isValid() || !value?.isValid()) return
              assertScheduleEndNotBeforeStart(d, st, dEnd, value, tz, t)
            },
          },
        ]}
      >
        <TimePicker
          needConfirm={false}
          format="HH:mm"
          style={{ width: '100%' }}
          minuteStep={1}
          placeholder={scheduleFieldPlaceholders.endTime}
        />
      </Form.Item>
      <Form.Item
        style={FIELD_ITEM_STYLE}
        name="schedule_timezone"
        label={t('events.schedule.timezoneLabel')}
      >
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          options={tzOptions}
          style={{ width: '100%' }}
          placeholder={scheduleFieldPlaceholders.timezone}
        />
      </Form.Item>
    </>
  )
}
