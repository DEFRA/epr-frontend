import { statusCodes } from '#server/common/constants/status-codes.js'
import { extractCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('#accountLinkingController', () => {
  describe('csrf protection', () => {
    /** @type {Server} */
    let server

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    it('should reject POST request without CSRF token', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/account/linking',
        payload: {
          organisationId: 'org-1'
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    it('should reject POST request with invalid CSRF token', async () => {
      const { cookie } = extractCsrfToken(
        await server.inject({
          method: 'GET',
          url: '/account/linking'
        })
      )

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/account/linking',
        headers: { cookie },
        payload: {
          crumb: 'invalid-token',
          organisationId: 'org-1'
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
