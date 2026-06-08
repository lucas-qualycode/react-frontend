import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import tzPlugin from 'dayjs/plugin/timezone'
import type { Dayjs } from 'dayjs'
import type { Location, Schedule, Tag as EventTag } from '@/shared/types/api'
import type { CreateDraftEventPayload, PatchEventIdentityPayload, PatchEventVenuePayload } from '@/features/events/api'
import type { EventCoreInitialValues, EventFormValues } from './eventFormTypes'
import type { EventVisibility } from '@/shared/types/api'

export const DEFAULT_EVENT_VISIBILITY: EventVisibility = 'private'

dayjs.extend(utc)
dayjs.extend(tzPlugin)

export const URL_REGEX = /^https?:\/\/[^\s]+$/i
export const FIELD_ITEM_STYLE = { marginBottom: 10 } as const

export function snapshotEventFormValuesForDirty(v: EventFormValues): string {
  return JSON.stringify({
    name: (v.name ?? '').trim(),
    description: (v.description ?? '').trim(),
    location_id: (v.location_id ?? '').trim(),
    tag_ids: [...(v.tag_ids ?? [])].sort(),
    is_paid: Boolean(v.is_paid),
    is_online: v.is_online ?? null,
    visibility: v.visibility ?? 'public',
  })
}

export function snapshotFromInitialForDirty(iv: EventCoreInitialValues): string {
  return snapshotEventFormValuesForDirty({
    name: iv.name ?? '',
    description: iv.description ?? '',
    location_id: iv.location_id ?? '',
    imageURL: '',
    tag_ids: iv.tag_ids ?? [],
    is_paid: iv.is_paid ?? false,
    is_online: iv.is_online ?? null,
    visibility: iv.visibility ?? 'public',
  })
}

export function isPaidFromEventBaseline(snapshot: string): boolean {
  try {
    const o = JSON.parse(snapshot) as { is_paid?: boolean }
    return Boolean(o?.is_paid)
  } catch {
    return false
  }
}

export function snapshotScheduleForDirty(v: EventFormValues): string {
  const d = v.schedule_date
  const dEnd = v.schedule_end_date
  const st = v.schedule_start_time
  const et = v.schedule_end_time
  const tz = v.schedule_timezone?.trim() ?? ''
  if (!d || !dEnd || !st || !et || !tz) return ''
  if (!d.isValid() || !dEnd.isValid() || !st.isValid() || !et.isValid()) return ''
  return JSON.stringify({
    start_date: d.format('YYYY-MM-DD'),
    end_date: dEnd.format('YYYY-MM-DD'),
    start_time: st.format('HH:mm'),
    end_time: et.format('HH:mm'),
    timezone: tz,
  })
}

export function snapshotScheduleFromLoaded(primary: Schedule | undefined): string {
  if (!primary) return ''
  return JSON.stringify({
    start_date: primary.start_date,
    end_date: primary.end_date,
    start_time: primary.start_time,
    end_time: primary.end_time,
    timezone: primary.timezone,
  })
}

export function isScheduleDirty(schedSnap: string, baseline: string): boolean {
  if (baseline === '') {
    return schedSnap !== ''
  }
  return schedSnap !== baseline
}

function scheduleStartKeyFromParts(dateYmd: string, timeRaw: string, tz: string): string {
  const tnorm = dayjs(timeRaw, ['HH:mm', 'H:mm'], true)
  const tf = tnorm.isValid() ? tnorm.format('HH:mm') : timeRaw
  return `${dateYmd}|${tf}|${tz.trim()}`
}

function parseBaselineStartKey(baselineJson: string): string | null {
  if (!baselineJson) return null
  try {
    const o = JSON.parse(baselineJson) as {
      start_date?: string
      start_time?: string
      timezone?: string
    }
    const tz = o.timezone?.trim() ?? ''
    if (!o.start_date || !o.start_time || !tz) return null
    return scheduleStartKeyFromParts(o.start_date, o.start_time, tz)
  } catch {
    return null
  }
}

function scheduleStartKeyFromForm(d: Dayjs, st: Dayjs, tz: string): string | null {
  if (!d?.isValid() || !st?.isValid() || !tz?.trim()) return null
  return scheduleStartKeyFromParts(d.format('YYYY-MM-DD'), st.format('HH:mm'), tz.trim())
}

export function assertScheduleStartInFutureIfChanged(
  d: Dayjs | undefined,
  st: Dayjs | undefined,
  tz: string | undefined,
  baselineJson: string,
  t: (key: string) => string,
): void {
  if (!d?.isValid() || !st?.isValid() || !tz?.trim()) return
  const curKey = scheduleStartKeyFromForm(d, st, tz)
  if (!curKey) return
  const baseKey = parseBaselineStartKey(baselineJson)
  if (curKey === baseKey) return
  const inst = dayjs.tz(
    `${d.format('YYYY-MM-DD')} ${st.format('HH:mm')}`,
    'YYYY-MM-DD HH:mm',
    tz.trim(),
  )
  if (!inst.isValid()) return
  if (!inst.isAfter(dayjs())) {
    throw new Error(t('events.schedule.startMustBeFuture'))
  }
}

export function assertScheduleEndNotBeforeStart(
  startD: Dayjs | undefined,
  startT: Dayjs | undefined,
  endD: Dayjs | undefined,
  endT: Dayjs | undefined,
  tz: string | undefined,
  t: (key: string) => string,
): void {
  if (!startD?.isValid() || !startT?.isValid() || !endD?.isValid() || !endT?.isValid() || !tz?.trim()) return
  const s = dayjs.tz(
    `${startD.format('YYYY-MM-DD')} ${startT.format('HH:mm')}`,
    'YYYY-MM-DD HH:mm',
    tz.trim(),
  )
  const e = dayjs.tz(
    `${endD.format('YYYY-MM-DD')} ${endT.format('HH:mm')}`,
    'YYYY-MM-DD HH:mm',
    tz.trim(),
  )
  if (!s.isValid() || !e.isValid()) return
  const sameDay = startD.format('YYYY-MM-DD') === endD.format('YYYY-MM-DD')
  if (sameDay) {
    if (!e.isAfter(s)) {
      throw new Error(t('events.schedule.sameDayEndMustBeAfterStart'))
    }
  } else if (e.isBefore(s)) {
    throw new Error(t('events.schedule.endTimeBeforeStart'))
  }
}

export function listTimeZones(): string[] {
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

export function selectLabelForLocation(loc: Location): string {
  const name = loc.venue_name?.trim() || loc.id
  const addr = loc.formatted_address?.trim()
  return addr ? `${name} — ${addr}` : name
}

export function tagPathLabel(id: string, byId: Map<string, EventTag>): string {
  const parts: string[] = []
  let cur: EventTag | undefined = byId.get(id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    parts.unshift(cur.name)
    cur = cur.parent_tag_id ? byId.get(cur.parent_tag_id) : undefined
  }
  return parts.length > 0 ? parts.join(' / ') : id
}

function toOptionalString(s: string | undefined): string | undefined {
  const v = s?.trim() ?? ''
  return v.length > 0 ? v : undefined
}

export function isEventCoreDirty(
  core: EventCoreInitialValues,
  values: EventFormValues,
): boolean {
  return snapshotEventFormValuesForDirty(values) !== snapshotFromInitialForDirty(core)
}

export function mergeEventCoreFormValues(
  core: EventCoreInitialValues,
  patch: Partial<EventFormValues>,
): EventFormValues {
  return {
    name: patch.name ?? core.name ?? '',
    description: patch.description ?? core.description ?? '',
    location_id: patch.location_id ?? core.location_id ?? '',
    imageURL: patch.imageURL ?? core.imageURL ?? '',
    tag_ids: patch.tag_ids ?? core.tag_ids ?? [],
    is_paid: patch.is_paid ?? core.is_paid ?? false,
    is_online: patch.is_online !== undefined ? patch.is_online : (core.is_online ?? null),
    visibility: patch.visibility ?? core.visibility ?? DEFAULT_EVENT_VISIBILITY,
  }
}

export function normalizeDraftEventPayload(values: EventFormValues): CreateDraftEventPayload {
  return {
    name: values.name,
    description: toOptionalString(values.description),
    tag_ids: values.tag_ids,
    visibility: values.visibility ?? DEFAULT_EVENT_VISIBILITY,
  }
}

export function normalizeIdentityPatchPayload(values: EventFormValues): PatchEventIdentityPayload {
  return {
    name: values.name,
    description: toOptionalString(values.description),
    tag_ids: values.tag_ids,
    visibility: values.visibility ?? 'public',
  }
}

export function normalizeVenuePatchPayload(values: EventFormValues): PatchEventVenuePayload {
  return {
    is_online: Boolean(values.is_online),
    location_id: values.is_online ? null : values.location_id?.trim() || null,
  }
}

export function eventInitialValuesFromEvent(event: {
  name: string
  description?: string | null
  location_id?: string | null
  imageURL?: string | null
  tags?: { id: string }[] | null
  active?: boolean
  is_paid?: boolean
  is_online?: boolean | null
  visibility?: EventFormValues['visibility'] | null
}): EventCoreInitialValues {
  return {
    name: event.name,
    description: event.description ?? '',
    location_id: event.location_id ?? '',
    imageURL: event.imageURL ?? '',
    tag_ids: event.tags?.map((x) => x.id) ?? [],
    active: event.active,
    is_paid: event.is_paid,
    is_online: event.is_online ?? null,
    visibility: event.visibility ?? 'public',
  }
}
