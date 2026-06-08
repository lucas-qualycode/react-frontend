import {
  CheckCircleOutlined,
  GiftOutlined,
  HeartOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  GUEST_FLOW_PROGRESS_STEPS,
  guestFlowProgressConnectorFilled,
  guestFlowProgressStepStatus,
  guestFlowShowsProgressIndicator,
  type GuestFlowProgressCompletion,
  type GuestFlowProgressStep,
} from '../lib/guestFlowProgress'
import type { EventGuestFlowStep } from '../types'
import '../eventGuestFlowSteps.css'

const PROGRESS_STEP_LABEL_KEY: Record<GuestFlowProgressStep, string> = {
  guests: 'events.detail.guestFlow.progressStepConfirm',
  gifts: 'events.detail.guestFlow.progressStepGift',
  message: 'events.detail.guestFlow.progressStepMessage',
  finished: 'events.detail.guestFlow.progressStepFinished',
}

const PROGRESS_STEP_ICON: Record<Exclude<GuestFlowProgressStep, 'finished'>, ReactNode> = {
  guests: <TeamOutlined className="guest-flow-step-icon" aria-hidden />,
  gifts: <GiftOutlined className="guest-flow-step-icon" aria-hidden />,
  message: <MessageOutlined className="guest-flow-step-icon" aria-hidden />,
}

type Props = {
  activeStep: EventGuestFlowStep
  completion: GuestFlowProgressCompletion
}

export function GuestFlowStepIndicator({
  activeStep,
  completion,
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
            disabled
          >
            <HeartOutlined className="guest-flow-step-welcome-icon" aria-hidden />
          </button>
        </li>
        <li className="guest-flow-step-connector guest-flow-step-connector--filled" aria-hidden />
        {GUEST_FLOW_PROGRESS_STEPS.map((step, index) => {
          const status = guestFlowProgressStepStatus(step, activeStep, completion)
          const connectorFilled =
            guestFlowProgressConnectorFilled(step, activeStep, completion) &&
            index < GUEST_FLOW_PROGRESS_STEPS.length - 1
          const stepLabel = t(PROGRESS_STEP_LABEL_KEY[step])
          const isFinishedStep = step === 'finished'
          const nodeClassName = [
            'guest-flow-step-button',
            'guest-flow-step-node',
            `guest-flow-step-node--${status}`,
            isFinishedStep ? 'guest-flow-step-node--review' : '',
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
                  disabled
                >
                  {isFinishedStep ? (
                    <CheckCircleOutlined className="guest-flow-step-review-icon" aria-hidden />
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
