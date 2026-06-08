import { useNavigate } from 'react-router-dom'
import { EventProductsSection } from '../sections/EventProductsSection'
import {
  eventEditMerchEditPath,
  eventEditMerchNewPath,
} from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

export function EditProductsPage() {
  const navigate = useNavigate()
  const { eventId } = useEventEditContext()

  return (
    <EditTabShell showSave={false}>
      <EventProductsSection
        eventId={eventId}
        variant="merchandise"
        onMerchCreate={() => navigate(eventEditMerchNewPath(eventId))}
        onMerchEdit={(productId) => navigate(eventEditMerchEditPath(eventId, productId))}
      />
    </EditTabShell>
  )
}
