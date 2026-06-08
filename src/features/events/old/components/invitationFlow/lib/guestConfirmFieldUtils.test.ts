import { describe, expect, it } from 'vitest'
import type { FieldDefinition } from '@/shared/types/api'
import {
  formatBirthDateInput,
  formatCpfInput,
  formatPhoneInput,
  getGuestFieldValidationErrorKey,
  isValidBirthDate,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  resolveGuestFieldKind,
} from './guestConfirmFieldUtils'

function def(partial: Partial<FieldDefinition> & Pick<FieldDefinition, 'id' | 'key' | 'label'>): FieldDefinition {
  return {
    field_type: 'text',
    active: true,
    deleted: false,
    created_at: '',
    updated_at: '',
    ...partial,
  }
}

describe('guestConfirmFieldUtils', () => {
  it('formats cpf with mask', () => {
    expect(formatCpfInput('12345678901')).toBe('123.456.789-01')
  })

  it('formats phone with mask', () => {
    expect(formatPhoneInput('11987654321')).toBe('(11) 98765-4321')
  })

  it('formats birth date with slashes', () => {
    expect(formatBirthDateInput('15051990')).toBe('15/05/1990')
  })

  it('validates cpf check digits', () => {
    expect(isValidCpf('390.533.447-05')).toBe(true)
    expect(isValidCpf('123.456.789-00')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })

  it('validates email phone and birth date', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('bad')).toBe(false)
    expect(isValidPhone('11987654321')).toBe(true)
    expect(isValidPhone('123')).toBe(false)
    expect(isValidBirthDate('31/12/2020')).toBe(true)
    expect(isValidBirthDate('31/12/2099')).toBe(false)
    expect(isValidBirthDate('31/02/2020')).toBe(false)
  })

  it('resolves field kinds from key or format', () => {
    expect(resolveGuestFieldKind(def({ id: '1', key: 'cpf', label: 'CPF', format: 'cpf' }))).toBe('cpf')
    expect(resolveGuestFieldKind(def({ id: '2', key: 'age', label: 'Age', field_type: 'number' }))).toBe('age')
    expect(
      resolveGuestFieldKind(def({ id: '3', key: 'birth_date', label: 'Birth', format: 'birth_date' })),
    ).toBe('birth_date')
  })

  it('returns validation error keys', () => {
    const cpf = def({ id: '1', key: 'cpf', label: 'CPF', format: 'cpf' })
    expect(getGuestFieldValidationErrorKey(cpf, '')).toBe('required')
    expect(getGuestFieldValidationErrorKey(cpf, '123')).toBe('cpfInvalid')
    expect(getGuestFieldValidationErrorKey(cpf, '390.533.447-05')).toBe(null)
  })
})
