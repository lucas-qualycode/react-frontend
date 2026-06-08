import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEventDirtyRegistry } from '@/features/events/shared/EventDirtyRegistryContext'
import { eventEditTabPath } from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import {
  EventMerchProductEditorSection,
  type EventMerchProductEditorHandle,
} from './EditMerchProductPage'
import { EditTabShell } from './EditTabShell'

export function EditMerchProductRoutePage() {
  const navigate = useNavigate()
  const { productId } = useParams<{ productId: string }>()
  const { eventId } = useEventEditContext()
  const { setDirty, registerDiscard, unregisterDiscard } = useEventDirtyRegistry()
  const editorRef = useRef<EventMerchProductEditorHandle>(null)
  const dirtyKey = 'merch-product'

  const onNavigateBack = useCallback(() => {
    navigate(eventEditTabPath(eventId, 'products'))
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
      <EventMerchProductEditorSection
        ref={editorRef}
        eventId={eventId}
        productId={productId}
        onNavigateBack={onNavigateBack}
        onDirtyChange={handleDirtyChange}
      />
    </EditTabShell>
  )
}
