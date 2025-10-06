import fetch from 'node-fetch'
import { describe, expect, test, vi } from 'vitest'
import { fetchStatus } from './fetch-status.js'

vi.mock(import('node-fetch'), () => ({
  default: vi.fn().mockResolvedValue({
    json: vi.fn()
  })
}))

describe(fetchStatus, () => {
  test('should call fetch', async () => {
    const id = 'abc123'
    await fetchStatus(id)

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(new RegExp(`/status/${id}$`)),
      expect.any(Object)
    )
  })
})
