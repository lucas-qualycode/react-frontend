import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomePage } from '@/features/home/HomePage'

describe('App', () => {
  it('renders home', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: /home/i })).toBeInTheDocument()
  })
})
