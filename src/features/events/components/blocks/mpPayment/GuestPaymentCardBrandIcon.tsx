import type { CardBrand } from './guestCardBrand'

type Props = {
  brand: CardBrand
  className?: string
  'aria-label'?: string
}

export function GuestPaymentCardBrandIcon({ brand, className, 'aria-label': ariaLabel }: Props) {
  if (brand === 'unknown') return null

  const label = ariaLabel ?? brand

  switch (brand) {
    case 'visa':
      return (
        <svg
          className={className}
          viewBox="0 0 60 20"
          aria-label={label}
          role="img"
          xmlns="http://www.w3.org/2000/svg"
        >
          <text
            x="30"
            y="15"
            textAnchor="middle"
            fill="currentColor"
            fontSize="14"
            fontWeight="700"
            fontStyle="italic"
            fontFamily="system-ui, sans-serif"
            letterSpacing="0.12em"
          >
            VISA
          </text>
        </svg>
      )
    case 'mastercard':
      return (
        <svg
          className={className}
          viewBox="0 0 40 24"
          aria-label={label}
          role="img"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="14" cy="12" r="9" fill="#EB001B" />
          <circle cx="26" cy="12" r="9" fill="#F79E1B" />
          <path
            fill="#FF5F00"
            d="M20 6.8a9 9 0 0 1 0 10.4 9 9 0 0 1 0-10.4z"
          />
        </svg>
      )
    case 'amex':
      return (
        <svg
          className={className}
          viewBox="0 0 72 24"
          aria-label={label}
          role="img"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="72" height="24" rx="4" fill="#006FCF" />
          <text
            x="36"
            y="16.5"
            textAnchor="middle"
            fill="#fff"
            fontSize="11.5"
            fontWeight="800"
            fontFamily="Arial, Helvetica, sans-serif"
            letterSpacing="0.22em"
          >
            AMEX
          </text>
        </svg>
      )
    case 'elo':
      return (
        <svg
          className={className}
          viewBox="0 0 52 20"
          aria-label={label}
          role="img"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="14" cy="10" r="9" fill="#FFCB05" />
          <circle cx="26" cy="10" r="9" fill="#EF4123" />
          <circle cx="38" cy="10" r="9" fill="#00A4E0" />
        </svg>
      )
    case 'hipercard':
      return (
        <svg
          className={className}
          viewBox="0 0 56 16"
          aria-label={label}
          role="img"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="56" height="16" rx="3" fill="#B3131B" />
          <text
            x="28"
            y="11"
            textAnchor="middle"
            fill="#fff"
            fontSize="6.5"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            Hipercard
          </text>
        </svg>
      )
    case 'diners':
      return (
        <svg
          className={className}
          viewBox="0 0 48 20"
          aria-label={label}
          role="img"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="32" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <text
            x="24"
            y="18"
            textAnchor="middle"
            fill="currentColor"
            fontSize="5"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            DINERS
          </text>
        </svg>
      )
    default:
      return null
  }
}
