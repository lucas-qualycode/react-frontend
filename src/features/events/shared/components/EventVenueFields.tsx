import { useState } from 'react'
import { Button, Form, Radio, Select, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCreateLocation, useLocations } from '@/features/events/hooks'
import { FIELD_ITEM_STYLE, selectLabelForLocation } from '@/features/events/shared/eventFormUtils'
import type { EventFormValues } from '@/features/events/shared/eventFormTypes'
import { EventVenueCreateModal } from './EventVenueCreateModal'

export function EventVenueFields() {
  const { t } = useTranslation()
  const form = Form.useFormInstance<EventFormValues>()
  const [venueModalOpen, setVenueModalOpen] = useState(false)
  const { data: locations = [], isLoading: locationsLoading, refetch: refetchLocations } = useLocations()
  const createLocationMutation = useCreateLocation()
  const isOnlineWatched = Form.useWatch('is_online', form) as boolean | undefined

  return (
    <>
      <Form.Item style={FIELD_ITEM_STYLE} name="is_online" label={t('events.form.onlineLabel')}>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: t('events.form.onlineOptionOnline'), value: true },
            { label: t('events.form.onlineOptionInPerson'), value: false },
          ]}
        />
      </Form.Item>
      {isOnlineWatched === true ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('events.form.venueOnlineHint')}
        </Typography.Text>
      ) : null}
      {isOnlineWatched !== true ? (
        <>
          <Form.Item
            style={FIELD_ITEM_STYLE}
            name="location_id"
            label={t('events.form.savedVenueLabel')}
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
            />
          </Form.Item>
          <Button
            type="default"
            onClick={() => setVenueModalOpen(true)}
            disabled={createLocationMutation.isPending}
            style={{ marginBottom: 10 }}
          >
            {t('events.form.addVenueButton')}
          </Button>
        </>
      ) : null}
      <EventVenueCreateModal open={venueModalOpen} onClose={() => setVenueModalOpen(false)} />
    </>
  )
}
