import { useQuery } from '@tanstack/react-query'
import { Empty, Flex, Grid, Spin, Typography } from 'antd'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { formatGuestDisplayName } from '@/features/events/components/invitationFlow/lib/guestConfirmFieldUtils'
import { listEventUserProducts } from '@/features/events/api'
import type { FieldDefinition, Invitation, Spot } from '@/shared/types/api'
import { useEventInvitations, useFieldDefinitions } from '@/features/events/hooks'
import { ListFilterToolbar } from '../components/ListFilterToolbar'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

const { Text, Title } = Typography
const ALL = '__all__'
const ATTENDING_YES = 'yes'
const ATTENDING_NO = 'no'
const ATTENDING_PENDING = 'pending'
const CONFIRMED_YES = 'yes'
const CONFIRMED_NO = 'no'

type GuestRow = Spot & {
  invitationId: string
  invitationName: string
  hasTicket: boolean
}

type ListColumnDef<T> = {
  key: string
  title: string
  flex: string
  render: (item: T) => ReactNode
}

function invitationLabel(inv: Invitation): string {
  const namePart = (inv.name ?? '').trim()
  const destPart = (inv.destination ?? '').trim()
  return namePart || destPart || inv.id
}

function guestDisplayName(spot: Spot, fieldDefinitions: FieldDefinition[]): string {
  return formatGuestDisplayName(spot.name, spot.field_values, fieldDefinitions)
}

function attendingKey(row: GuestRow): string {
  if (row.attending === true) return ATTENDING_YES
  if (row.attending === false) return ATTENDING_NO
  return ATTENDING_PENDING
}

function GuestColumnList({
  rows,
  tp,
  fieldDefinitions,
}: {
  rows: GuestRow[]
  tp: (key: string) => string
  fieldDefinitions: FieldDefinition[]
}) {
  const columns = useMemo(
    (): ListColumnDef<GuestRow>[] => [
      {
        key: 'name',
        title: tp('guestsColName'),
        flex: '2 1 140px',
        render: (row) => <Text ellipsis>{guestDisplayName(row, fieldDefinitions)}</Text>,
      },
      {
        key: 'invitation',
        title: tp('guestsColInvitation'),
        flex: '2 1 140px',
        render: (row) => <Text ellipsis>{row.invitationName}</Text>,
      },
      {
        key: 'attending',
        title: tp('guestsColAttending'),
        flex: '1 1 100px',
        render: (row) => {
          if (row.attending === true) return tp('guestsAttendingYes')
          if (row.attending === false) return tp('guestsAttendingNo')
          return tp('guestsAttendingPending')
        },
      },
      {
        key: 'confirmed',
        title: tp('guestsColConfirmed'),
        flex: '0 1 88px',
        render: (row) => (row.hasTicket ? tp('guestsConfirmedYes') : tp('guestsConfirmedNo')),
      },
    ],
    [fieldDefinitions, tp],
  )

  return (
    <Flex vertical gap={0} style={{ width: '100%' }}>
      <Flex
        align="center"
        gap={8}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {columns.map((col) => (
          <div key={col.key} style={{ flex: col.flex, minWidth: 0 }}>
            {col.title}
          </div>
        ))}
      </Flex>
      {rows.map((row) => (
        <Flex
          key={row.id}
          align="center"
          gap={8}
          style={{
            width: '100%',
            padding: '12px',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          {columns.map((col) => (
            <div key={col.key} style={{ flex: col.flex, minWidth: 0 }}>
              {col.render(row)}
            </div>
          ))}
        </Flex>
      ))}
    </Flex>
  )
}

function GuestCards({
  rows,
  tp,
  fieldDefinitions,
}: {
  rows: GuestRow[]
  tp: (key: string) => string
  fieldDefinitions: FieldDefinition[]
}) {
  return (
    <Flex vertical gap={12}>
      {rows.map((row) => (
        <Flex
          key={row.id}
          vertical
          gap={4}
          style={{
            padding: 16,
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Text strong>{guestDisplayName(row, fieldDefinitions)}</Text>
          <Text type="secondary">
            {tp('guestsColInvitation')}: {row.invitationName}
          </Text>
          <Text type="secondary">
            {tp('guestsColAttending')}:{' '}
            {row.attending === true
              ? tp('guestsAttendingYes')
              : row.attending === false
                ? tp('guestsAttendingNo')
                : tp('guestsAttendingPending')}
          </Text>
          <Text type="secondary">
            {tp('guestsColConfirmed')}:{' '}
            {row.hasTicket ? tp('guestsConfirmedYes') : tp('guestsConfirmedNo')}
          </Text>
        </Flex>
      ))}
    </Flex>
  )
}

export function EditInvitationGuestsPage() {
  const { t } = useTranslation()
  const { eventId } = useEventEditContext()
  const screens = Grid.useBreakpoint()
  const useCardLayout = screens.md === false
  const tp = (key: string) => t(`events.invitations.${key}`)
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: invitations = [], isLoading: invitationsLoading } = useEventInvitations(eventId)
  const { data: fieldDefinitions = [] } = useFieldDefinitions(true)
  const { data: userProducts = [], isLoading: userProductsLoading } = useQuery({
    queryKey: ['eventUserProducts', eventId, 'guests'],
    queryFn: () => listEventUserProducts(eventId!),
    enabled: !!eventId,
    staleTime: 30_000,
  })

  const spotIdsWithTicket = useMemo(() => {
    const ids = new Set<string>()
    for (const item of userProducts) {
      if (item.status === 'ACTIVE' && item.spot_id) ids.add(item.spot_id)
    }
    return ids
  }, [userProducts])

  const allRows = useMemo((): GuestRow[] => {
    const out: GuestRow[] = []
    for (const inv of invitations) {
      const invitationName = invitationLabel(inv)
      for (const spot of inv.spots ?? []) {
        out.push({
          ...spot,
          invitationId: inv.id,
          invitationName,
          hasTicket: spotIdsWithTicket.has(spot.id),
        })
      }
    }
    return out.sort((a, b) => {
      const byInvitation = a.invitationName.localeCompare(b.invitationName)
      if (byInvitation !== 0) return byInvitation
      return guestDisplayName(a, fieldDefinitions).localeCompare(
        guestDisplayName(b, fieldDefinitions),
      )
    })
  }, [fieldDefinitions, invitations, spotIdsWithTicket])

  const invitationFilter = useMemo(() => {
    const fromUrl = searchParams.get('invitation')
    if (!fromUrl) return ALL
    if (invitations.length === 0) return fromUrl
    return invitations.some((inv) => inv.id === fromUrl) ? fromUrl : ALL
  }, [invitations, searchParams])

  const attendingFilter = useMemo(() => {
    const fromUrl = searchParams.get('attending')
    if (
      fromUrl === ATTENDING_YES ||
      fromUrl === ATTENDING_NO ||
      fromUrl === ATTENDING_PENDING
    ) {
      return fromUrl
    }
    return ALL
  }, [searchParams])

  const confirmedFilter = useMemo(() => {
    const fromUrl = searchParams.get('confirmed')
    if (fromUrl === CONFIRMED_YES || fromUrl === CONFIRMED_NO) return fromUrl
    return ALL
  }, [searchParams])

  const invitationFilterOptions = useMemo(
    () => [
      { value: ALL, label: tp('guestsFilterAll') },
      ...invitations.map((inv) => ({ value: inv.id, label: invitationLabel(inv) })),
    ],
    [invitations, tp],
  )

  const attendingFilterOptions = useMemo(
    () => [
      { value: ALL, label: tp('guestsFilterAll') },
      { value: ATTENDING_YES, label: tp('guestsAttendingYes') },
      { value: ATTENDING_NO, label: tp('guestsAttendingNo') },
      { value: ATTENDING_PENDING, label: tp('guestsAttendingPending') },
    ],
    [tp],
  )

  const confirmedFilterOptions = useMemo(
    () => [
      { value: ALL, label: tp('guestsFilterAll') },
      { value: CONFIRMED_YES, label: tp('guestsConfirmedYes') },
      { value: CONFIRMED_NO, label: tp('guestsConfirmedNo') },
    ],
    [tp],
  )

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (invitationFilter !== ALL && row.invitationId !== invitationFilter) return false
      if (attendingFilter !== ALL && attendingKey(row) !== attendingFilter) return false
      if (confirmedFilter === CONFIRMED_YES && !row.hasTicket) return false
      if (confirmedFilter === CONFIRMED_NO && row.hasTicket) return false
      return true
    })
  }, [allRows, invitationFilter, attendingFilter, confirmedFilter])

  const updateSearchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === ALL) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  const guestsFilterFields = useMemo(
    () => [
      {
        key: 'invitation',
        label: tp('guestsFilterInvitation'),
        value: invitationFilter,
        options: invitationFilterOptions,
        onChange: (value: string) => updateSearchParams({ invitation: value }),
        loading: invitationsLoading,
      },
      {
        key: 'attending',
        label: tp('guestsFilterAttending'),
        value: attendingFilter,
        options: attendingFilterOptions,
        onChange: (value: string) => updateSearchParams({ attending: value }),
      },
      {
        key: 'confirmed',
        label: tp('guestsFilterConfirmed'),
        value: confirmedFilter,
        options: confirmedFilterOptions,
        onChange: (value: string) => updateSearchParams({ confirmed: value }),
      },
    ],
    [
      attendingFilter,
      attendingFilterOptions,
      confirmedFilter,
      confirmedFilterOptions,
      invitationFilter,
      invitationFilterOptions,
      invitationsLoading,
      tp,
    ],
  )

  const guestsFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (invitationFilter !== ALL) {
      const label =
        invitationFilterOptions.find((option) => option.value === invitationFilter)?.label ??
        invitationFilter
      chips.push({
        key: 'invitation',
        label: `${tp('guestsFilterInvitation')}: ${label}`,
        onRemove: () => updateSearchParams({ invitation: null }),
      })
    }
    if (attendingFilter !== ALL) {
      const label =
        attendingFilterOptions.find((option) => option.value === attendingFilter)?.label ??
        attendingFilter
      chips.push({
        key: 'attending',
        label: `${tp('guestsFilterAttending')}: ${label}`,
        onRemove: () => updateSearchParams({ attending: null }),
      })
    }
    if (confirmedFilter !== ALL) {
      const label =
        confirmedFilterOptions.find((option) => option.value === confirmedFilter)?.label ??
        confirmedFilter
      chips.push({
        key: 'confirmed',
        label: `${tp('guestsFilterConfirmed')}: ${label}`,
        onRemove: () => updateSearchParams({ confirmed: null }),
      })
    }
    return chips
  }, [
    attendingFilter,
    attendingFilterOptions,
    confirmedFilter,
    confirmedFilterOptions,
    invitationFilter,
    invitationFilterOptions,
    tp,
  ])

  const loading = invitationsLoading || userProductsLoading

  return (
    <EditTabShell showSave={false}>
      <Flex vertical gap={16}>
        <div>
          <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {tp('guestsSectionTitle')}
          </Title>
          <Text type="secondary">{tp('guestsSectionIntro')}</Text>
        </div>
        <ListFilterToolbar
          buttonLabel={tp('guestsFilterButton')}
          clearAllLabel={tp('guestsFilterClearAll')}
          fields={guestsFilterFields}
          chips={guestsFilterChips}
          onClearAll={() =>
            updateSearchParams({ invitation: null, attending: null, confirmed: null })
          }
        />
        {loading ? (
          <Spin />
        ) : allRows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tp('guestsEmpty')} />
        ) : filteredRows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tp('guestsFilterEmpty')} />
        ) : useCardLayout ? (
          <GuestCards rows={filteredRows} tp={tp} fieldDefinitions={fieldDefinitions} />
        ) : (
          <GuestColumnList rows={filteredRows} tp={tp} fieldDefinitions={fieldDefinitions} />
        )}
      </Flex>
    </EditTabShell>
  )
}
