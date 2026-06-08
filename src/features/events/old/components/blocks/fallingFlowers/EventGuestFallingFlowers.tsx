import { useMemo, type CSSProperties } from 'react'
import type { EventGuestBackgroundVariant } from '../../invitationFlow/types'
import './eventGuestFallingFlowers.css'

const PETAL_COUNT = 20

type PetalConfig = {
  leftPercent: number
  delaySec: number
  durationSec: number
  sizePx: number
  driftPx: number
  opacity: number
  spinDirection: 1 | -1
}

function buildPetalConfigs(): PetalConfig[] {
  return Array.from({ length: PETAL_COUNT }, (_, index) => {
    const seed = index + 1
    return {
      leftPercent: ((seed * 37) % 100) + (seed % 7) * 0.3,
      delaySec: (seed * 0.65) % 14,
      durationSec: 9 + (seed % 6) * 1.8,
      sizePx: 9 + (seed % 5) * 3,
      driftPx: -48 + (seed % 11) * 14,
      opacity: 0.52 + (seed % 7) * 0.05,
      spinDirection: seed % 2 === 0 ? 1 : -1,
    }
  })
}

type Props = {
  variant: EventGuestBackgroundVariant
}

export function EventGuestFallingFlowers({ variant }: Props) {
  const petals = useMemo(() => buildPetalConfigs(), [])

  if (variant !== 'wedding') return null

  return (
    <div className="guest-flow-falling-flowers" aria-hidden>
      {petals.map((petal, index) => (
        <span
          key={index}
          className="guest-flow-petal"
          style={
            {
              '--petal-left': `${petal.leftPercent}%`,
              '--petal-delay': `${petal.delaySec}s`,
              '--petal-duration': `${petal.durationSec}s`,
              '--petal-size': `${petal.sizePx}px`,
              '--petal-drift': `${petal.driftPx}px`,
              '--petal-opacity': petal.opacity,
              '--petal-spin': petal.spinDirection,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
