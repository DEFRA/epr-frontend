import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

describe('#healthController', () => {
  it('should provide expected response', async ({ server }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toStrictEqual({ message: 'success' })
    expect(statusCode).toBe(statusCodes.ok)
  })
})
