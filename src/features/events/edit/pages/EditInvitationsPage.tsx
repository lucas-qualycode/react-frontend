import { EventInvitationsSection } from '../sections/EventInvitationsSection'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

export function EditInvitationsPage() {
  const { eventId } = useEventEditContext()

  return (
    <EditTabShell showSave={false}>
      <EventInvitationsSection eventId={eventId} />
    </EditTabShell>
  )
}
