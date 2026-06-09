import {
  ArrowLeftOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import { flushSync } from 'react-dom'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthContext'
import {
  INVITATION_DESTINATION_TYPES,
  type FieldDefinition,
  type InvitationDestinationType,
} from '@/shared/types/api'
import {
  useCreateInvitation,
  useDeleteInvitation,
  useEvent,
  useEventTicketProducts,
  useFieldDefinitions,
  useInvitation,
  useInvitationTags,
  useUpdateInvitation,
} from '@/features/events/hooks'
import { setStoredInvitationAccessToken } from '@/features/events/lib/invitationAccessStorage'
import { schedulesFromEvent } from '@/features/events/scheduleList'
import { scheduleEventEnd, scheduleEventStart } from '@/features/events/components/invitationFlow/lib/scheduleEventZoned'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clampExpiryToEventEnd(d: Dayjs, eventEnd: Dayjs | null): Dayjs {
  if (!eventEnd?.isValid()) return d
  return d.isAfter(eventEnd) ? eventEnd : d
}

function ticketFieldIdsOrdered(
  tk: { additional_info_fields?: { field_id: string; active?: boolean | null }[] } | undefined,
): string[] {
  const refs = tk?.additional_info_fields ?? []
  return refs.filter((r) => r.active !== false).map((r) => r.field_id)
}

function ticketLockedFieldIdSet(
  tk: { additional_info_fields?: { field_id: string; active?: boolean | null; required?: boolean | null }[] } | undefined,
): Set<string> {
  const refs = tk?.additional_info_fields ?? []
  return new Set(
    refs.filter((r) => r.active !== false && r.required === true).map((r) => r.field_id),
  )
}

function normalizeGuestFieldIds(
  value: unknown,
  selectableIdsOrdered: string[],
  lockedIds: Set<string>,
): string[] {
  if (!selectableIdsOrdered.length) return []
  const allowed = new Set(selectableIdsOrdered)
  const raw = Array.isArray(value) ? value : []
  const picked = new Set<string>()
  for (const id of raw) {
    if (typeof id === 'string' && allowed.has(id)) picked.add(id)
  }
  for (const id of lockedIds) {
    if (allowed.has(id)) picked.add(id)
  }
  return selectableIdsOrdered.filter((id) => picked.has(id))
}

function buildGuestFieldSelectableIdsOrdered(
  tk: Parameters<typeof ticketFieldIdsOrdered>[0],
  defs: FieldDefinition[],
): string[] {
  const ticketIds = ticketFieldIdsOrdered(tk)
  const onTicket = new Set(ticketIds)
  const extras = defs
    .filter((d) => d.active !== false && !d.deleted && !onTicket.has(d.id))
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((d) => d.id)
  return [...ticketIds, ...extras]
}

type SpotRowForm = {
  id?: string
  name: string
  required_field_ids: string[]
}

type InvitationCreateFormValues = {
  name: string
  destination_type: InvitationDestinationType
  destination: string
  ticket_id?: string
  spot_count?: number
  expires_at: Dayjs
  tag_ids?: string[]
  spots?: SpotRowForm[]
}

function snapshotInvitationDirty(v: InvitationCreateFormValues): string {
  const spots = (v.spots ?? []).map((g) => ({
    id: g.id ?? '',
    name: (g.name ?? '').trim(),
    required_field_ids: [...(g.required_field_ids ?? [])].sort(),
  }))
  return JSON.stringify({
    name: (v.name ?? '').trim(),
    destination_type: v.destination_type,
    destination: (v.destination ?? '').trim(),
    ticket_id: v.ticket_id ?? '',
    spot_count:
      typeof v.spot_count === 'number' && !Number.isNaN(v.spot_count)
        ? v.spot_count
        : 0,
    expires_at: v.expires_at?.isValid() ? v.expires_at.toISOString() : '',
    tag_ids: [...(v.tag_ids ?? [])].sort(),
    spots,
  })
}

type EventInvitationCreateSectionProps = {
  eventId: string
  onNavigateBack: () => void
  invitationId?: string
  onDirtyChange?: (dirty: boolean) => void
}

export type EventInvitationEditorHandle = {
  discardUnsavedEdits: () => void
}

export const EventInvitationCreateSection = forwardRef<
  EventInvitationEditorHandle,
  EventInvitationCreateSectionProps
>(function EventInvitationCreateSection(
  { eventId, onNavigateBack, invitationId, onDirtyChange },
  ref,
) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [form] = Form.useForm<InvitationCreateFormValues>()
  const createMutation = useCreateInvitation(eventId)
  const updateMutation = useUpdateInvitation(eventId)
  const deleteMutation = useDeleteInvitation(eventId)
  const [invitationDeleteModalOpen, setInvitationDeleteModalOpen] = useState(false)
  const isEdit = Boolean(invitationId)
  const {
    data: existingInvitation,
    isLoading: invitationLoading,
    isError: invitationError,
  } = useInvitation(isEdit ? eventId : undefined, isEdit ? invitationId : undefined)

  const { data: tickets = [] } = useEventTicketProducts(eventId)
  const { data: event } = useEvent(eventId)
  const schedules = useMemo(() => schedulesFromEvent(event), [event])
  const { data: invitationTags = [], isLoading: tagsLoading } = useInvitationTags()
  const { data: fieldDefinitions = [], isLoading: fieldDefinitionsLoading } = useFieldDefinitions(true)

  const destinationType = Form.useWatch('destination_type', form) as
    | InvitationDestinationType
    | undefined
  const ticketId = Form.useWatch('ticket_id', form) as string | undefined
  const allInviteValues = Form.useWatch([], form) as InvitationCreateFormValues | undefined
  const baselineRef = useRef('')
  const [isDirty, setIsDirty] = useState(false)

  const lockedSpotIds = useMemo(
    () =>
      new Set(
        (existingInvitation?.spots ?? [])
          .filter((spot) => spot.has_user_product)
          .map((spot) => spot.id),
      ),
    [existingInvitation?.spots],
  )

  const ticketsForInvitationForm = useMemo(() => {
    const activeOnly = tickets.filter((p) => p.active)
    const tid = existingInvitation?.ticket_id ?? undefined
    if (typeof tid === 'string' && tid && !activeOnly.some((p) => p.id === tid)) {
      const current = tickets.find((p) => p.id === tid)
      if (current) return [...activeOnly, current]
    }
    return activeOnly
  }, [tickets, existingInvitation?.ticket_id])

  const ticketOptions = useMemo(
    () =>
      ticketsForInvitationForm.map((p) => ({
        value: p.id,
        label: !p.active
          ? `${p.name?.trim() || p.id}${t('events.invitations.create.ticketInactiveSuffix')}`
          : p.name?.trim() || p.id,
      })),
    [ticketsForInvitationForm, t],
  )

  const selectedTicket = useMemo(
    () => ticketsForInvitationForm.find((p) => p.id === ticketId),
    [ticketsForInvitationForm, ticketId],
  )

  const ticketFieldSelectOptions = useMemo(() => {
    const refs = selectedTicket?.additional_info_fields ?? []
    const byId = new Map(fieldDefinitions.map((d) => [d.id, d]))
    return refs
      .filter((r) => r.active !== false)
      .map((r) => {
        const def = byId.get(r.field_id)
        const label = (r.label?.trim() || def?.label?.trim() || r.field_id) as string
        return { value: r.field_id, label }
      })
  }, [selectedTicket, fieldDefinitions])

  const guestFieldSelectableIdsOrdered = useMemo(
    () => buildGuestFieldSelectableIdsOrdered(selectedTicket, fieldDefinitions),
    [selectedTicket, fieldDefinitions],
  )

  const fieldSelectOptionsGrouped = useMemo(() => {
    if (!ticketId) return []
    const ticketOpts = ticketFieldSelectOptions
    const ticketIds = new Set(ticketOpts.map((o) => o.value as string))
    const extraOpts = fieldDefinitions
      .filter((d) => d.active !== false && !d.deleted && !ticketIds.has(d.id))
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((d) => ({ value: d.id, label: d.label }))
    const groups: { label: string; options: { value: string; label: string }[] }[] = []
    if (ticketOpts.length) {
      groups.push({
        label: t('events.invitations.create.guestFieldsGroupTicket'),
        options: ticketOpts,
      })
    }
    if (extraOpts.length) {
      groups.push({
        label: t('events.invitations.create.guestFieldsGroupOther'),
        options: extraOpts,
      })
    }
    return groups
  }, [ticketId, ticketFieldSelectOptions, fieldDefinitions, t])

  const ticketDefaultGuestFieldIds = useMemo(
    () => ticketFieldSelectOptions.map((o) => o.value as string),
    [ticketFieldSelectOptions],
  )

  const lockedFieldIdsForTicket = useMemo(
    () => ticketLockedFieldIdSet(selectedTicket),
    [selectedTicket],
  )

  const tagOptions = useMemo(
    () =>
      invitationTags.map((tg) => ({
        value: tg.id,
        label: tg.name,
      })),
    [invitationTags],
  )

  const primarySchedule = schedules[0]
  const eventStartDayjs = useMemo(() => scheduleEventStart(primarySchedule), [primarySchedule])
  const eventEndDayjs = useMemo(() => scheduleEventEnd(primarySchedule), [primarySchedule])
  const eventDayPresetEnabled = Boolean(eventStartDayjs?.isAfter(dayjs()))

  const expiresAtRules = useMemo(
    () => [
      { required: true, message: t('events.invitations.create.expiresRequired') },
      {
        validator: async (_: unknown, v: Dayjs) => {
          if (!v?.isValid()) throw new Error(t('events.invitations.create.expiresInvalid'))
          if (!v.isAfter(dayjs())) {
            throw new Error(t('events.invitations.create.expiresMustBeFuture'))
          }
          if (eventEndDayjs?.isValid() && v.isAfter(eventEndDayjs)) {
            throw new Error(
              t('events.invitations.create.expiresMustBeOnOrBeforeEventEnd', {
                end: eventEndDayjs.format('YYYY-MM-DD HH:mm'),
              }),
            )
          }
        },
      },
    ],
    [t, eventEndDayjs],
  )

  const tx = useMemo(
    () => ({
      title: isEdit ? t('events.invitations.edit.title') : t('events.invitations.create.title'),
      intro: isEdit ? t('events.invitations.edit.intro') : t('events.invitations.create.intro'),
      submit: isEdit ? t('events.form.save') : t('events.form.create'),
      success: isEdit ? t('events.invitations.edit.success') : t('events.invitations.create.success'),
    }),
    [isEdit, t],
  )

  const destinationPlaceholder = useMemo(() => {
    if (destinationType === 'EMAIL') return t('events.invitations.create.destinationHintEmail')
    if (destinationType === 'SMS') return t('events.invitations.create.destinationHintSms')
    if (destinationType === 'WHATSAPP') return t('events.invitations.create.destinationHintWhatsapp')
    if (destinationType === 'USER_ID') return t('events.invitations.create.destinationHintUserId')
    return t('events.invitations.create.destinationHintWhatsapp')
  }, [destinationType, t])

  const destinationRules = useMemo(() => {
    if (destinationType === 'EMAIL') {
      return [
        { required: true, message: t('events.invitations.create.destinationRequiredEmail') },
        {
          validator: async (_: unknown, value: string) => {
            const v = value?.trim() ?? ''
            if (!v) return
            if (!EMAIL_RE.test(v)) throw new Error(t('events.invitations.create.destinationEmailInvalid'))
          },
        },
      ]
    }
    if (destinationType === 'SMS' || destinationType === 'WHATSAPP') {
      return [
        { required: true, message: t('events.invitations.create.destinationRequiredPhone') },
        {
          validator: async (_: unknown, value: string) => {
            const v = value?.trim() ?? ''
            if (!v) return
            const digits = v.replace(/\D/g, '')
            if (digits.length < 8 || digits.length > 15) {
              throw new Error(t('events.invitations.create.destinationPhoneInvalid'))
            }
          },
        },
      ]
    }
    if (destinationType === 'USER_ID') {
      return [
        { required: true, message: t('events.invitations.create.destinationRequiredUserId') },
        {
          validator: async (_: unknown, value: string) => {
            const v = value?.trim() ?? ''
            if (!v) return
            if (v.length < 4) throw new Error(t('events.invitations.create.destinationUserIdInvalid'))
          },
        },
      ]
    }
    return [
      { required: true, message: t('events.invitations.create.destinationRequiredPhone') },
      {
        validator: async (_: unknown, value: string) => {
          const v = value?.trim() ?? ''
          if (!v) return
          const digits = v.replace(/\D/g, '')
          if (digits.length < 8 || digits.length > 15) {
            throw new Error(t('events.invitations.create.destinationPhoneInvalid'))
          }
        },
      },
    ]
  }, [destinationType, t])

  const hydratedInvitationRef = useRef<string | null>(null)
  useEffect(() => {
    hydratedInvitationRef.current = null
  }, [invitationId])

  useEffect(() => {
    if (isEdit) return
    form.setFieldsValue({
      name: '',
      destination_type: 'WHATSAPP',
      destination: '',
      ticket_id: undefined,
      spot_count: 0,
      expires_at: dayjs().add(7, 'day'),
      tag_ids: [],
      spots: [],
    })
    baselineRef.current = snapshotInvitationDirty(
      form.getFieldsValue(true) as InvitationCreateFormValues,
    )
  }, [eventId, form, isEdit])

  useEffect(() => {
    if (!isEdit || !existingInvitation) return
    if (hydratedInvitationRef.current === existingInvitation.id) return
    if (existingInvitation.event_id !== eventId) {
      message.error(t('events.form.submitError'))
      onNavigateBack()
      return
    }
    hydratedInvitationRef.current = existingInvitation.id
    form.setFieldsValue({
      name: existingInvitation.name ?? '',
      destination_type: existingInvitation.destination_type,
      destination: existingInvitation.destination ?? '',
      ticket_id: existingInvitation.ticket_id ?? undefined,
      spot_count: Math.max(1, existingInvitation.spot_count ?? 0),
      expires_at: dayjs(existingInvitation.expires_at),
      tag_ids: existingInvitation.tags?.map((x) => x.id) ?? [],
      spots: (existingInvitation.spots ?? []).map((s) => ({
        id: s.id,
        name: s.name ?? '',
        required_field_ids: s.required_field_ids ?? [],
      })),
    })
    baselineRef.current = snapshotInvitationDirty(
      form.getFieldsValue(true) as InvitationCreateFormValues,
    )
  }, [eventId, existingInvitation, form, isEdit, onNavigateBack, t])

  useImperativeHandle(
    ref,
    () => ({
      discardUnsavedEdits: () => {
        if (isEdit && existingInvitation && existingInvitation.event_id === eventId) {
          form.setFieldsValue({
            name: existingInvitation.name ?? '',
            destination_type: existingInvitation.destination_type,
            destination: existingInvitation.destination ?? '',
            ticket_id: existingInvitation.ticket_id ?? undefined,
            spot_count: Math.max(1, existingInvitation.spot_count ?? 0),
            expires_at: dayjs(existingInvitation.expires_at),
            tag_ids: existingInvitation.tags?.map((x) => x.id) ?? [],
            spots: (existingInvitation.spots ?? []).map((s) => ({
              id: s.id,
              name: s.name ?? '',
              required_field_ids: s.required_field_ids ?? [],
            })),
          })
          baselineRef.current = snapshotInvitationDirty(
            form.getFieldsValue(true) as InvitationCreateFormValues,
          )
        } else {
          form.setFieldsValue({
            name: '',
            destination_type: 'WHATSAPP',
            destination: '',
            ticket_id: undefined,
            spot_count: 0,
            expires_at: dayjs().add(7, 'day'),
            tag_ids: [],
            spots: [],
          })
          baselineRef.current = snapshotInvitationDirty(
            form.getFieldsValue(true) as InvitationCreateFormValues,
          )
        }
        setIsDirty(false)
        onDirtyChange?.(false)
      },
    }),
    [eventId, existingInvitation, form, isEdit, onDirtyChange],
  )

  useEffect(() => {
    if (!onDirtyChange) return
    if (baselineRef.current === '') return
    const raw = form.getFieldsValue(true) as InvitationCreateFormValues
    const next = snapshotInvitationDirty(raw) !== baselineRef.current
    setIsDirty(next)
    onDirtyChange(next)
  }, [allInviteValues, form, onDirtyChange])

  useEffect(() => {
    if (!ticketId || !selectedTicket) {
      if (!ticketId && !isEdit) {
        form.setFieldsValue({ spot_count: 0, spots: [] })
      }
      return
    }
    const max = selectedTicket.max_per_user
    const c = form.getFieldValue('spot_count')
    const cur = typeof c === 'number' && !Number.isNaN(c) ? c : 1
    const clamped = Math.min(Math.max(1, cur), max)
    if (clamped !== cur) {
      form.setFieldsValue({ spot_count: clamped })
    }
  }, [isEdit, ticketId, selectedTicket, form])

  useEffect(() => {
    if (!selectedTicket || !ticketId) return
    const spots = form.getFieldValue('spots') as SpotRowForm[] | undefined
    if (!spots?.length) return
    const next = spots.map((g) => ({
      ...g,
      required_field_ids: normalizeGuestFieldIds(
        g.required_field_ids,
        guestFieldSelectableIdsOrdered,
        lockedFieldIdsForTicket,
      ),
    }))
    const changed = spots.some(
      (g, i) =>
        JSON.stringify(g.required_field_ids) !== JSON.stringify(next[i]?.required_field_ids),
    )
    if (changed) form.setFieldsValue({ spots: next })
  }, [ticketId, selectedTicket, guestFieldSelectableIdsOrdered, lockedFieldIdsForTicket, form])

  const submitPending = createMutation.isPending || updateMutation.isPending

  const onFinish = useCallback(
    async (values: InvitationCreateFormValues) => {
      if (!user?.uid) {
        message.error(t('events.form.submitError'))
        return
      }
      const slotCount = Math.max(
        1,
        typeof values.spot_count === 'number' && !Number.isNaN(values.spot_count)
          ? values.spot_count
          : 1,
      )
      const rawGuests = isEdit
        ? ((form.getFieldsValue(true) as InvitationCreateFormValues).spots ?? values.spots ?? [])
        : (values.spots ?? [])
      if (rawGuests.length > slotCount) {
        message.error(t('events.invitations.create.spotDetailsExceedCount'))
        return
      }
      const tid = String(values.ticket_id ?? '').trim()
      const submitTicket = ticketsForInvitationForm.find((p) => p.id === tid)
      const submitSelectableOrdered = buildGuestFieldSelectableIdsOrdered(
        submitTicket,
        fieldDefinitions,
      )
      const submitLocked = ticketLockedFieldIdSet(submitTicket)
      const mappedSpots = rawGuests.map((g) => ({
        ...(g.id ? { id: g.id } : {}),
        name: (g.name ?? '').trim(),
        required_field_ids: normalizeGuestFieldIds(
          g.required_field_ids,
          submitSelectableOrdered,
          submitLocked,
        ),
      }))
      const spotsPayload = isEdit
        ? mappedSpots
        : mappedSpots.filter(
            (g) => g.name.length > 0 || (g.required_field_ids?.length ?? 0) > 0,
          )
      try {
        if (isEdit && invitationId) {
          await updateMutation.mutateAsync({
            invitationId,
            payload: {
              name: values.name.trim(),
              destination: values.destination.trim(),
              destination_type: values.destination_type,
              expires_at: values.expires_at.toISOString(),
              tag_ids: values.tag_ids ?? [],
              ticket_id: tid || null,
              spot_count: slotCount,
              spots: spotsPayload,
            },
          })
        } else {
          const created = await createMutation.mutateAsync({
            name: values.name.trim(),
            destination: values.destination.trim(),
            destination_type: values.destination_type,
            expires_at: values.expires_at.toISOString(),
            tag_ids: values.tag_ids ?? [],
            metadata: {},
            ticket_id: tid,
            spot_count: slotCount,
            spots: spotsPayload,
          })
          if (created.access_token && created.id) {
            setStoredInvitationAccessToken(created.id, created.access_token)
          }
        }
        message.success(tx.success)
        flushSync(() => {
          onDirtyChange?.(false)
        })
        onNavigateBack()
      } catch (e) {
        message.error(e instanceof Error ? e.message : t('events.form.submitError'))
      }
    },
    [
      createMutation,
      eventId,
      invitationId,
      isEdit,
      onDirtyChange,
      onNavigateBack,
      t,
      tx.success,
      updateMutation,
      user?.uid,
      ticketsForInvitationForm,
      fieldDefinitions,
      form,
    ],
  )

  if (isEdit && invitationLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Spin />
      </Flex>
    )
  }

  if (isEdit && (invitationError || !existingInvitation)) {
    return (
      <div className="event-form-section-panel" style={{ width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          <Typography.Paragraph type="danger">{t('events.form.submitError')}</Typography.Paragraph>
          <Button type="default" onClick={onNavigateBack}>
            {t('events.invitations.create.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="event-form-section-panel" style={{ width: '100%' }}>
      <div style={{ width: '100%', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
        <Flex justify="space-between" align="center" gap={16} wrap="wrap" style={{ marginBottom: 8 }}>
          <Typography.Title
            level={4}
            style={{ marginTop: 0, marginBottom: 0, flex: '1 1 auto', minWidth: 0 }}
          >
            {tx.title}
          </Typography.Title>
          <Button type="default" icon={<ArrowLeftOutlined />} onClick={onNavigateBack}>
            {t('events.invitations.create.back')}
          </Button>
        </Flex>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {tx.intro}
        </Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => void onFinish(v)}
          style={{ width: '100%' }}
        >
        <Form.Item
          name="name"
          label={t('events.invitations.create.nameLabel')}
          rules={[{ required: true, message: t('events.invitations.create.nameRequired') }]}
        >
          <Input placeholder={t('events.invitations.create.namePlaceholder')} />
        </Form.Item>
        <Form.Item label={t('events.invitations.create.destinationTypeLabel')}>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="destination_type" noStyle rules={[{ required: true }]}>
              <Select
                style={{ width: '38%', minWidth: 120, maxWidth: 200 }}
                popupMatchSelectWidth={false}
                options={INVITATION_DESTINATION_TYPES.map((v) => ({
                  value: v,
                  label: t(`events.invitations.destinationType.${v}`),
                }))}
              />
            </Form.Item>
            <Form.Item name="destination" noStyle rules={destinationRules}>
              <Input
                placeholder={destinationPlaceholder}
                aria-label={destinationPlaceholder}
                style={{ width: '62%', minWidth: 0 }}
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>
        <Flex gap={16} align="flex-end" wrap="wrap" style={{ marginBottom: 24 }}>
          <Form.Item
            name="ticket_id"
            label={t('events.invitations.create.ticketLabel')}
            rules={[{ required: true, message: t('events.invitations.create.ticketRequired') }]}
            style={{ flex: '1 1 260px', marginBottom: 0, minWidth: 0 }}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={ticketOptions}
              placeholder={t('events.invitations.create.ticketPlaceholder')}
            />
          </Form.Item>
          <Form.Item
            name="spot_count"
            label={t('events.invitations.create.spotCountLabel')}
            tooltip={
              selectedTicket
                ? t('events.invitations.create.spotCountTooltip', {
                    max: selectedTicket.max_per_user,
                  })
                : undefined
            }
            rules={[
              { type: 'number', min: 1 },
              {
                validator: async (_, v) => {
                  if (v == null || v === '') return
                  const n = typeof v === 'number' ? v : Number(v)
                  if (Number.isNaN(n) || n < 1) throw new Error(t('events.invitations.create.spotCountMin'))
                  const tid = form.getFieldValue('ticket_id') as string | undefined
                  const tk = ticketsForInvitationForm.find((p) => p.id === tid)
                  const max = tk?.max_per_user
                  if (max !== undefined && n > max) {
                    throw new Error(t('events.invitations.create.spotCountOverMax', { max }))
                  }
                },
              },
            ]}
            style={{ flex: '0 0 132px', marginBottom: 0 }}
          >
            <InputNumber
              min={1}
              max={selectedTicket ? selectedTicket.max_per_user : 1}
              disabled={!ticketId}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Flex>
        <Form.List name="spots">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Flex key={field.key} gap={8} align="flex-start" wrap="wrap" style={{ marginBottom: 12 }}>
                  <Form.Item name={[field.name, 'id']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label={t('events.invitations.create.spotNameLabel')}
                    name={[field.name, 'name']}
                    style={{ flex: '1 1 200px', marginBottom: 0 }}
                  >
                    <Input placeholder={t('events.invitations.create.spotNamePlaceholderOptional')} />
                  </Form.Item>
                  <Form.Item
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {t('events.invitations.create.guestFieldsLabel')}
                        <Tooltip title={t('events.invitations.create.guestFieldsHelp')}>
                          <span
                            role="img"
                            aria-label={t('events.invitations.create.guestFieldsHelp')}
                            style={{ display: 'inline-flex', cursor: 'help', lineHeight: 0 }}
                          >
                            <QuestionCircleOutlined
                              style={{ color: 'var(--ant-color-text-tertiary)' }}
                              aria-hidden
                            />
                          </span>
                        </Tooltip>
                      </span>
                    }
                    name={[field.name, 'required_field_ids']}
                    normalize={(v) =>
                      normalizeGuestFieldIds(
                        v,
                        guestFieldSelectableIdsOrdered,
                        lockedFieldIdsForTicket,
                      )
                    }
                    style={{ flex: '1 1 240px', marginBottom: 0 }}
                  >
                    <Select
                      mode="multiple"
                      allowClear
                      optionFilterProp="label"
                      options={fieldSelectOptionsGrouped}
                      disabled={!ticketId}
                      loading={Boolean(ticketId) && fieldDefinitionsLoading}
                      placeholder={t('events.invitations.create.guestFieldsPlaceholder')}
                      tagRender={(props) => {
                        const { label, closable, onClose } = props
                        const locked = lockedFieldIdsForTicket.has(String(props.value))
                        const onPreventMouseDown = (e: MouseEvent<HTMLSpanElement>) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }
                        return (
                          <Tag
                            className="ant-select-selection-item"
                            onMouseDown={onPreventMouseDown}
                            closable={closable && !locked}
                            onClose={onClose}
                            style={{ marginInlineEnd: 4 }}
                          >
                            {label}
                          </Tag>
                        )
                      }}
                    />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate>
                    {() => {
                      const row = (form.getFieldValue('spots') as SpotRowForm[] | undefined)?.[
                        field.name
                      ]
                      const spotLocked = Boolean(row?.id && lockedSpotIds.has(row.id))
                      const removeLabel = t('events.invitations.create.removeGuest')
                      const lockedTitle = t('events.invitations.edit.removeGuestBlocked')
                      return (
                        <Tooltip title={spotLocked ? lockedTitle : undefined}>
                          <span style={{ display: 'inline-flex', marginTop: 30 }}>
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              disabled={spotLocked}
                              onClick={() => remove(field.name)}
                              aria-label={
                                spotLocked ? `${removeLabel}. ${lockedTitle}` : removeLabel
                              }
                            />
                          </span>
                        </Tooltip>
                      )
                    }}
                  </Form.Item>
                </Flex>
              ))}
              <Form.Item shouldUpdate noStyle>
                {() => {
                  const maxSlots =
                    typeof form.getFieldValue('spot_count') === 'number' &&
                    !Number.isNaN(form.getFieldValue('spot_count'))
                      ? form.getFieldValue('spot_count')
                      : 0
                  const currentLen = (form.getFieldValue('spots') as SpotRowForm[] | undefined)?.length ?? 0
                  const canAdd = ticketId && maxSlots > 0 && currentLen < maxSlots
                  return (
                    <Flex align="center" gap={8} style={{ width: '100%', marginBottom: 16 }}>
                      <Button
                        type="dashed"
                        onClick={() =>
                          add({
                            name: '',
                            required_field_ids: [...ticketDefaultGuestFieldIds],
                          })
                        }
                        disabled={!canAdd}
                        icon={<PlusOutlined />}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        {t('events.invitations.create.addGuest')}
                      </Button>
                      <Tooltip title={t('events.invitations.create.guestsHelp')}>
                        <span
                          role="img"
                          aria-label={t('events.invitations.create.guestsHelp')}
                          style={{ display: 'inline-flex', cursor: 'help', lineHeight: 0, flexShrink: 0 }}
                        >
                          <QuestionCircleOutlined
                            style={{ color: 'var(--ant-color-text-tertiary)' }}
                            aria-hidden
                          />
                        </span>
                      </Tooltip>
                    </Flex>
                  )
                }}
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item
          label={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t('events.invitations.create.expiresLabel')}
              <Tooltip title={t('events.invitations.create.expiresHelp')}>
                <span
                  role="img"
                  aria-label={t('events.invitations.create.expiresHelp')}
                  style={{ display: 'inline-flex', cursor: 'help', lineHeight: 0 }}
                >
                  <QuestionCircleOutlined
                    style={{ color: 'var(--ant-color-text-tertiary)' }}
                    aria-hidden
                  />
                </span>
              </Tooltip>
            </span>
          }
          required
        >
          <Flex
            gap={12}
            align="flex-start"
            wrap="wrap"
            justify="space-between"
            style={{ width: '100%' }}
          >
            <Form.Item name="expires_at" noStyle rules={expiresAtRules}>
              <DatePicker showTime style={{ width: 200, maxWidth: '100%' }} format="YYYY-MM-DD HH:mm" />
            </Form.Item>
            <Space wrap size={[8, 8]} style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
              <Button
                type="default"
                size="small"
                onClick={() =>
                  form.setFieldsValue({
                    expires_at: clampExpiryToEventEnd(
                      dayjs().add(7, 'day').endOf('day'),
                      eventEndDayjs,
                    ),
                  })
                }
              >
                {t('events.invitations.create.expiresPreset7Days')}
              </Button>
              <Button
                type="default"
                size="small"
                onClick={() =>
                  form.setFieldsValue({
                    expires_at: clampExpiryToEventEnd(
                      dayjs().add(15, 'day').endOf('day'),
                      eventEndDayjs,
                    ),
                  })
                }
              >
                {t('events.invitations.create.expiresPreset15Days')}
              </Button>
              <Button
                type="default"
                size="small"
                onClick={() =>
                  form.setFieldsValue({
                    expires_at: clampExpiryToEventEnd(
                      dayjs().add(30, 'day').endOf('day'),
                      eventEndDayjs,
                    ),
                  })
                }
              >
                {t('events.invitations.create.expiresPreset30Days')}
              </Button>
              <Tooltip
                title={
                  eventDayPresetEnabled
                    ? undefined
                    : t('events.invitations.create.expiresPresetEventDayDisabled')
                }
              >
                <Button
                  type="default"
                  size="small"
                  disabled={!eventDayPresetEnabled || !eventStartDayjs}
                  onClick={() =>
                    eventStartDayjs &&
                    form.setFieldsValue({
                      expires_at: clampExpiryToEventEnd(eventStartDayjs, eventEndDayjs),
                    })
                  }
                >
                  {t('events.invitations.create.expiresPresetEventDay')}
                </Button>
              </Tooltip>
            </Space>
          </Flex>
        </Form.Item>
        <Form.Item name="tag_ids" label={t('events.invitations.create.tagsLabel')}>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={tagsLoading}
            options={tagOptions}
            placeholder={t('events.invitations.create.tagsPlaceholder')}
          />
        </Form.Item>
        <Flex justify="space-between" align="center" gap={16} wrap="wrap" style={{ marginTop: 24 }}>
          <div>
            {isEdit && invitationId ? (
              <Button
                danger
                disabled={deleteMutation.isPending}
                onClick={() => setInvitationDeleteModalOpen(true)}
              >
                {t('events.invitations.edit.delete')}
              </Button>
            ) : null}
          </div>
          <Space>
            <Button htmlType="button" onClick={onNavigateBack}>
              {t('events.tags.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={submitPending} disabled={!isDirty}>
              {tx.submit}
            </Button>
          </Space>
        </Flex>
      </Form>
      </div>
      {isEdit && invitationId ? (
        <Modal
          title={t('events.invitations.edit.deleteConfirmTitle')}
          open={invitationDeleteModalOpen}
          okText={t('events.invitations.edit.deleteOk')}
          cancelText={t('events.tags.cancel')}
          okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
          onCancel={() => setInvitationDeleteModalOpen(false)}
          onOk={async () => {
            try {
              await deleteMutation.mutateAsync(invitationId)
              message.success(t('events.invitations.edit.deleteSuccess'))
              setInvitationDeleteModalOpen(false)
              flushSync(() => {
                onDirtyChange?.(false)
              })
              onNavigateBack()
            } catch (e) {
              setInvitationDeleteModalOpen(false)
              if (e instanceof Error && e.message) message.error(e.message)
            }
          }}
        >
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {t('events.invitations.edit.deleteConfirmBody')}
          </Typography.Paragraph>
        </Modal>
      ) : null}
    </div>
  )
})
