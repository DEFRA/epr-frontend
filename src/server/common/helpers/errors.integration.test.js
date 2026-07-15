import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { describe, expect } from 'vitest'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'

describe('#catchAll - server errors', () => {
  it('renders the generic error page and logs for an unhandled 5xx', async ({
    server
  }) => {
    server.route({
      method: 'GET',
      path: '/boom',
      options: { auth: false },
      handler: () => {
        throw new Error('boom')
      }
    })

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/boom'
    })

    expect(statusCode).toBe(statusCodes.internalServerError)

    const dom = new JSDOM(result)
    const main = getByRole(dom.window.document.body, 'main')

    expect(getByText(main, /Something has gone wrong/i)).toBeDefined()
    expect(server.loggerMocks.error).toHaveBeenCalledWith({
      err: expect.any(Error)
    })
  })
})
