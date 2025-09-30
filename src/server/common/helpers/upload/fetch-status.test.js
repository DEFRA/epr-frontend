import { fetchStatus } from './fetch-status.js'
import fetch from 'node-fetch'

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    json: jest.fn()
  })
}))

describe('fetchStatus', () => {
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
