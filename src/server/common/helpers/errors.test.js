import { vi, describe, expect, it, beforeEach } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { removeUserSession } from '#server/auth/helpers/user-session.js'

import { catchAll } from '#server/common/helpers/errors.js'
import { genericErrorViewModel } from '#server/error/generic-error.js'
import {
  asRequest,
  asResponseToolkit
} from '#server/common/test-helpers/request-fixtures.js'

vi.mock(import('#server/auth/helpers/user-session.js'), () => ({
  removeUserSession: vi.fn()
}))

describe(catchAll, () => {
  const mockErrorLogger = vi.fn()
  const mockTakeover = vi.fn()
  const mockRedirect = vi.fn(() => ({ takeover: mockTakeover }))
  const mockToolkit = {
    view: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
    redirect: mockRedirect
  }

  const makeRequest = (statusCode) => ({
    response: {
      isBoom: true,
      stack: 'mock-stack',
      output: { statusCode },
      redirect: mockRedirect
    },
    logger: { error: mockErrorLogger },
    t: vi.fn((key) => key),
    localiseUrl: vi.fn((key) => key)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip non-boom responses', async () => {
    const request = { response: {} }
    const h = { continue: Symbol('continue') }
    const result = await catchAll(asRequest(request), asResponseToolkit(h))

    expect(result).toBe(h.continue)
  })

  it.each([
    [statusCodes.notFound, 'error:notFound'],
    [statusCodes.forbidden, 'error:forbidden'],
    [statusCodes.badRequest, 'error:badRequest'],
    [statusCodes.imATeapot, 'error:generic']
  ])('renders expected error page for %i', async (code, expectedKey) => {
    const req = makeRequest(code)
    await catchAll(asRequest(req), asResponseToolkit(mockToolkit))

    expect(req.t).toHaveBeenCalledWith(expectedKey)
    expect(mockToolkit.view).toHaveBeenCalledWith('error/index', {
      pageTitle: expectedKey,
      heading: code,
      message: expectedKey
    })
    expect(mockToolkit.code).toHaveBeenCalledWith(code)
    expect(mockErrorLogger).not.toHaveBeenCalled()
  })

  it('renders the generic error page and logs for 5xx errors', async () => {
    const req = makeRequest(statusCodes.internalServerError)
    await catchAll(asRequest(req), asResponseToolkit(mockToolkit))

    expect(mockToolkit.view).toHaveBeenCalledWith(
      'error/generic',
      genericErrorViewModel((key) => key, '/')
    )
    expect(mockToolkit.code).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
    expect(mockErrorLogger).toHaveBeenCalledWith({ err: req.response })
  })

  it('logs user out when session is missing', async () => {
    const req = makeRequest(statusCodes.unauthorized)
    await catchAll(asRequest(req), asResponseToolkit(mockToolkit))

    expect(removeUserSession).toHaveBeenCalledWith(req)
    expect(mockRedirect).toHaveBeenCalledWith('/logged-out')
    expect(mockTakeover).toHaveBeenCalledWith()
  })

  it('should use fallback message when localise function not available', async () => {
    const request = {
      response: {
        isBoom: true,
        stack: 'mock-stack',
        output: { statusCode: statusCodes.notFound }
      },
      logger: { error: mockErrorLogger }
      // Note: no `t` function provided (as would happen on ignored routes)
    }

    await catchAll(asRequest(request), asResponseToolkit(mockToolkit))

    expect(mockToolkit.view).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Page not found',
      heading: statusCodes.notFound,
      message: 'Page not found'
    })
  })

  it('falls back to the simple view for a 5xx without a localise function', async () => {
    const request = {
      response: {
        isBoom: true,
        stack: 'mock-stack',
        output: { statusCode: statusCodes.internalServerError }
      },
      logger: { error: mockErrorLogger }
      // Note: no `t` function provided (as would happen on ignored routes)
    }

    await catchAll(asRequest(request), asResponseToolkit(mockToolkit))

    expect(mockErrorLogger).toHaveBeenCalledWith({ err: request.response })
    expect(mockToolkit.view).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Something went wrong',
      heading: statusCodes.internalServerError,
      message: 'Something went wrong'
    })
  })
})
