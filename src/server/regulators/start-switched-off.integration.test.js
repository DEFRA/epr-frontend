import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

describe('when regulator access is switched off', () => {
  it('does not register the regulator start page at all', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/regulators/start'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
