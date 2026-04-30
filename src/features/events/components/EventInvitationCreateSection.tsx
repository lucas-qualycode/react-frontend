import { ArrowLeftOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthContext'
import {
  INVITATION_DESTINATION_TYPES,
  type InvitationDestinationType,
} from '@/shared/types/api'
import {
  useCreateInvitation,
  useEventTicketProducts,
  useInvitation,
  useInvitationTags,
  useUpdateInvitation,
} from '../hooks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type GuestRowForm = {
  first_name: string
  required_field_ids: string[]
}

type InvitationCreateFormValues = {
  name: string
  destination_type: InvitationDestinationType
  destination: string
  ticket_id?: string
  guest_slot_count?: number
  expires_at: Dayjs
  tag_ids?: string[]
  guests?: GuestRowForm[]
}

type EventInvitationCreateSectionProps = {
  eventId: string
  onNavigateBack: () => void
  invitationId?: string
}

export function EventInvitationCreateSection({
  eventId,
  onNavigateBack,
  invitationId,
}: EventInvitationCreateSectionProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [form] = Form.useForm<InvitationCreateFormValues>()
  const createMutation = useCreateInvitation()
  const updateMutation = useUpdateInvitation(eventId)
  const isEdit = Boolean(invitationId)
  const {
    data: existingInvitation,
    isLoading: invitationLoading,
    isError: invitationError,
  } = useInvitation(isEdit ? invitationId : undefined)

  const { data: tickets = [] } = useEventTicketProducts(eventId)
  const { data: invitationTags = [], isLoading: tagsLoading } = useInvitationTags()

  const destinationType = Form.useWatch('destination_type', form) as
    | InvitationDestinationType
    | undefined
  const ticketId = Form.useWatch('ticket_id', form) as string | undefined

  const ticketOptions = useMemo(
    () =>
      tickets.map((p) => ({
        value: p.id,
        label: p.name?.trim() || p.id,
      })),
    [tickets],
  )

  const selectedTicket = useMemo(
    () => tickets.find((p) => p.id === ticketId),
    [tickets, ticketId],
  )

  const fieldOptions = useMemo(() => {
    const refs = selectedTicket?.additional_info_fields ?? []
    return refs
      .filter((r) => r.active !== false)
      .map((r) => ({
        value: r.field_id,
        label: (r.label?.trim() || r.field_id) as string,
      }))
  }, [selectedTicket])

  const tagOptions = useMemo(
    () =>
      invitationTags.map((tg) => ({
        value: tg.id,
        label: tg.name,
      })),
    [invitationTags],
  )

  const tx = useMemo(
    () => ({
      title: isEdit ? t('events.invitations.edit.title') : t('events.invitations.create.title'),
      intro: isEdit ? t('events.invitations.edit.intro') : t('events.invitations.create.intro'),
      submit: isEdit ? t('events.invitations.edit.submit') : t('events.invitations.create.submit'),
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
      guest_slot_count: 0,
      expires_at: dayjs().add(7, 'day'),
      tag_ids: [],
      guests: [],
    })
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
      guest_slot_count: existingInvitation.guest_slot_count ?? 0,
      expires_at: dayjs(existingInvitation.expires_at),
      tag_ids: existingInvitation.tags?.map((x) => x.id) ?? [],
      guests: (existingInvitation.guest_slots ?? []).map((s) => ({
        first_name: s.first_name ?? '',
        required_field_ids: s.required_field_ids ?? [],
      })),
    })
  }, [eventId, existingInvitation, form, isEdit, onNavigateBack, t])

  useEffect(() => {
    if (!ticketId || !selectedTicket) {
      if (!ticketId && !isEdit) {
        form.setFieldsValue({ guest_slot_count: 0, guests: [] })
      }
      return
    }
    const max = selectedTicket.max_per_user
    const c = form.getFieldValue('guest_slot_count')
    const cur = typeof c === 'number' && !Number.isNaN(c) ? c : 0
    const clamped = Math.min(Math.max(0, cur), max)
    if (clamped !== cur) {
      form.setFieldsValue({ guest_slot_count: clamped })
    }
  }, [isEdit, ticketId, selectedTicket, form])

  const submitPending = createMutation.isPending || updateMutation.isPending

  const onFinish = useCallback(
    async (values: InvitationCreateFormValues) => {
      if (!user?.uid) {
        message.error(t('events.form.submitError'))
        return
      }
      const slotCount = Math.max(
        0,
        typeof values.guest_slot_count === 'number' && !Number.isNaN(values.guest_slot_count)
          ? values.guest_slot_count
          : 0,
      )
      const rawGuests = values.guests ?? []
      if (rawGuests.length > slotCount) {
        message.error(t('events.invitations.create.guestDetailsExceedSlots'))
        return
      }
      const guestsPayload = rawGuests
        .map((g) => ({
          first_name: (g.first_name ?? '').trim(),
          required_field_ids: g.required_field_ids ?? [],
        }))
        .filter((g) => g.first_name.length > 0 || (g.required_field_ids?.length ?? 0) > 0)
      const tid = String(values.ticket_id ?? '').trim()
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
              guest_slot_count: slotCount,
              guests: guestsPayload,
            },
          })
        } else {
          await createMutation.mutateAsync({
            event_id: eventId,
            inviter_id: user.uid,
            name: values.name.trim(),
            destination: values.destination.trim(),
            destination_type: values.destination_type,
            expires_at: values.expires_at.toISOString(),
            tag_ids: values.tag_ids ?? [],
            metadata: {},
            ticket_id: tid,
            guest_slot_count: slotCount,
            guests: guestsPayload,
          })
        }
        message.success(tx.success)
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
      onNavigateBack,
      t,
      tx.success,
      updateMutation,
      user?.uid,
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
        <Typography.Paragraph type="danger">{t('events.form.submitError')}</Typography.Paragraph>
        <Button type="default" onClick={onNavigateBack}>
          {t('events.invitations.create.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="event-form-section-panel" style={{ width: '100%' }}>
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
        style={{ maxWidth: 560 }}
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
            name="guest_slot_count"
            label={t('events.invitations.create.guestSlotCountLabel')}
            tooltip={
              selectedTicket
                ? t('events.invitations.create.guestSlotCountTooltip', {
                    max: selectedTicket.max_per_user,
                  })
                : undefined
            }
            rules={[
              { type: 'number', min: 0 },
              {
                validator: async (_, v) => {
                  if (v == null || v === '') return
                  const n = typeof v === 'number' ? v : Number(v)
                  if (Number.isNaN(n) || n < 0) throw new Error(t('events.invitations.create.guestSlotCountInvalid'))
                  const tid = form.getFieldValue('ticket_id') as string | undefined
                  const tk = tickets.find((p) => p.id === tid)
                  const max = tk?.max_per_user
                  if (max !== undefined && n > max) {
                    throw new Error(t('events.invitations.create.guestSlotCountOverMax', { max }))
                  }
                },
              },
            ]}
            style={{ flex: '0 0 132px', marginBottom: 0 }}
          >
            <InputNumber
              min={0}
              max={selectedTicket ? selectedTicket.max_per_user : 0}
              disabled={!ticketId}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Flex>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {t('events.invitations.create.guestsHelp')}
        </Typography.Text>
        <Form.List name="guests">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Flex key={field.key} gap={8} align="flex-start" wrap="wrap" style={{ marginBottom: 12 }}>
                  <Form.Item
                    label={t('events.invitations.create.guestFirstNameLabel')}
                    name={[field.name, 'first_name']}
                    style={{ flex: '1 1 200px', marginBottom: 0 }}
                  >
                    <Input placeholder={t('events.invitations.create.guestFirstNamePlaceholderOptional')} />
                  </Form.Item>
                  <Form.Item
                    label={t('events.invitations.create.guestFieldsLabel')}
                    name={[field.name, 'required_field_ids']}
                    style={{ flex: '1 1 240px', marginBottom: 0 }}
                  >
                    <Select
                      mode="multiple"
                      allowClear
                      optionFilterProp="label"
                      options={fieldOptions}
                      disabled={!ticketId}
                      placeholder={t('events.invitations.create.guestFieldsPlaceholder')}
                    />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(field.name)}
                    aria-label={t('events.invitations.create.removeGuest')}
                    style={{ marginTop: 30 }}
                  />
                </Flex>
              ))}
              <Form.Item shouldUpdate noStyle>
                {() => {
                  const maxSlots =
                    typeof form.getFieldValue('guest_slot_count') === 'number' &&
                    !Number.isNaN(form.getFieldValue('guest_slot_count'))
                      ? form.getFieldValue('guest_slot_count')
                      : 0
                  const currentLen = (form.getFieldValue('guests') as GuestRowForm[] | undefined)?.length ?? 0
                  const canAdd = ticketId && maxSlots > 0 && currentLen < maxSlots
                  return (
                    <Button
                      type="dashed"
                      onClick={() => add({ first_name: '', required_field_ids: [] })}
                      block
                      disabled={!canAdd}
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                    >
                      {t('events.invitations.create.addGuest')}
                    </Button>
                  )
                }}
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item
          name="expires_at"
          label={t('events.invitations.create.expiresLabel')}
          rules={[
            { required: true, message: t('events.invitations.create.expiresRequired') },
            {
              validator: async (_: unknown, v: Dayjs) => {
                if (!v?.isValid()) throw new Error(t('events.invitations.create.expiresInvalid'))
                if (!v.isAfter(dayjs())) throw new Error(t('events.invitations.create.expiresMustBeFuture'))
              },
            },
          ]}
        >
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
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
        <Form.Item style={{ marginBottom: 0 }}>
          <Flex gap={8} wrap="wrap">
            <Button type="primary" htmlType="submit" loading={submitPending}>
              {tx.submit}
            </Button>
            <Button htmlType="button" onClick={onNavigateBack}>
              {t('events.invitations.create.cancel')}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </div>
  )
}
