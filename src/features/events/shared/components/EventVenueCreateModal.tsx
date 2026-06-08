import { useEffect, useMemo } from 'react'
import { Form, Input, Modal, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateLocation, useLocations } from '@/features/events/hooks'
import { URL_REGEX } from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'

type VenueCreateFormValues = {
  venue_name: string
  formatted_address?: string
  maps_url?: string
}

type EventVenueCreateModalProps = {
  open: boolean
  onClose: () => void
}

export function EventVenueCreateModal({ open, onClose }: EventVenueCreateModalProps) {
  const { t } = useTranslation()
  const parentForm = Form.useFormInstance<EventFormValues>()
  const [venueForm] = Form.useForm<VenueCreateFormValues>()
  const { refetch: refetchLocations } = useLocations()
  const createLocationMutation = useCreateLocation()

  useEffect(() => {
    if (!open) {
      venueForm.resetFields()
    }
  }, [open, venueForm])

  const urlRule = useMemo(
    () => ({
      validator: async (_: unknown, value: string) => {
        const v = value?.trim() ?? ''
        if (!v) return
        if (!URL_REGEX.test(v)) throw new Error(t('events.form.urlInvalid'))
      },
    }),
    [t],
  )

  async function handleCreateVenue(values: VenueCreateFormValues) {
    try {
      const created = await createLocationMutation.mutateAsync({
        venue_name: values.venue_name,
        formatted_address: values.formatted_address?.trim() ? values.formatted_address : undefined,
        maps_url: values.maps_url?.trim() ? values.maps_url : undefined,
      })
      parentForm.setFieldsValue({ location_id: created.id })
      onClose()
      message.success(t('events.form.venueCreateSuccess'))
      await refetchLocations()
    } catch {
      message.error(t('events.form.venueCreateError'))
    }
  }

  return (
    <Modal
      title={t('events.form.venueModalTitle')}
      open={open}
      onCancel={onClose}
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
  )
}
