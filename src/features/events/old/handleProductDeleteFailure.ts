import { Modal, message } from 'antd'
import type { TFunction } from 'i18next'

export const PRODUCT_DELETE_BLOCKED_DETAIL = 'PRODUCT_HAS_INVITATIONS'

export function handleProductDeleteFailure(e: unknown, t: TFunction): void {
  const msg = e instanceof Error ? e.message : ''
  if (msg === PRODUCT_DELETE_BLOCKED_DETAIL) {
    Modal.error({
      title: t('events.tickets.deleteBlockedTitle'),
      content: t('events.tickets.deleteBlockedBody'),
    })
    return
  }
  if (e instanceof Error && e.message) message.error(e.message)
}
