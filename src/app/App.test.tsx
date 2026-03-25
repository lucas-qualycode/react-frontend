import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomePage } from '@/features/home/HomePage'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/app/auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('App', () => {
  it('renders home', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('heading', {
        name: 'Your wedding celebration, organized in one place',
      })
    ).toBeInTheDocument()
  })
})
