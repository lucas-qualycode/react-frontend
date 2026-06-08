import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createWizardInvitationsPath } from '@/features/events/create/createWizardSteps'
import { useEventEditContext } from '@/features/events/edit/EventEditContext'
import { EditTabShell } from '@/features/events/edit/pages/EditTabShell'
import {
  EventInvitationCreateSection,
  type EventInvitationEditorHandle,
} from '@/features/events/edit/pages/EditInvitationEditorPage'
import { useEventDirtyRegistry } from '@/features/events/shared/EventDirtyRegistryContext'

export function NewInvitationEditorRoutePage() {
  const navigate = useNavigate()
  const { invitationId } = useParams<{ invitationId?: string }>()
  const { eventId } = useEventEditContext()
  const { setDirty, registerDiscard, unregisterDiscard } = useEventDirtyRegistry()
  const editorRef = useRef<EventInvitationEditorHandle>(null)
  const dirtyKey = 'wizard-invitation-editor'
  const isCreate = !invitationId

  const onNavigateBack = useCallback(() => {
    navigate(createWizardInvitationsPath(eventId))
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
      <EventInvitationCreateSection
        ref={editorRef}
        eventId={eventId}
        invitationId={isCreate ? undefined : invitationId}
        onNavigateBack={onNavigateBack}
        onDirtyChange={handleDirtyChange}
      />
    </EditTabShell>
  )
}
