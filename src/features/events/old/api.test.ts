import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listTags, listUserEvents, createTag, listLocations, createLocation } from './api'
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

  it('builds listTags query string', async () => {
    fetchApiMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response)

    await listTags({ active: true, deleted: false, applies_to: 'EVENT' })

    expect(fetchApiMock).toHaveBeenCalledWith('tags?active=true&deleted=false&applies_to=EVENT')
  })

  it('builds listLocations query string', async () => {
    fetchApiMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response)

    await listLocations()

    expect(fetchApiMock).toHaveBeenCalledWith('locations?deleted=false')
  })

  it('posts createLocation with trimmed fields only', async () => {
    fetchApiMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'loc-1', venue_name: 'Hall', deleted: false }),
    } as unknown as Response)

    await createLocation({ venue_name: 'Hall', formatted_address: ' 123 St ', maps_url: 'https://maps.example/x' })

    expect(fetchApiMock).toHaveBeenCalledWith('locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"venue_name":"Hall","formatted_address":"123 St","maps_url":"https://maps.example/x"}',
    })
  })

  it('posts createTag payload', async () => {
    fetchApiMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'tag-1',
        name: 'Wedding',
        applies_to: ['EVENT'],
        active: true,
        deleted: false,
      }),
    } as unknown as Response)

    await createTag({ name: 'Wedding', description: 'Big day', active: true, applies_to: ['EVENT'] })

    expect(fetchApiMock).toHaveBeenCalledWith('tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Wedding","description":"Big day","active":true,"applies_to":["EVENT"]}',
    })
  })
})
