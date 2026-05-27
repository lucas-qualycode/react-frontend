import { afterEach, describe, expect, it } from 'vitest'
import type { FieldDefinition } from '@/shared/types/api'
import {
  clearFieldDefinitionsCache,
  readFieldDefinitionsCache,
  writeFieldDefinitionsCache,
} from '@/shared/api/fieldDefinitionsCache'

const sample: FieldDefinition[] = [
  {
    id: 'fd-1',
    key: 'email',
    label: 'Email',
    field_type: 'text',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

afterEach(() => {
  clearFieldDefinitionsCache()
})

describe('fieldDefinitionsCache', () => {
  it('returns undefined when empty', () => {
    expect(readFieldDefinitionsCache()).toBeUndefined()
  })

  it('round-trips definitions', () => {
    writeFieldDefinitionsCache(sample)
    const cached = readFieldDefinitionsCache()
    expect(cached?.data).toEqual(sample)
    expect(typeof cached?.fetchedAt).toBe('number')
  })

  it('clears invalid cache entries', () => {
    localStorage.setItem('partiiu:fieldDefinitions:v1', '{"nope":true}')
    expect(readFieldDefinitionsCache()).toBeUndefined()
    expect(localStorage.getItem('partiiu:fieldDefinitions:v1')).toBeNull()
  })
})
