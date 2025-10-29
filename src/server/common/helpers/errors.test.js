import { vi, describe, expect, it, beforeEach } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'

import { catchAll } from '#server/common/helpers/errors.js'

describe(catchAll, () => {
  const mockErrorLogger = vi.fn()
  const mockToolkit = {
    view: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis()
  }

  const makeRequest = (statusCode) => ({
    response: { isBoom: true, stack: 'mock-stack', output: { statusCode } },
    logger: { error: mockErrorLogger },
    t: vi.fn((key) => key)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip non-boom responses', () => {
    const request = { response: {} }
    const h = { continue: Symbol('continue') }
    const result = catchAll(request, h)

    expect(result).toBe(h.continue)
  })

  it.each([
    [statusCodes.notFound, 'error:notFound'],
    [statusCodes.forbidden, 'error:forbidden'],
    [statusCodes.unauthorized, 'error:unauthorized'],
    [statusCodes.badRequest, 'error:badRequest'],
    [statusCodes.imATeapot, 'error:generic']
  ])('renders expected error page for %i', (code, expectedKey) => {
    const req = makeRequest(code)
    catchAll(req, mockToolkit)

    expect(req.t).toHaveBeenCalledWith(expectedKey)
    expect(mockToolkit.view).toHaveBeenCalledWith('error/index', {
      pageTitle: expectedKey,
      heading: code,
      message: expectedKey
    })
    expect(mockToolkit.code).toHaveBeenCalledWith(code)
    expect(mockErrorLogger).not.toHaveBeenCalled()
  })

  it('logs error for 500+', () => {
    const req = makeRequest(statusCodes.internalServerError)
    catchAll(req, mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith('mock-stack')
  })
})
