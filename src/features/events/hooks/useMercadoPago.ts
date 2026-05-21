import { loadMercadoPago } from '@mercadopago/sdk-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GuestMpCardTokenResult } from '../components/eventDetail/guestMpPaymentDraft'
import type { GuestCardPaymentFormState } from '../components/eventDetail/guestMpPaymentForm'
import { cardBin, normalizeCardNumber } from '../components/eventDetail/guestMpPaymentForm'

export type MpIdentificationType = {
  id: string
  name: string
}

export type MpPaymentMethodOption = {
  id: string
  name: string
  payment_type_id: string
}

type MercadoPagoInstance = {
  createCardToken: (data: Record<string, unknown>) => Promise<{
    id?: string
    token?: string
    payment_method_id?: string
    payment_type_id?: string
  }>
  getIdentificationTypes: () => Promise<MpIdentificationType[]>
  getPaymentMethods: (params: { bin: string }) => Promise<{
    results?: MpPaymentMethodOption[]
  }>
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance
  }
}

export function useMercadoPago(locale = 'pt-BR') {
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY?.trim() ?? ''
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<MercadoPagoInstance | null>(null)

  useEffect(() => {
    if (!publicKey) {
      setIsReady(false)
      setError(null)
      instanceRef.current = null
      return
    }

    let cancelled = false

    loadMercadoPago()
      .then(() => {
        if (cancelled) return
        if (!window.MercadoPago) {
          setError('MercadoPago.js not available')
          setIsReady(false)
          instanceRef.current = null
          return
        }
        instanceRef.current = new window.MercadoPago(publicKey, { locale })
        setIsReady(true)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load MercadoPago.js')
        setIsReady(false)
        instanceRef.current = null
      })

    return () => {
      cancelled = true
      instanceRef.current = null
    }
  }, [locale, publicKey])

  const getInstance = useCallback(() => {
    if (!publicKey || !isReady) return null
    return instanceRef.current
  }, [isReady, publicKey])

  const fetchIdentificationTypes = useCallback(async (): Promise<MpIdentificationType[]> => {
    const mp = getInstance()
    if (!mp) return [{ id: 'CPF', name: 'CPF' }]
    try {
      const types = await mp.getIdentificationTypes()
      return types.length > 0 ? types : [{ id: 'CPF', name: 'CPF' }]
    } catch {
      return [{ id: 'CPF', name: 'CPF' }]
    }
  }, [getInstance])

  const fetchPaymentMethodsForBin = useCallback(
    async (cardNumber: string): Promise<MpPaymentMethodOption[]> => {
      const mp = getInstance()
      const bin = cardBin(cardNumber)
      if (!mp || bin.length < 6) return []
      try {
        const response = await mp.getPaymentMethods({ bin })
        return response.results ?? []
      } catch {
        return []
      }
    },
    [getInstance],
  )

  const createCardToken = useCallback(
    async (form: GuestCardPaymentFormState): Promise<GuestMpCardTokenResult> => {
      const mp = getInstance()
      if (!mp) {
        throw new Error('Mercado Pago is not ready')
      }

      const response = await mp.createCardToken({
        cardNumber: normalizeCardNumber(form.cardNumber),
        cardholderName: form.cardholderName.trim(),
        identificationType: form.identificationType,
        identificationNumber: form.identificationNumber.replace(/\D/g, ''),
        securityCode: form.securityCode.trim(),
        cardExpirationMonth: form.expirationMonth,
        cardExpirationYear: form.expirationYear,
      })

      const token = response.id ?? response.token
      if (!token) {
        throw new Error('Card token was not returned')
      }

      return {
        token,
        paymentMethodId: response.payment_method_id ?? form.paymentMethodId,
        paymentTypeId: response.payment_type_id ?? 'credit_card',
      }
    },
    [getInstance],
  )

  return {
    publicKey,
    isConfigured: publicKey.length > 0,
    isReady,
    error,
    getInstance,
    fetchIdentificationTypes,
    fetchPaymentMethodsForBin,
    createCardToken,
  }
}
