import { vi, describe, expect, it, beforeEach } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { removeUserSession } from '#server/auth/helpers/user-session.js'

import { catchAll } from '#server/common/helpers/errors.js'

vi.mock(import('#server/auth/helpers/get-user-session.js'), () => ({
  getUserSession: vi.fn().mockResolvedValue({ ok: true, value: {} })
}))
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
    t: vi.fn((key) => key)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip non-boom responses', async () => {
    const request = { response: {} }
    const h = { continue: Symbol('continue') }
    const result = await catchAll(request, h)

    expect(result).toBe(h.continue)
  })

  it.each([
    [statusCodes.notFound, 'error:notFound'],
    [statusCodes.forbidden, 'error:forbidden'],
    [statusCodes.unauthorized, 'error:unauthorized'],
    [statusCodes.badRequest, 'error:badRequest'],
    [statusCodes.imATeapot, 'error:generic']
  ])('renders expected error page for %i', async (code, expectedKey) => {
    const req = makeRequest(code)
    await catchAll(req, mockToolkit)

    expect(req.t).toHaveBeenCalledWith(expectedKey)
    expect(mockToolkit.view).toHaveBeenCalledWith('error/index', {
      pageTitle: expectedKey,
      heading: code,
      message: expectedKey
    })
    expect(mockToolkit.code).toHaveBeenCalledWith(code)
    expect(mockErrorLogger).not.toHaveBeenCalled()
  })

  it('logs user out when session is missing', async () => {
    vi.mocked(getUserSession).mockResolvedValue({
      ok: false,
      session: undefined
    })

    const req = makeRequest(statusCodes.unauthorized)
    await catchAll(req, mockToolkit)

    expect(removeUserSession).toHaveBeenCalledWith(req)
    expect(mockRedirect).toHaveBeenCalledWith('/logged-out')
    expect(mockTakeover).toHaveBeenCalledWith()
  })

  it('logs error for 500+', async () => {
    const req = makeRequest(statusCodes.internalServerError)
    await catchAll(req, mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith('mock-stack')
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

    await catchAll(request, mockToolkit)

    expect(mockToolkit.view).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Page not found',
      heading: statusCodes.notFound,
      message: 'Page not found'
    })
  })
})
