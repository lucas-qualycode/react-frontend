import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEventDirtyRegistry } from '@/features/events/shared/EventDirtyRegistryContext'
import { eventEditTabPath } from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import {
  EventTicketEditorSection,
  type EventTicketEditorHandle,
} from './EditTicketProductPage'
import { EditTabShell } from './EditTabShell'

export function EditTicketProductRoutePage() {
  const navigate = useNavigate()
  const { ticketId } = useParams<{ ticketId: string }>()
  const { eventId } = useEventEditContext()
  const { setDirty, registerDiscard, unregisterDiscard } = useEventDirtyRegistry()
  const editorRef = useRef<EventTicketEditorHandle>(null)
  const dirtyKey = 'ticket-product'

  const onNavigateBack = useCallback(() => {
    navigate(eventEditTabPath(eventId, 'tickets'))
  }, [eventId, navigate])

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      setDirty(dirtyKey, dirty)
    },
    [setDirty],
  )

  useEffect(() => {
    registerDiscard(dirtyKey, () => {
      editorRef.current?.discardUnsavedEdits()
    })
    return () => unregisterDiscard(dirtyKey)
  }, [registerDiscard, unregisterDiscard])

  return (
    <EditTabShell showSave={false}>
      <EventTicketEditorSection
        ref={editorRef}
        eventId={eventId}
        productId={ticketId}
        onNavigateBack={onNavigateBack}
        onDirtyChange={handleDirtyChange}
      />
    </EditTabShell>
  )
}
