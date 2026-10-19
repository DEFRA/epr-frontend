import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

describe('#createServer', () => {
  describe('security headers', () => {
    it('should tell other sites where a visitor came from but never the address', async ({
      server
    }) => {
      const { headers } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    })
  })
})
