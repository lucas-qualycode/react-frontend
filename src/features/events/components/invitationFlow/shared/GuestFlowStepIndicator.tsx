import {
  CheckCircleOutlined,
  CheckOutlined,
  CreditCardOutlined,
  GiftOutlined,
  HeartOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { GuestCheckoutSnapshot } from '../lib/guestCheckoutSession'
import {
  GUEST_FLOW_PROGRESS_STEPS,
  guestFlowProgressConnectorFilled,
  guestFlowProgressStepCanNavigate,
  guestFlowProgressStepStatus,
  guestFlowShowsProgressIndicator,
  type GuestFlowProgressCompletion,
  type GuestFlowProgressStep,
} from '../lib/guestFlowProgress'
import type { EventGuestFlowStep } from '../types'
import '../eventGuestFlowSteps.css'

const PROGRESS_STEP_LABEL_KEY: Record<GuestFlowProgressStep, string> = {
  confirm: 'events.detail.guestFlow.progressStepConfirm',
  gift: 'events.detail.guestFlow.progressStepGift',
  mp_payment: 'events.detail.guestFlow.progressStepPayment',
  message: 'events.detail.guestFlow.progressStepMessage',
  review: 'events.detail.guestFlow.progressStepReview',
}

const PROGRESS_STEP_ICON: Record<Exclude<GuestFlowProgressStep, 'review'>, JSX.Element> = {
  confirm: <TeamOutlined className="guest-flow-step-icon" aria-hidden />,
  gift: <GiftOutlined className="guest-flow-step-icon" aria-hidden />,
  mp_payment: <CreditCardOutlined className="guest-flow-step-icon" aria-hidden />,
  message: <MessageOutlined className="guest-flow-step-icon" aria-hidden />,
}

type Props = {
  activeStep: EventGuestFlowStep
  checkout: GuestCheckoutSnapshot | null
  completion: GuestFlowProgressCompletion
  onWelcomeClick: () => void
  onStepClick: (step: GuestFlowProgressStep) => void
}

export function GuestFlowStepIndicator({
  activeStep,
  checkout,
  completion,
  onWelcomeClick,
  onStepClick,
}: Props) {
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
        <li className="guest-flow-step-item">
          <button
            type="button"
            className="guest-flow-step-button guest-flow-step-node guest-flow-step-node--completed guest-flow-step-node--welcome"
            aria-label={t('events.detail.guestFlow.progressStepWelcome')}
            onClick={onWelcomeClick}
          >
            <HeartOutlined className="guest-flow-step-welcome-icon" aria-hidden />
          </button>
        </li>
        <li className="guest-flow-step-connector guest-flow-step-connector--filled" aria-hidden />
        {GUEST_FLOW_PROGRESS_STEPS.map((step, index) => {
          const status = guestFlowProgressStepStatus(step, activeStep, checkout, completion)
          const connectorFilled =
            guestFlowProgressConnectorFilled(step, activeStep, checkout, completion) &&
            index < GUEST_FLOW_PROGRESS_STEPS.length - 1
          const canNavigate = guestFlowProgressStepCanNavigate(
            step,
            activeStep,
            checkout,
            completion,
          )
          const stepLabel = t(PROGRESS_STEP_LABEL_KEY[step])

          const isReviewStep = step === 'review'
          const nodeClassName = [
            'guest-flow-step-button',
            'guest-flow-step-node',
            `guest-flow-step-node--${status}`,
            isReviewStep ? 'guest-flow-step-node--review' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <Fragment key={step}>
              <li className="guest-flow-step-item">
                <button
                  type="button"
                  className={nodeClassName}
                  aria-current={status === 'current' ? 'step' : undefined}
                  aria-label={stepLabel}
                  disabled={!canNavigate}
                  onClick={() => onStepClick(step)}
                >
                  {isReviewStep ? (
                    <CheckCircleOutlined className="guest-flow-step-review-icon" aria-hidden />
                  ) : status === 'completed' ? (
                    <CheckOutlined className="guest-flow-step-check" aria-hidden />
                  ) : (
                    PROGRESS_STEP_ICON[step]
                  )}
                </button>
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
