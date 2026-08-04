import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

describe('/auth/logout - GET integration', () => {
  it('should redirect to /logged-out', async ({ server }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/auth/logout'
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers['location']).toBe('/logged-out')
  })
})
