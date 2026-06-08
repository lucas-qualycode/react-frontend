import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createWizardProductsPath } from '@/features/events/create/createWizardSteps'
import { useEventEditContext } from '@/features/events/edit/EventEditContext'
import { EditTabShell } from '@/features/events/edit/pages/EditTabShell'
import {
  EventMerchProductEditorSection,
  type EventMerchProductEditorHandle,
} from '@/features/events/edit/pages/EditMerchProductPage'
import { useEventDirtyRegistry } from '@/features/events/shared/EventDirtyRegistryContext'

export function NewMerchProductRoutePage() {
  const navigate = useNavigate()
  const { productId } = useParams<{ productId: string }>()
  const { eventId } = useEventEditContext()
  const { setDirty, registerDiscard, unregisterDiscard } = useEventDirtyRegistry()
  const editorRef = useRef<EventMerchProductEditorHandle>(null)
  const dirtyKey = 'wizard-merch-product'

  const onNavigateBack = useCallback(() => {
    navigate(createWizardProductsPath(eventId))
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
