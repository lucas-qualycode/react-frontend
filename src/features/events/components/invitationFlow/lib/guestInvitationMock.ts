import type { FieldDefinition, Invitation, Product, Spot } from '@/shared/types/api'

export const USE_MOCK_INVITATION = false

const MOCK_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    id: 'field-diet',
    key: 'dietary',
    label: 'Dietary restrictions',
    field_type: 'TEXT',
    active: true,
    deleted: false,
    created_at: '',
    updated_at: '',
    created_by: '',
    last_updated_by: '',
  },
  {
    id: 'field-phone',
    key: 'phone',
    label: 'Phone number',
    field_type: 'TEXT',
    active: true,
    deleted: false,
    created_at: '',
    updated_at: '',
    created_by: '',
    last_updated_by: '',
  },
  {
    id: 'field-shirt',
    key: 'shirt_size',
    label: 'T-shirt size',
    field_type: 'TEXT',
    active: true,
    deleted: false,
    created_at: '',
    updated_at: '',
    created_by: '',
    last_updated_by: '',
  },
]

const MOCK_TICKET: Product = {
  id: 'ticket-mock',
  name: 'Wedding guest',
  description: '',
  user_id: '',
  is_free: true,
  value: 0,
  quantity: 100,
  max_per_user: 5,
  active: true,
  created_at: '',
  updated_at: '',
  created_by: '',
  last_updated_by: '',
  additional_info_fields: [
    { field_id: 'field-diet', required: true, active: true, order: 0 },
    { field_id: 'field-phone', required: false, active: true, order: 1 },
    { field_id: 'field-shirt', required: false, active: true, order: 2 },
  ],
}

function mockSpots(invitationId: string, eventId: string): Spot[] {
  return [
    {
      id: 'slot-1',
      event_id: eventId,
      invitation_id: invitationId,
      name: 'Ana',
      required_field_ids: ['field-diet', 'field-phone'],
      created_at: '',
      updated_at: '',
    },
    {
      id: 'slot-2',
      event_id: eventId,
      invitation_id: invitationId,
      name: 'Bruno',
      required_field_ids: ['field-diet'],
      created_at: '',
      updated_at: '',
    },
    {
      id: 'slot-3',
      event_id: eventId,
      invitation_id: invitationId,
      name: '',
      required_field_ids: [],
      created_at: '',
      updated_at: '',
    },
  ]
}

export function getMockInvitation(eventId: string): Invitation {
  const invitationId = `invitation-mock-${eventId}`
  const spots = mockSpots(invitationId, eventId)
  return {
    id: invitationId,
    event_id: eventId,
    inviter_id: 'user-mock',
    name: 'Silva family',
    ticket_id: MOCK_TICKET.id,
    destination: '+5511999999999',
    destination_type: 'WHATSAPP',
    status: 'SENT',
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    created_at: '',
    updated_at: '',
    spot_count: spots.length,
    spots,
    wizard_step: 'welcome',
  }
}

export function getMockGuestTicket(): Product {
  return MOCK_TICKET
}

export function getMockGuestFieldDefinitions(): FieldDefinition[] {
  return MOCK_FIELD_DEFINITIONS
}

export function getMockInvitationGuestView(eventId: string) {
  const invitation = getMockInvitation(eventId)
  return {
    invitation,
    spots: (invitation.spots ?? []).map((spot) => ({
      ...spot,
      field_values: spot.field_values ?? {},
      attending: spot.attending !== false,
      status: 'PENDING',
      user_product: null,
    })),
    user_products: { tickets: [], gifts: [] },
  }
}
