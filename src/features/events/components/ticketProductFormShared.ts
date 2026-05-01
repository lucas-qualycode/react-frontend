import type { FulfillmentType, Product } from '@/shared/types/api'

export const TICKET_PRODUCT_FIELD_STYLE = { marginBottom: 10 } as const

export const PRODUCT_EDITOR_URL_REGEX = /^https?:\/\/[^\s]+$/i

export type AdditionalInfoFieldFormItem = {
  field_id: string
  required: boolean
}

export function fieldDefinitionSelectOptionsForRow(
  base: { value: string; label: string }[],
  allRows: AdditionalInfoFieldFormItem[] | undefined,
  rowIndex: number,
) {
  const rows = allRows ?? []
  const taken = new Set<string>()
  rows.forEach((row, i) => {
    if (i === rowIndex) return
    const id = typeof row?.field_id === 'string' ? row.field_id.trim() : ''
    if (id) taken.add(id)
  })
  const current = typeof rows[rowIndex]?.field_id === 'string' ? rows[rowIndex].field_id.trim() : ''
  return base.filter((o) => !taken.has(o.value) || o.value === current)
}

export function orderedAdditionalInfoFieldsFromRefs(
  refs: Product['additional_info_fields'] | undefined,
): AdditionalInfoFieldFormItem[] {
  if (!refs?.length) return []
  return [...refs]
    .filter((r) => r.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((r) => ({
      field_id: r.field_id,
      required: r.required ?? false,
    }))
}

export type ProductEditorFormValues = {
  name: string
  description: string
  imageURL: string
  is_free: boolean
  price_reais: number | null
  quantity: number
  max_per_user: number
  active: boolean
  tag_ids: string[]
  fulfillment_type?: FulfillmentType | null
  additional_info_fields?: AdditionalInfoFieldFormItem[]
}
