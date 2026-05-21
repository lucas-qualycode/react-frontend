import { CheckOutlined } from '@ant-design/icons'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { GuestCheckoutSnapshot } from './guestCheckoutSession'
import {
  GUEST_FLOW_PROGRESS_STEPS,
  guestFlowProgressStepStatus,
  guestFlowShowsProgressIndicator,
} from './guestFlowProgress'
import type { EventGuestFlowStep } from './types'
import './eventGuestFlowSteps.css'

type Props = {
  activeStep: EventGuestFlowStep
  checkout: GuestCheckoutSnapshot | null
}

export function GuestFlowStepIndicator({ activeStep, checkout }: Props) {
  const { t } = useTranslation()

  if (!guestFlowShowsProgressIndicator(activeStep)) {
    return null
  }

  return (
    <nav
      className="guest-flow-steps-wrap"
      aria-label={t('events.detail.guestFlow.progressAria')}
    >
      <ol className="guest-flow-steps">
        {GUEST_FLOW_PROGRESS_STEPS.map((step, index) => {
          const status = guestFlowProgressStepStatus(step, activeStep, checkout)
          const connectorFilled = status === 'completed' && index < GUEST_FLOW_PROGRESS_STEPS.length - 1

          return (
            <Fragment key={step}>
              <li className="guest-flow-step-item">
                <span
                  className={`guest-flow-step-node guest-flow-step-node--${status}`}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  {status === 'completed' ? (
                    <CheckOutlined className="guest-flow-step-check" aria-hidden />
                  ) : (
                    <span className="guest-flow-step-number" aria-hidden>
                      {index + 1}
                    </span>
                  )}
                </span>
              </li>
              {index < GUEST_FLOW_PROGRESS_STEPS.length - 1 ? (
                <li
                  className={`guest-flow-step-connector${connectorFilled ? ' guest-flow-step-connector--filled' : ''}`}
                  aria-hidden
                />
              ) : null}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
