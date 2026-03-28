import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  MenuOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Dropdown,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Steps,
  TimePicker,
  TreeSelect,
  Typography,
  message,
  theme,
} from 'antd'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '@/app/auth/AuthContext'
import { settingsStorage } from '@/features/settings/storage'
import { ImageEditModal } from '@/shared/components/ImageEditModal'
import type { TreeSelectProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  useCreateSchedule,
  useCreateTag,
  useEventSchedules,
  useEventTags,
  useLocations,
  useCreateLocation,
  useUpdateSchedule,
} from '../hooks'

import type { Location, Schedule, Tag as EventTag } from '@/shared/types/api'
import { updateEvent, type CreateEventPayload, type UpdateEventPayload } from '../api'

type EventFormValues = {
  name: string
  description: string
  location_id: string
  imageURL: string
  tag_ids: string[]
  is_paid: boolean
  is_online: boolean
  schedule_date?: Dayjs
  schedule_start_time?: Dayjs
  schedule_end_time?: Dayjs
  schedule_timezone?: string
}

type EventFormProps = {
  mode: 'create' | 'edit'
  eventId?: string
  initialValues: Partial<EventFormValues> & { active?: boolean }
  submitLoading: boolean
  onSubmit: (payload: CreateEventPayload | UpdateEventPayload) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

const URL_REGEX = /^https?:\/\/[^\s]+$/i

type EventFormSectionKey = 'identity' | 'venue' | 'tags' | 'schedules'

const SECTION_QUERY_PARAM = 'section'

const SLUG_TO_SECTION: Record<string, EventFormSectionKey> = {
  details: 'identity',
  tags: 'tags',
  venue: 'venue',
  schedule: 'schedules',
}

const SECTION_TO_SLUG: Record<EventFormSectionKey, string> = {
  identity: 'details',
  tags: 'tags',
  venue: 'venue',
  schedules: 'schedule',
}

const CREATE_SECTION_ORDER: EventFormSectionKey[] = ['identity', 'tags', 'venue', 'schedules']

function slugToSection(slug: string | null): EventFormSectionKey | null {
  if (!slug) return null
  return SLUG_TO_SECTION[slug] ?? null
}

function sectionFormPanelMounted(
  mode: 'create' | 'edit',
  activeSection: EventFormSectionKey,
  panel: EventFormSectionKey,
): boolean {
  if (mode === 'create') return true
  return activeSection === panel
}

function sectionFormPanelHidden(
  mode: 'create' | 'edit',
  activeSection: EventFormSectionKey,
  panel: EventFormSectionKey,
): boolean {
  return mode === 'create' && activeSection !== panel
}

function snapshotEventFormValuesForDirty(v: EventFormValues): string {
  return JSON.stringify({
    name: (v.name ?? '').trim(),
    description: (v.description ?? '').trim(),
    location_id: (v.location_id ?? '').trim(),
    tag_ids: [...(v.tag_ids ?? [])].sort(),
    is_paid: Boolean(v.is_paid),
    is_online: Boolean(v.is_online),
  })
}

function snapshotFromInitialForDirty(iv: Partial<EventFormValues> & { active?: boolean }): string {
  return snapshotEventFormValuesForDirty({
    name: iv.name ?? '',
    description: iv.description ?? '',
    location_id: iv.location_id ?? '',
    imageURL: '',
    tag_ids: iv.tag_ids ?? [],
    is_paid: iv.is_paid ?? false,
    is_online: iv.is_online ?? false,
  })
}

function snapshotScheduleForDirty(v: EventFormValues): string {
  const d = v.schedule_date
  const st = v.schedule_start_time
  const et = v.schedule_end_time
  const tz = v.schedule_timezone?.trim() ?? ''
  if (!d || !st || !et || !tz) return ''
  if (!d.isValid() || !st.isValid() || !et.isValid()) return ''
  const ymd = d.format('YYYY-MM-DD')
  return JSON.stringify({
    start_date: ymd,
    end_date: ymd,
    start_time: st.format('HH:mm'),
    end_time: et.format('HH:mm'),
    timezone: tz,
  })
}

function snapshotScheduleFromLoaded(primary: Schedule | undefined): string {
  if (!primary) return ''
  const day = primary.start_date
  return JSON.stringify({
    start_date: day,
    end_date: day,
    start_time: primary.start_time,
    end_time: primary.end_time,
    timezone: primary.timezone,
  })
}

function isScheduleDirty(schedSnap: string, baseline: string): boolean {
  if (baseline === '') {
    return schedSnap !== ''
  }
  return schedSnap !== baseline
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

function selectLabelForLocation(loc: Location): string {
  const name = loc.venue_name?.trim() || loc.id
  const addr = loc.formatted_address?.trim()
  return addr ? `${name} — ${addr}` : name
}

function tagPathLabel(id: string, byId: Map<string, EventTag>): string {
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

function normalizePayload(
  values: EventFormValues,
  mode: 'create' | 'edit',
  active: boolean
): CreateEventPayload | UpdateEventPayload {
  const location_id = values.is_online ? null : values.location_id?.trim() || null
  const common = {
    tag_ids: values.tag_ids,
    active,
    is_paid: values.is_paid,
    is_online: values.is_online,
    location_id,
  }

  const base = {
    name: values.name,
    description: toOptionalString(values.description),
    imageURL: toOptionalString(values.imageURL),
    ...common,
  }

  if (mode === 'create') {
    const { imageURL: _omitImage, ...rest } = base
    return rest as CreateEventPayload
  }

  const update: UpdateEventPayload = {
    name: base.name,
    description: base.description,
    tag_ids: base.tag_ids,
    active: base.active,
    is_paid: base.is_paid,
    is_online: base.is_online,
  }
  if (!values.is_online) {
    const trimmed = values.location_id?.trim()
    if (trimmed) {
      update.location_id = trimmed
    }
  }
  return update
}

export function EventForm({
  mode,
  eventId,
  initialValues,
  submitLoading,
  onSubmit,
  onDirtyChange,
}: EventFormProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { token } = theme.useToken()
  const [form] = Form.useForm<EventFormValues>()
  const allFormValues = Form.useWatch([], form) as EventFormValues | undefined
  const editBaselineRef = useRef<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [imageEditOpen, setImageEditOpen] = useState(false)
  const [editImageHover, setEditImageHover] = useState(false)
  const watchedImageUrl = Form.useWatch('imageURL', form) as string | undefined
  const { data: tags, isLoading: tagsLoading, refetch: refetchTags } = useEventTags()
  const createTagMutation = useCreateTag()
  const { data: locations = [], isLoading: locationsLoading, refetch: refetchLocations } = useLocations()
  const createLocationMutation = useCreateLocation()
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [venueModalOpen, setVenueModalOpen] = useState(false)
  const [tagForm] = Form.useForm<{ name: string; description?: string; parent_tag_id?: string }>()
  const [venueForm] = Form.useForm<{ venue_name: string; formatted_address?: string; maps_url?: string }>()
  const scheduleBaselineRef = useRef('')
  const scheduleHydratedKeyRef = useRef('')
  const createScheduleMutation = useCreateSchedule()
  const updateScheduleMutation = useUpdateSchedule()
  const { data: schedules = [], isLoading: schedulesLoading } = useEventSchedules(
    mode === 'edit' ? eventId : undefined,
  )
  const primarySchedule: Schedule | undefined = schedules[0]
  const tzOptions = useMemo(
    () => listTimeZones().map((z) => ({ value: z, label: z })),
    [],
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const [createSection, setCreateSection] = useState<EventFormSectionKey>('identity')
  const activeSection: EventFormSectionKey =
    mode === 'create'
      ? createSection
      : slugToSection(searchParams.get(SECTION_QUERY_PARAM)) ?? 'identity'
  const isOnlineWatched = Form.useWatch('is_online', form) as boolean | undefined
  const screens = Grid.useBreakpoint()
  const compactSectionNav = screens.md === false

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
      startTime: t('events.schedule.startTimePlaceholder', { example: startExample }),
      endTime: t('events.schedule.endTimePlaceholder', { example: endExample }),
      timezone: t('events.schedule.timezonePlaceholder', { example: tzExample }),
    }
  }, [t])

  const fieldItemStyle = { marginBottom: 10 } as const

  useEffect(() => {
    if (mode !== 'edit') return
    const slug = searchParams.get(SECTION_QUERY_PARAM)
    if (slugToSection(slug) !== null) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(SECTION_QUERY_PARAM, SECTION_TO_SLUG.identity)
        return next
      },
      { replace: true },
    )
  }, [mode, searchParams, setSearchParams])

  useEffect(() => {
    if (mode !== 'create') return
    if (!searchParams.has(SECTION_QUERY_PARAM)) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(SECTION_QUERY_PARAM)
        return next
      },
      { replace: true },
    )
  }, [mode, searchParams, setSearchParams])

  const sectionKeyByField: Record<string, EventFormSectionKey> = {
    name: 'identity',
    description: 'identity',
    imageURL: 'identity',
    location_id: 'venue',
    tag_ids: 'tags',
    is_paid: 'tags',
    is_online: 'tags',
    schedule_date: 'schedules',
    schedule_start_time: 'schedules',
    schedule_end_time: 'schedules',
    schedule_timezone: 'schedules',
  }

  useEffect(() => {
    if (mode !== 'create') return
    form.setFieldsValue({
      name: initialValues.name ?? '',
      description: initialValues.description ?? '',
      location_id: initialValues.location_id ?? '',
      imageURL: initialValues.imageURL ?? '',
      tag_ids: initialValues.tag_ids ?? [],
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
    })
  }, [form, mode, initialValues])

  useEffect(() => {
    if (mode !== 'edit' || !eventId) return
    form.setFieldsValue({
      name: initialValues.name ?? '',
      description: initialValues.description ?? '',
      location_id: initialValues.location_id ?? '',
      imageURL: initialValues.imageURL ?? '',
      tag_ids: initialValues.tag_ids ?? [],
      is_paid: initialValues.is_paid ?? false,
      is_online: initialValues.is_online ?? false,
    })
  }, [form, mode, eventId])

  useEffect(() => {
    if (isOnlineWatched) {
      form.setFieldsValue({ location_id: '' })
    }
  }, [isOnlineWatched, form])

  useEffect(() => {
    if (!tagModalOpen) {
      tagForm.resetFields()
    }
  }, [tagModalOpen, tagForm])

  useEffect(() => {
    if (!venueModalOpen) {
      venueForm.resetFields()
    }
  }, [venueModalOpen, venueForm])

  useEffect(() => {
    if (mode !== 'edit') return
    editBaselineRef.current = snapshotFromInitialForDirty(initialValues)
  }, [mode, eventId, initialValues])

  useEffect(() => {
    scheduleHydratedKeyRef.current = ''
    scheduleBaselineRef.current = ''
    if (mode === 'edit') {
      form.setFieldsValue({
        schedule_date: undefined,
        schedule_start_time: undefined,
        schedule_end_time: undefined,
        schedule_timezone: undefined,
      })
    }
  }, [eventId, mode, form])

  useEffect(() => {
    if (mode !== 'edit' || !eventId || schedulesLoading) return
    const key = `${eventId}:${primarySchedule?.id ?? 'new'}`
    if (scheduleHydratedKeyRef.current === key) return
    scheduleHydratedKeyRef.current = key
    scheduleBaselineRef.current = snapshotScheduleFromLoaded(primarySchedule)
    if (primarySchedule) {
      form.setFieldsValue({
        schedule_date: dayjs(primarySchedule.start_date),
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
  }, [mode, eventId, schedulesLoading, primarySchedule?.id, form])

  useEffect(() => {
    if (mode !== 'edit') {
      setIsDirty(false)
      onDirtyChange?.(false)
      return
    }
    if (!onDirtyChange) return
    const raw = form.getFieldsValue(true) as EventFormValues
    const eventDirty = snapshotEventFormValuesForDirty(raw) !== editBaselineRef.current
    const schedSnap = snapshotScheduleForDirty(raw)
    const scheduleDirty = isScheduleDirty(schedSnap, scheduleBaselineRef.current)
    const next = eventDirty || scheduleDirty
    setIsDirty(next)
    onDirtyChange(next)
  }, [mode, onDirtyChange, allFormValues, eventId, initialValues, form, schedulesLoading])

  const tagTreeData: TreeSelectProps['treeData'] = useMemo(() => {
    if (!tags?.length) return []
    const byParent = new Map<string | null, EventTag[]>()
    for (const t of tags) {
      const pid = t.parent_tag_id ?? null
      const arr = byParent.get(pid) ?? []
      arr.push(t)
      byParent.set(pid, arr)
    }
    function toNodes(parentId: string | null): NonNullable<TreeSelectProps['treeData']> {
      return (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => {
          const children = toNodes(t.id)
          return {
            title: t.name,
            value: t.id,
            key: t.id,
            ...(children.length > 0 ? { children } : {}),
          }
        })
    }
    return toNodes(null)
  }, [tags])

  const tagById = useMemo(() => new Map((tags ?? []).map((tg) => [tg.id, tg])), [tags])

  const filterTagTreeNode: TreeSelectProps['filterTreeNode'] = (input, node) =>
    String(node?.title ?? '')
      .toLowerCase()
      .includes(input.trim().toLowerCase())

  const tagIdsFormValueProps = (ids: unknown) => {
    const list = Array.isArray(ids)
      ? ids.filter((x): x is string => typeof x === 'string')
      : []
    return {
      value: list.map((id) => ({
        value: id,
        label: tagPathLabel(id, tagById),
      })),
    }
  }

  const tagIdsFromTreeSelectEvent = (v: unknown) => {
    if (!Array.isArray(v)) return []
    return v.map((item) =>
      item !== null && typeof item === 'object' && 'value' in item && typeof (item as { value: unknown }).value === 'string'
        ? (item as { value: string }).value
        : String(item)
    )
  }

  async function handleCreateVenue(values: { venue_name: string; formatted_address?: string; maps_url?: string }) {
    try {
      const created = await createLocationMutation.mutateAsync({
        venue_name: values.venue_name,
        formatted_address: values.formatted_address?.trim() ? values.formatted_address : undefined,
        maps_url: values.maps_url?.trim() ? values.maps_url : undefined,
      })
      form.setFieldsValue({ location_id: created.id })
      setVenueModalOpen(false)
      message.success(t('events.form.venueCreateSuccess'))
      await refetchLocations()
    } catch {
      message.error(t('events.form.venueCreateError'))
    }
  }

  async function handleCreateTag(values: {
    name: string
    description?: string
    parent_tag_id?: string
  }) {
    try {
      const parentId = values.parent_tag_id?.trim()
      const created = await createTagMutation.mutateAsync({
        name: values.name,
        description: values.description?.trim() ? values.description : undefined,
        active: true,
        applies_to: ['EVENT'],
        ...(parentId ? { parent_tag_id: parentId } : {}),
      })
      const currentTagIds = form.getFieldValue('tag_ids') ?? []
      const nextTagIds = Array.from(new Set([...currentTagIds, created.id]))
      form.setFieldsValue({ tag_ids: nextTagIds })
      setTagModalOpen(false)
      message.success(t('events.tags.createSuccess'))
      await refetchTags()
    } catch {
      message.error(t('events.tags.createError'))
    }
  }

  async function onFinish(values: EventFormValues) {
    const active = mode === 'create' ? true : (initialValues.active ?? true)
    if (mode === 'create') {
      const payload = normalizePayload(values, mode, active)
      await onSubmit(payload)
      return
    }
    if (!eventId) return

    const eventPayload = normalizePayload(values, mode, active)
    const eventDirty = snapshotEventFormValuesForDirty(values) !== editBaselineRef.current
    const schedSnap = snapshotScheduleForDirty(values)
    const scheduleDirty = isScheduleDirty(schedSnap, scheduleBaselineRef.current)

    if (!eventDirty && !scheduleDirty) {
      return
    }

    try {
      if (scheduleDirty) {
        const d = values.schedule_date
        const st = values.schedule_start_time
        const et = values.schedule_end_time
        const tz = values.schedule_timezone
        if (!d || !st || !et || !tz || !d.isValid() || !st.isValid() || !et.isValid()) {
          message.error(t('events.schedule.saveError'))
          goToFormSection('schedules')
          return
        }
        const startMin = st.hour() * 60 + st.minute()
        const endMin = et.hour() * 60 + et.minute()
        if (endMin < startMin) {
          message.error(t('events.schedule.endTimeBeforeStart'))
          goToFormSection('schedules')
          return
        }
        const start_date = d.format('YYYY-MM-DD')
        const end_date = start_date
        const start_time = st.format('HH:mm')
        const end_time = et.format('HH:mm')
        if (primarySchedule) {
          await updateScheduleMutation.mutateAsync({
            scheduleId: primarySchedule.id,
            eventId,
            payload: {
              start_date,
              end_date,
              start_time,
              end_time,
              timezone: tz,
            },
          })
        } else {
          await createScheduleMutation.mutateAsync({
            event_id: eventId,
            start_date,
            end_date,
            start_time,
            end_time,
            timezone: tz,
            status: 'active',
            exclusions: [],
          })
        }
        scheduleBaselineRef.current = schedSnap
      }
      if (eventDirty) {
        await onSubmit(eventPayload)
      } else if (scheduleDirty) {
        message.success(t('events.edit.saveSuccess'))
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : t('events.form.submitError')
      message.error(text)
    }
  }

  async function performEventImageUpload(file: File) {
    if (!user) return
    if (!eventId) return
    const path = `event-images/${user.uid}/${eventId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    try {
      const storageRef = ref(settingsStorage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      const updated = await updateEvent(eventId, { imageURL: url })
      queryClient.setQueryData(['event', eventId], updated)
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      form.setFieldsValue({ imageURL: updated.imageURL ?? '' })
      message.success(t('events.form.imageUpdated'))
    } catch (err) {
      let text = t('events.form.imageUploadError')
      if (err instanceof Error) {
        text = err.message
      }
      message.error(text)
      throw err instanceof Error ? err : new Error(text)
    }
  }

  async function handleRemoveEventImage() {
    if (!eventId) return
    try {
      const updated = await updateEvent(eventId, { imageURL: null })
      queryClient.setQueryData(['event', eventId], updated)
      queryClient.invalidateQueries({ queryKey: ['userEvents'] })
      form.setFieldsValue({ imageURL: updated.imageURL ?? '' })
      message.success(t('events.form.imageRemoved'))
    } catch (err) {
      let text = t('events.form.imageUploadError')
      if (err instanceof Error) {
        text = err.message
      }
      message.error(text)
    }
  }

  const urlRule = useMemo(
    () => ({
      validator: async (_: unknown, value: string) => {
        const v = value?.trim() ?? ''
        if (!v) return
        if (!URL_REGEX.test(v)) throw new Error(t('events.form.urlInvalid'))
      },
    }),
    [t]
  )

  const { active: _omitActiveFromForm, ...formInitialRest } = initialValues

  const coverPreviewSrc = watchedImageUrl?.trim() ? watchedImageUrl.trim() : ''

  const eventFormMenuItems = useMemo(
    () => [
      {
        key: 'identity' as const,
        icon: <FileTextOutlined />,
        label: t('events.form.menuIdentity'),
      },
      {
        key: 'tags' as const,
        icon: <TagsOutlined />,
        label: t('events.form.menuTagsVisibility'),
      },
      {
        key: 'venue' as const,
        icon: <EnvironmentOutlined />,
        label: t('events.form.menuVenue'),
      },
      {
        key: 'schedules' as const,
        icon: <CalendarOutlined />,
        label: t('events.form.menuSchedules'),
      },
    ],
    [t]
  )

  const sectionStepIndex = Math.max(0, CREATE_SECTION_ORDER.indexOf(activeSection))

  const wideSectionStepItems = useMemo(
    () =>
      CREATE_SECTION_ORDER.map((sectionKey) => {
        const m = eventFormMenuItems.find((x) => x.key === sectionKey)
        return {
          title: m?.label ?? sectionKey,
          icon: m?.icon,
        }
      }),
    [eventFormMenuItems],
  )

  const compactSectionStepItems = useMemo(
    () =>
      CREATE_SECTION_ORDER.map((sectionKey, index) => {
        const m = eventFormMenuItems.find((x) => x.key === sectionKey)
        const label = m?.label ?? sectionKey
        const isFirst = index === 0
        const isLast = index === CREATE_SECTION_ORDER.length - 1
        return {
          title: null,
          icon: (
            <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-label={label}>
              {m?.icon}
            </span>
          ),
          style: {
            flex: '1 1 0%',
            minWidth: 0,
            maxWidth: '100%',
            display: 'flex',
            justifyContent: 'center',
            paddingInlineStart: isFirst ? 0 : 6,
            paddingInlineEnd: isLast ? 0 : 6,
          },
          styles: {
            wrapper: {
              flex: 1,
              minWidth: 0,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 0,
            },
            section: { flex: '0 0 auto', minWidth: 0, maxWidth: 'max-content' },
            header: { gap: 0, justifyContent: 'center' },
            rail: { marginInlineStart: 6 },
          },
        }
      }),
    [eventFormMenuItems],
  )

  function goToFormSection(sectionKey: EventFormSectionKey) {
    if (mode === 'create') {
      setCreateSection(sectionKey)
      return
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(SECTION_QUERY_PARAM, SECTION_TO_SLUG[sectionKey])
        return next
      },
      { replace: true },
    )
  }

  const onSectionMenuSelect = (key: string) => {
    if (key !== 'identity' && key !== 'venue' && key !== 'tags' && key !== 'schedules') return
    goToFormSection(key as EventFormSectionKey)
  }

  function goToPrevCreateSection() {
    if (mode !== 'create') return
    const idx = CREATE_SECTION_ORDER.indexOf(activeSection)
    if (idx <= 0) return
    setCreateSection(CREATE_SECTION_ORDER[idx - 1])
  }

  async function goToNextCreateSection() {
    if (mode !== 'create') return
    const idx = CREATE_SECTION_ORDER.indexOf(activeSection)
    if (idx < 0 || idx >= CREATE_SECTION_ORDER.length - 1) return
    try {
      if (activeSection === 'identity') {
        await form.validateFields(['name', 'description'])
      } else if (activeSection === 'tags') {
        await form.validateFields(['tag_ids', 'is_paid', 'is_online'])
      } else if (activeSection === 'venue') {
        await form.validateFields(['location_id'])
      }
      const ae = document.activeElement
      if (ae instanceof HTMLElement) {
        ae.blur()
      }
      setCreateSection(CREATE_SECTION_ORDER[idx + 1])
    } catch {
      /* field errors */
    }
  }

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        preserve
        onFinish={onFinish}
        onFinishFailed={(errorInfo) => {
          const raw = errorInfo?.errorFields?.[0]?.name
          const first =
            Array.isArray(raw) && raw.length > 0
              ? raw[0]
              : typeof raw === 'string'
                ? raw
                : null
          if (typeof first === 'string' && sectionKeyByField[first]) {
            goToFormSection(sectionKeyByField[first])
          }
        }}
        initialValues={{
          is_paid: false,
          is_online: false,
          ...formInitialRest,
        }}
      >
        <Flex vertical gap={compactSectionNav ? 12 : 0} style={{ width: '100%' }}>
          {compactSectionNav ? (
            <Flex align="center" gap={16} style={{ width: '100%' }}>
              <div style={{ flex: 1, minWidth: 0, overflowX: 'visible', paddingBottom: 4 }}>
                <Steps
                  className="event-form-compact-steps"
                  style={{ width: '100%' }}
                  size="small"
                  type="navigation"
                  orientation="horizontal"
                  responsive={false}
                  current={sectionStepIndex}
                  items={compactSectionStepItems}
                  onChange={(step) => goToFormSection(CREATE_SECTION_ORDER[step])}
                />
              </div>
              <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                <Dropdown
                  menu={{
                    items: eventFormMenuItems.map(({ key, icon, label }) => ({ key, icon, label })),
                    selectedKeys: [activeSection],
                    onClick: ({ key }) => onSectionMenuSelect(key),
                  }}
                  trigger={['hover', 'click']}
                  placement="bottomRight"
                >
                  <Button type="text" icon={<MenuOutlined />} aria-label={t('events.form.sectionNavAria')} />
                </Dropdown>
              </span>
            </Flex>
          ) : null}

          <Flex gap={32} align="flex-start" style={{ width: '100%' }}>
            <Card style={{ flex: 1, minWidth: 0 }}>
              <Form.Item name="imageURL" hidden rules={[urlRule]}>
                <Input />
              </Form.Item>

              {sectionFormPanelMounted(mode, activeSection, 'identity') ? (
            <div
              className="event-form-section-panel"
              hidden={sectionFormPanelHidden(mode, activeSection, 'identity')}
              style={{ width: '100%' }}
            >
              <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                {t('events.form.sectionIdentity')}
              </Typography.Title>
              <Divider style={{ margin: '0 0 16px' }} />
              <Form.Item
                style={fieldItemStyle}
                name="name"
                label={t('events.form.nameLabel')}
                rules={[
                  { required: true, message: t('events.form.nameRequired') },
                  { max: 256, message: t('events.form.nameTooLong') },
                ]}
              >
                <Input placeholder={t('events.form.namePlaceholder')} />
              </Form.Item>

              <Form.Item style={fieldItemStyle} name="description" label={t('events.form.descriptionLabel')}>
                <Input.TextArea rows={4} placeholder={t('events.form.descriptionPlaceholder')} />
              </Form.Item>

              {mode === 'edit' ? (
                <div style={{ width: '100%' }}>
                  <Typography.Title level={5} style={{ marginTop: 16, marginBottom: coverPreviewSrc ? 12 : 4 }}>
                    {t('events.form.coverImageTitle')}
                  </Typography.Title>
                  {coverPreviewSrc ? (
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '2 / 1',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid var(--ant-color-border)',
                        background: 'var(--ant-color-bg-elevated)',
                      }}
                    >
                      <img
                        src={coverPreviewSrc}
                        alt={t('events.form.eventImageAlt')}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  ) : null}
                  {!coverPreviewSrc ? (
                    <Button
                      type="link"
                      onClick={() => setImageEditOpen(true)}
                      onMouseEnter={() => setEditImageHover(true)}
                      onMouseLeave={() => setEditImageHover(false)}
                      style={{
                        padding: 0,
                        height: 'auto',
                        display: 'block',
                        marginTop: 0,
                        marginBottom: 8,
                        textAlign: 'left',
                        fontWeight: 700,
                        whiteSpace: 'normal',
                        color: editImageHover ? token.colorPrimary : token.colorTextSecondary,
                      }}
                    >
                      {t('events.form.coverImageEmptyHint')}
                    </Button>
                  ) : null}
                  {coverPreviewSrc ? (
                    <Button
                      type="text"
                      onClick={() => setImageEditOpen(true)}
                      onMouseEnter={() => setEditImageHover(true)}
                      onMouseLeave={() => setEditImageHover(false)}
                      style={{
                        padding: 0,
                        height: 'auto',
                        marginTop: 8,
                        color: editImageHover ? token.colorPrimary : token.colorTextSecondary,
                      }}
                    >
                      {t('events.form.imageEdit')}
                    </Button>
                  ) : null}
                  <ImageEditModal
                    open={imageEditOpen}
                    onClose={() => setImageEditOpen(false)}
                    imageUrl={coverPreviewSrc || undefined}
                    imageAlt={t('events.form.eventImageAlt')}
                    variant="roundedRect"
                    previewFallback={
                      <Typography.Text type="secondary">{t('events.detail.noImage')}</Typography.Text>
                    }
                    labels={{
                      modalTitle: t('events.form.imageModalTitle'),
                      changePhoto: t('events.form.changeImage'),
                      uploadPhoto: t('events.form.uploadImage'),
                      removePhoto: t('events.form.removeImage'),
                      notImageFile: t('events.form.imageNotImageFile'),
                      removeModalTitle: t('events.form.removeImageModalTitle'),
                      removeModalBody: t('events.form.removeImageModalBody'),
                      removeModalOk: t('events.form.removeImageOk'),
                      cancel: t('events.tags.cancel'),
                    }}
                    performUpload={performEventImageUpload}
                    onRemove={handleRemoveEventImage}
                  />
                </div>
              ) : (
                <Typography.Text type="secondary" style={{ display: 'block' }}>
                  {t('events.form.coverAfterCreateHint')}
                </Typography.Text>
              )}
            </div>
              ) : null}

              {sectionFormPanelMounted(mode, activeSection, 'tags') ? (
            <div
              className="event-form-section-panel"
              hidden={sectionFormPanelHidden(mode, activeSection, 'tags')}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                    {t('events.form.sectionTags')}
                  </Typography.Title>
                  <Divider style={{ margin: '0 0 16px' }} />
                  <Form.Item style={fieldItemStyle}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Typography.Text type="secondary" style={{ display: 'block' }}>
                        {t('events.tags.helpText')}
                      </Typography.Text>
                    <Form.Item
                      name="tag_ids"
                      noStyle
                      getValueProps={tagIdsFormValueProps}
                      getValueFromEvent={tagIdsFromTreeSelectEvent}
                      rules={[
                        {
                          validator: async (_: unknown, value: string[] | undefined) => {
                            if (value && value.length > 0) return
                            throw new Error(t('events.form.tagIdsRequired'))
                          },
                        },
                      ]}
                    >
                      <TreeSelect
                        style={{ width: '100%' }}
                        treeData={tagTreeData}
                        treeCheckable
                        treeCheckStrictly
                        showCheckedStrategy={TreeSelect.SHOW_ALL}
                        allowClear
                        showSearch
                        treeDefaultExpandAll
                        loading={tagsLoading}
                        placeholder={t('events.tags.pickerPlaceholder')}
                        filterTreeNode={filterTagTreeNode}
                        onOpenChange={(open) => {
                          if (open) void refetchTags()
                        }}
                      />
                    </Form.Item>
                    <Button type="default" onClick={() => setTagModalOpen(true)} disabled={createTagMutation.isPending}>
                      {t('events.tags.createButton')}
                    </Button>
                  </Space>
                </Form.Item>
                </div>

                <div style={{ width: '100%' }}>
                  <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                    {t('events.form.sectionVisibility')}
                  </Typography.Title>
                  <Divider style={{ margin: '0 0 16px' }} />
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Form.Item style={fieldItemStyle} name="is_paid" label={t('events.form.paidLabel')}>
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: t('events.form.yes'), value: true },
                        { label: t('events.form.no'), value: false },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item style={fieldItemStyle} name="is_online" label={t('events.form.onlineLabel')}>
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: t('events.form.onlineOptionOnline'), value: true },
                        { label: t('events.form.onlineOptionInPerson'), value: false },
                      ]}
                    />
                  </Form.Item>
                </Space>
                </div>
              </Space>
            </div>
              ) : null}

              {sectionFormPanelMounted(mode, activeSection, 'venue') ? (
            <div
              className="event-form-section-panel"
              hidden={sectionFormPanelHidden(mode, activeSection, 'venue')}
              style={{ width: '100%' }}
            >
              <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                {t('events.form.sectionVenue')}
              </Typography.Title>
              <Divider style={{ margin: '0 0 16px' }} />
              {isOnlineWatched === true ? (
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  {t('events.form.venueOnlineHint')}
                </Typography.Text>
              ) : null}
              <Form.Item
                style={fieldItemStyle}
                name="location_id"
                hidden={isOnlineWatched === true}
                label={isOnlineWatched === true ? undefined : t('events.form.savedVenueLabel')}
                rules={[
                  {
                    validator: async (_: unknown, value: string | undefined) => {
                      if (form.getFieldValue('is_online')) return
                      const v = typeof value === 'string' ? value.trim() : ''
                      if (!v) throw new Error(t('events.form.savedVenueRequired'))
                    },
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  loading={locationsLoading}
                  placeholder={t('events.form.savedVenuePlaceholder')}
                  options={locations.map((loc) => ({
                    value: loc.id,
                    label: selectLabelForLocation(loc),
                  }))}
                  filterOption={(input, option) =>
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(input.trim().toLowerCase())
                  }
                  onDropdownVisibleChange={(open) => {
                    if (open) void refetchLocations()
                  }}
                  disabled={isOnlineWatched === true}
                />
              </Form.Item>
              {isOnlineWatched !== true ? (
                <Button
                  type="default"
                  onClick={() => setVenueModalOpen(true)}
                  disabled={createLocationMutation.isPending}
                  style={{ marginBottom: 10 }}
                >
                  {t('events.form.addVenueButton')}
                </Button>
              ) : null}
            </div>
              ) : null}

              {sectionFormPanelMounted(mode, activeSection, 'schedules') ? (
                <div
                  className="event-form-section-panel"
                  hidden={sectionFormPanelHidden(mode, activeSection, 'schedules')}
                  style={{ width: '100%' }}
                >
                  <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                    {t('events.schedule.sectionTitle')}
                  </Typography.Title>
                  <Divider style={{ margin: '0 0 16px' }} />
                  {mode === 'edit' && eventId ? (
                    schedulesLoading ? (
                      <Spin />
                    ) : (
                      <>
                        {schedules.length > 1 ? (
                          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                            {t('events.schedule.multipleHint')}
                          </Typography.Paragraph>
                        ) : null}
                        <Form.Item style={fieldItemStyle} name="schedule_date" label={t('events.schedule.dateLabel')}>
                          <DatePicker
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                            placeholder={scheduleFieldPlaceholders.date}
                          />
                        </Form.Item>
                        <Form.Item
                          style={fieldItemStyle}
                          name="schedule_start_time"
                          label={t('events.schedule.startTimeLabel')}
                          dependencies={['schedule_end_time']}
                          rules={[
                            {
                              validator: async (_: unknown, value: Dayjs | undefined) => {
                                const et = form.getFieldValue('schedule_end_time') as Dayjs | undefined
                                if (!value?.isValid() || !et?.isValid()) return
                                const a = value.hour() * 60 + value.minute()
                                const b = et.hour() * 60 + et.minute()
                                if (b < a) {
                                  throw new Error(t('events.schedule.endTimeBeforeStart'))
                                }
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
                          style={fieldItemStyle}
                          name="schedule_end_time"
                          label={t('events.schedule.endTimeLabel')}
                          dependencies={['schedule_start_time']}
                          rules={[
                            {
                              validator: async (_: unknown, value: Dayjs | undefined) => {
                                const st = form.getFieldValue('schedule_start_time') as Dayjs | undefined
                                if (!st?.isValid() || !value?.isValid()) return
                                const a = st.hour() * 60 + st.minute()
                                const b = value.hour() * 60 + value.minute()
                                if (b < a) {
                                  throw new Error(t('events.schedule.endTimeBeforeStart'))
                                }
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
                          style={fieldItemStyle}
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
                  ) : (
                    <Typography.Text type="secondary" style={{ display: 'block' }}>
                      {t('events.form.scheduleAfterCreateHint')}
                    </Typography.Text>
                  )}
                </div>
              ) : null}

              <Form.Item style={{ marginBottom: 0 }}>
                {mode === 'create' ? (
                  <Flex justify="flex-end" gap={8} wrap="wrap" style={{ width: '100%' }}>
                    {activeSection !== 'identity' ? (
                      <Button htmlType="button" onClick={goToPrevCreateSection}>
                        {t('events.create.back')}
                      </Button>
                    ) : null}
                    {activeSection !== 'schedules' ? (
                      <Button
                        type="primary"
                        htmlType="button"
                        onClick={() => void goToNextCreateSection()}
                      >
                        {t('events.create.next')}
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        htmlType="button"
                        loading={submitLoading}
                        onClick={() => void form.submit()}
                      >
                        {t('events.create.submit')}
                      </Button>
                    )}
                  </Flex>
                ) : (
                  <Flex justify="flex-end" style={{ width: '100%' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={
                        submitLoading ||
                        createScheduleMutation.isPending ||
                        updateScheduleMutation.isPending
                      }
                      disabled={!isDirty}
                    >
                      {t('events.edit.submit')}
                    </Button>
                  </Flex>
                )}
              </Form.Item>
            </Card>

            {!compactSectionNav ? (
              <div style={{ width: 220, flexShrink: 0 }}>
                <Steps
                  className="event-form-wide-steps"
                  orientation="vertical"
                  size="small"
                  responsive={false}
                  current={sectionStepIndex}
                  items={wideSectionStepItems}
                  onChange={(step) => goToFormSection(CREATE_SECTION_ORDER[step])}
                />
              </div>
            ) : null}
          </Flex>
        </Flex>
      </Form>

      <Modal
        title={t('events.form.venueModalTitle')}
        open={venueModalOpen}
        onCancel={() => setVenueModalOpen(false)}
        onOk={async () => {
          try {
            const values = await venueForm.validateFields()
            await handleCreateVenue(values)
          } catch {
            return
          }
        }}
        okText={t('events.form.venueModalOk')}
        cancelText={t('events.tags.cancel')}
        confirmLoading={createLocationMutation.isPending}
        destroyOnClose
      >
        <Form form={venueForm} layout="vertical">
          <Form.Item
            name="venue_name"
            label={t('events.form.venueNameLabel')}
            rules={[{ required: true, message: t('events.form.venueNameRequired') }]}
          >
            <Input placeholder={t('events.form.venueNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="formatted_address" label={t('events.form.formattedAddressLabel')}>
            <Input placeholder={t('events.form.formattedAddressPlaceholder')} />
          </Form.Item>
          <Form.Item name="maps_url" label={t('events.form.mapsUrlLabel')} rules={[urlRule]}>
            <Input placeholder={t('events.form.mapsUrlPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('events.tags.createModalTitle')}
        open={tagModalOpen}
        onCancel={() => setTagModalOpen(false)}
        onOk={async () => {
          try {
            const values = await tagForm.validateFields()
            await handleCreateTag(values)
          } catch {
            return
          }
        }}
        okText={t('events.tags.createOk')}
        cancelText={t('events.tags.cancel')}
        confirmLoading={createTagMutation.isPending}
        destroyOnClose
      >
        <Form form={tagForm} layout="vertical" initialValues={{ active: true }}>
          <Form.Item name="name" label={t('events.tags.nameLabel')} rules={[{ required: true, message: t('events.tags.nameRequired') }]}>
            <Input placeholder={t('events.tags.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="parent_tag_id" label={t('events.tags.parentLabel')}>
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              style={{ width: '100%' }}
              placeholder={t('events.tags.parentPlaceholder')}
              treeData={tagTreeData}
              disabled={tagsLoading}
              filterTreeNode={filterTagTreeNode}
            />
          </Form.Item>
          <Form.Item name="description" label={t('events.tags.descriptionLabel')}>
            <Input.TextArea rows={3} placeholder={t('events.tags.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

