import { EventManageListSection } from '../sections/EventManageListSection'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

export function EditInvitationsPage() {
  const { eventId } = useEventEditContext()

  return (
    <EditTabShell showSave={false}>
      <EventManageListSection eventId={eventId} variant="invitation" />
    </EditTabShell>
  )
}
