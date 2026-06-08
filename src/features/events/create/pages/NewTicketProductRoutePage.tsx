import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createWizardTicketsPath } from '@/features/events/create/createWizardSteps'
import { useEventEditContext } from '@/features/events/edit/EventEditContext'
import { EditTabShell } from '@/features/events/edit/pages/EditTabShell'
import {
  EventTicketEditorSection,
  type EventTicketEditorHandle,
} from '@/features/events/edit/pages/EditTicketProductPage'
import { useEventDirtyRegistry } from '@/features/events/shared/EventDirtyRegistryContext'

export function NewTicketProductRoutePage() {
  const navigate = useNavigate()
  const { productId } = useParams<{ productId: string }>()
  const { eventId } = useEventEditContext()
  const { setDirty, registerDiscard, unregisterDiscard } = useEventDirtyRegistry()
  const editorRef = useRef<EventTicketEditorHandle>(null)
  const dirtyKey = 'wizard-ticket-product'

  const onNavigateBack = useCallback(() => {
    navigate(createWizardTicketsPath(eventId))
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
        productId={productId}
        onNavigateBack={onNavigateBack}
        onDirtyChange={handleDirtyChange}
      />
    </EditTabShell>
  )
}
