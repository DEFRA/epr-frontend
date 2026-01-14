import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { createServer } from '#server/index.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  givenUserSignedInToService,
  createUserSessionData
} from '#server/common/test-helpers/auth-helper.js'
import { extractCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'

vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({
    submitSummaryLog: vi.fn()
  })
)

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'validated'
    })
  })
)

describe('#submitSummaryLogController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`
  /** @type {Server} */
  let server
  /** @type {import('#server/common/test-helpers/auth-helper.js').InjectOptionsDecorator} */
  let requestFromSignedInUser
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')

  beforeAll(async () => {
    mockOidcServer.listen()

    config.load({
      defraId: {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        oidcConfigurationUrl:
          'http://defra-id.auth/.well-known/openid-configuration',
        serviceId: 'test-service-id'
      }
    })

    server = await createServer()
    await server.initialize()
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    requestFromSignedInUser = await givenUserSignedInToService(server, {
      sessionData: createUserSessionData()
    })
  })

  afterAll(async () => {
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
    mockOidcServer.close()
    await server.stop({ timeout: 0 })
  })

  test('should submit summary log, store response in session, and redirect to GET route', async () => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    submitSummaryLog.mockResolvedValueOnce(mockResponse)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = extractCsrfToken(
      await server.inject(
        requestFromSignedInUser({
          method: 'GET',
          url: getUrl
        })
      )
    )

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    expect(submitSummaryLog).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId,
      'test-id-token'
    )
    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    )
  })

  test('should set session cookie when storing fresh data', async () => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    submitSummaryLog.mockResolvedValueOnce(mockResponse)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = extractCsrfToken(
      await server.inject(
        requestFromSignedInUser({
          method: 'GET',
          url: getUrl
        })
      )
    )

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    // Verify session cookie was set
    const sessionCookie = response.headers['set-cookie']

    expect(sessionCookie).toBeDefined()
    expect(
      Array.isArray(sessionCookie) ? sessionCookie[0] : sessionCookie
    ).toContain('userSession')
  })

  test('should render conflict view when backend returns 409', async () => {
    submitSummaryLog.mockRejectedValueOnce(
      Boom.conflict('Summary log must be validated before submission')
    )

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = extractCsrfToken(
      await server.inject(
        requestFromSignedInUser({
          method: 'GET',
          url: getUrl
        })
      )
    )

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toStrictEqual(
      expect.stringContaining('Your waste records cannot be updated')
    )
    expect(result).toStrictEqual(
      expect.stringContaining('someone else from your organisation')
    )
    expect(result).toStrictEqual(
      expect.stringContaining(`/organisations/${organisationId}`)
    )
  })

  test('should allow non-conflict backend errors to bubble up', async () => {
    const error = new Error('Backend error')
    submitSummaryLog.mockRejectedValueOnce(error)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = extractCsrfToken(
      await server.inject(
        requestFromSignedInUser({
          method: 'GET',
          url: getUrl
        })
      )
    )

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    // Hapi will show an error page (500)
    expect(response.statusCode).toBe(statusCodes.internalServerError)
  })

  test('should reject POST request without CSRF token', async () => {
    const response = await server.inject(
      requestFromSignedInUser({
        method: 'POST',
        url
      })
    )

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })

  test('should redirect to login when session is invalid', async () => {
    // Get CSRF token first with valid session
    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { crumb } = extractCsrfToken(
      await server.inject(
        requestFromSignedInUser({
          method: 'GET',
          url: getUrl
        })
      )
    )

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie: 'userSession=invalidKey' },
      payload: { crumb }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/logged-out')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
