import { statusCodes } from '#server/common/constants/status-codes.js'
import { describe, expect } from 'vitest'
import { it } from '#vite/fixtures/server.js'

describe('#serveStaticFiles', () => {
  describe('when secure context is disabled', () => {
    it('should serve favicon as expected', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/favicon.ico'
      })

      expect(statusCode).toBe(statusCodes.noContent)
    })

    it('should serve assets as expected', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/public/assets/images/govuk-crest.svg'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
