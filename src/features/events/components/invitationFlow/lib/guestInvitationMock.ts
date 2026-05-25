import type { FieldDefinition, Invitation, InvitationGuestSlot, Product } from '@/shared/types/api'

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

function mockGuestSlots(invitationId: string): InvitationGuestSlot[] {
  return [
    {
      id: 'slot-1',
      invitation_id: invitationId,
      first_name: 'Ana',
      required_field_ids: ['field-diet', 'field-phone'],
      status: 'PENDING',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'slot-2',
      invitation_id: invitationId,
      first_name: 'Bruno',
      required_field_ids: ['field-diet'],
      status: 'PENDING',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'slot-3',
      invitation_id: invitationId,
      first_name: '',
      required_field_ids: [],
      status: 'PENDING',
      created_at: '',
      updated_at: '',
    },
  ]
}

export function getMockInvitation(eventId: string): Invitation {
  const invitationId = `invitation-mock-${eventId}`
  const guestSlots = mockGuestSlots(invitationId)
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
    guest_slot_count: guestSlots.length,
    guest_slots: guestSlots,
  }
}

export function getMockGuestTicket(): Product {
  return MOCK_TICKET
}

export function getMockGuestFieldDefinitions(): FieldDefinition[] {
  return MOCK_FIELD_DEFINITIONS
}
