import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import tzPlugin from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { Schedule } from '@/shared/types/api'

dayjs.extend(utc)
dayjs.extend(tzPlugin)

export function scheduleEventStart(sched: Schedule | undefined): Dayjs | null {
  if (!sched?.start_date || !sched?.start_time || !sched?.timezone?.trim()) return null
  const dateYmd = dayjs(sched.start_date).format('YYYY-MM-DD')
  const tnorm = dayjs(sched.start_time, ['HH:mm', 'H:mm'], true)
  const tf = tnorm.isValid() ? tnorm.format('HH:mm') : String(sched.start_time).trim()
  const inst = dayjs.tz(`${dateYmd} ${tf}`, 'YYYY-MM-DD HH:mm', sched.timezone.trim())
  return inst.isValid() ? inst : null
}

export function scheduleEventEnd(sched: Schedule | undefined): Dayjs | null {
  if (!sched?.end_date || !sched?.end_time || !sched?.timezone?.trim()) return null
  const dateYmd = dayjs(sched.end_date).format('YYYY-MM-DD')
  const tnorm = dayjs(sched.end_time, ['HH:mm', 'H:mm'], true)
  const tf = tnorm.isValid() ? tnorm.format('HH:mm') : String(sched.end_time).trim()
  const inst = dayjs.tz(`${dateYmd} ${tf}`, 'YYYY-MM-DD HH:mm', sched.timezone.trim())
  return inst.isValid() ? inst : null
}
