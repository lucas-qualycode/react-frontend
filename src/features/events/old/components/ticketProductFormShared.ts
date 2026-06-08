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

export function snapshotMerchProductEditorForDirty(v: ProductEditorFormValues): string {
  const price =
    v.is_free === true
      ? null
      : typeof v.price_reais === 'number' && !Number.isNaN(v.price_reais)
        ? v.price_reais
        : null
  return JSON.stringify({
    name: (v.name ?? '').trim(),
    description: (v.description ?? '').trim(),
    imageURL: (v.imageURL ?? '').trim(),
    is_free: Boolean(v.is_free),
    price_reais: price,
    quantity:
      typeof v.quantity === 'number' && !Number.isNaN(v.quantity) ? v.quantity : 1,
    max_per_user:
      typeof v.max_per_user === 'number' && !Number.isNaN(v.max_per_user)
        ? v.max_per_user
        : 1,
    active: Boolean(v.active),
    tag_ids: [...(v.tag_ids ?? [])].sort(),
    fulfillment_type: v.fulfillment_type ?? null,
  })
}

export function baselineMerchSnapshotFromProduct(p: Product): string {
  return snapshotMerchProductEditorForDirty({
    name: p.name,
    description: p.description,
    imageURL: p.imageURL ?? '',
    is_free: p.is_free,
    price_reais: p.is_free ? null : p.value / 100,
    quantity: p.quantity,
    max_per_user: p.max_per_user,
    active: p.active,
    tag_ids: (p.tags ?? []).map((x) => x.id),
    fulfillment_type: p.fulfillment_type ?? undefined,
  })
}

export function snapshotTicketProductEditorForDirty(v: ProductEditorFormValues): string {
  const rows = (v.additional_info_fields ?? [])
    .filter((r) => r?.field_id?.trim())
    .map((r, index) => ({
      field_id: String(r.field_id).trim(),
      required: Boolean(r.required),
      order: index,
    }))
  return JSON.stringify({
    ...JSON.parse(snapshotMerchProductEditorForDirty(v)),
    additional_info_fields: rows,
  })
}

export function baselineTicketSnapshotFromProduct(p: Product, forceFree: boolean): string {
  const rows = orderedAdditionalInfoFieldsFromRefs(p.additional_info_fields)
  return snapshotTicketProductEditorForDirty({
    name: p.name,
    description: p.description,
    imageURL: p.imageURL ?? '',
    is_free: forceFree ? true : p.is_free,
    price_reais: forceFree ? null : p.is_free ? null : p.value / 100,
    quantity: p.quantity,
    max_per_user: p.max_per_user,
    active: p.active,
    tag_ids: (p.tags ?? []).map((x) => x.id),
    fulfillment_type: p.fulfillment_type ?? undefined,
    additional_info_fields: rows,
  })
}
