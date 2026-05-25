import type { CSSProperties } from 'react'
import type { EventGuestFlowStep } from '../types'

export const GUEST_FLOW_CONTENT_PANEL_STEPS: EventGuestFlowStep[] = [
  'confirm',
  'gift',
  'mp_payment',
  'message',
]

export function guestFlowStepUsesContentPanel(step: EventGuestFlowStep) {
  return GUEST_FLOW_CONTENT_PANEL_STEPS.includes(step)
}

export function guestFlowStepUsesStableContentPanel(step: EventGuestFlowStep) {
  return guestFlowStepUsesContentPanel(step) && step !== 'confirm'
}

export const guestPanelShellStyle: CSSProperties = {
  width: '100%',
  marginLeft: 'calc(50% - 50vw)',
  marginRight: 'calc(50% - 50vw)',
}

export const guestPanelShellClassName = 'guest-panel-shell'

export const guestPanelContentStyle: CSSProperties = {
  width: 'min(78ch, 100%)',
  maxWidth: '100%',
  marginInline: 'auto',
  boxSizing: 'border-box',
}
