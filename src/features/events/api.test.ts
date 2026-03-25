import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listEventTypes, listUserEvents, createEventType } from './api'
import { fetchApi } from '@/shared/api/client'

vi.mock('@/shared/api/client', () => ({
  fetchApi: vi.fn(),
}))

const fetchApiMock = vi.mocked(fetchApi)

describe('features/events/api', () => {
  beforeEach(() => {
    fetchApiMock.mockReset()
  })

  it('builds listUserEvents query string', async () => {
    fetchApiMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response)

    await listUserEvents('user-1')

    expect(fetchApiMock).toHaveBeenCalledWith('events?created_by=user-1&deleted=false')
  })

  it('builds listEventTypes query string', async () => {
    fetchApiMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response)

    await listEventTypes({ active: true, deleted: false })

    expect(fetchApiMock).toHaveBeenCalledWith('event-types?active=true&deleted=false')
  })

  it('posts createEventType payload', async () => {
    fetchApiMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'type-1',
        name: 'Wedding',
        active: true,
        deleted: false,
      }),
    } as unknown as Response)

    await createEventType({ name: 'Wedding', description: 'Big day', active: true })

    expect(fetchApiMock).toHaveBeenCalledWith('event-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Wedding","description":"Big day","active":true}',
    })
  })
})

