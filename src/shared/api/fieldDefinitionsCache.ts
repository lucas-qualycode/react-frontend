import type { FieldDefinition } from '@/shared/types/api'

const STORAGE_KEY = 'partiiu:fieldDefinitions:v1'
export const FIELD_DEFINITIONS_STALE_MS = 24 * 60 * 60 * 1000
export const FIELD_DEFINITIONS_GC_MS = 7 * 24 * 60 * 60 * 1000

type FieldDefinitionsCacheEntry = {
  fetchedAt: number
  data: FieldDefinition[]
}

export type FieldDefinitionsCacheSnapshot = FieldDefinitionsCacheEntry

function isValidEntry(value: unknown): value is FieldDefinitionsCacheEntry {
  if (!value || typeof value !== 'object') return false
  const row = value as FieldDefinitionsCacheEntry
  return (
    typeof row.fetchedAt === 'number' &&
    Number.isFinite(row.fetchedAt) &&
    Array.isArray(row.data)
  )
}

export function readFieldDefinitionsCache(): FieldDefinitionsCacheSnapshot | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    if (!isValidEntry(parsed)) {
      localStorage.removeItem(STORAGE_KEY)
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

export function writeFieldDefinitionsCache(data: FieldDefinition[]): void {
  const entry: FieldDefinitionsCacheEntry = {
    fetchedAt: Date.now(),
    data,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {
    // ignore quota / private mode
  }
}

export function clearFieldDefinitionsCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
