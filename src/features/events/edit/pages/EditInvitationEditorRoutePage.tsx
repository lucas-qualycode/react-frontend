import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEventDirtyRegistry } from '@/features/events/shared/EventDirtyRegistryContext'
import { eventEditTabPath } from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import {
  EventInvitationCreateSection,
  type EventInvitationEditorHandle,
} from './EditInvitationEditorPage'
import { EditTabShell } from './EditTabShell'

export function EditInvitationEditorRoutePage() {
  const navigate = useNavigate()
  const { invitationId } = useParams<{ invitationId?: string }>()
  const { eventId } = useEventEditContext()
  const { setDirty, registerDiscard, unregisterDiscard } = useEventDirtyRegistry()
  const editorRef = useRef<EventInvitationEditorHandle>(null)
  const dirtyKey = 'invitation-editor'
  const isCreate = !invitationId

  const onNavigateBack = useCallback(() => {
    navigate(eventEditTabPath(eventId, 'invitations'))
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
