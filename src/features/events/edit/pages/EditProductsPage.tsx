import { useNavigate } from 'react-router-dom'
import { EventManageListSection } from '../sections/EventManageListSection'
import {
  eventEditMerchEditPath,
  eventEditMerchNewPath,
  eventEditMerchSalesPath,
} from '../eventEditTabs'
import { useEventEditContext } from '../EventEditContext'
import { EditTabShell } from './EditTabShell'

export function EditProductsPage() {
  const navigate = useNavigate()
  const { eventId } = useEventEditContext()

  return (
    <EditTabShell showSave={false}>
      <EventManageListSection
        eventId={eventId}
        variant="merchandise"
        onMerchCreate={() => navigate(eventEditMerchNewPath(eventId))}
        onMerchEdit={(productId) => navigate(eventEditMerchEditPath(eventId, productId))}
        onMerchViewSales={(productId) =>
          navigate(eventEditMerchSalesPath(eventId, { productId }))
        }
      />
    </EditTabShell>
  )
}
