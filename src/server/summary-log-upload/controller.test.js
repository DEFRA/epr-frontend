import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { createAuthSessionHelper } from '#server/common/test-helpers/auth-helper.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

vi.mock(
  import('#server/common/helpers/upload/initiate-summary-log-upload.js'),
  () => ({
    initiateSummaryLogUpload: vi.fn().mockResolvedValue({
      uploadUrl: 'http://cdp/upload',
      uploadId: 'cdp-upload-123',
      summaryLogId: 'sl-789'
    })
  })
)

describe('#summaryLogUploadController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
  /** @type {Server} */
  let server
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')
  let authHelper

  beforeAll(async () => {
    mockOidcServer.listen()

    // Configure OIDC
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

    // Setup auth helper
    authHelper = createAuthSessionHelper(server)

    // Mock getUserSession to return a valid session
    authHelper.mockGetUserSession(
      vi.mocked(getUserSessionModule.getUserSession)
    )

    // Create default auth session cookie
    await authHelper.createAuthCookie()
  })

  afterAll(async () => {
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
    mockOidcServer.close()
    await server.stop({ timeout: 0 })
  })

  test('should provide expected response', async () => {
    const { result, statusCode } = await authHelper.injectWithAuth({
      method: 'GET',
      url
    })

    expect(result).toStrictEqual(
      expect.stringContaining('Summary log: upload |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('should render back link to registration dashboard', async () => {
    const { result } = await authHelper.injectWithAuth({
      method: 'GET',
      url
    })

    expect(result).toContain('govuk-back-link')
    expect(result).toContain(
      `href="/organisations/${organisationId}/registrations/${registrationId}"`
    )
  })

  test('should display error page when upload initialisation fails', async () => {
    initiateSummaryLogUpload.mockRejectedValueOnce(new Error('Mock error'))

    const { result } = await authHelper.injectWithAuth({
      method: 'GET',
      url
    })

    expect(result).toStrictEqual(
      expect.stringContaining('Summary log upload error')
    )
    expect(result).toStrictEqual(
      expect.stringContaining('Failed to initialize upload: Mock error')
    )
  })

  test('should call initiateSummaryLogUpload with organisation, registration and redirectUrl template', async () => {
    await authHelper.injectWithAuth({
      method: 'GET',
      url
    })

    expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
      organisationId: '123',
      registrationId: '456',
      redirectUrl:
        '/organisations/123/registrations/456/summary-logs/{summaryLogId}',
      idToken: 'test-id-token'
    })
  })

  describe('page content', () => {
    test('should render caption "Upload summary log"', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Upload summary log')
    })

    test('should render heading "Choose file"', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Choose file')
    })

    test('should render intro text', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain(
        'You can upload the latest version of your summary log whenever you need to add or adjust waste records.'
      )
    })

    test('should render file upload with label "Upload XLSX file"', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Upload XLSX file')
    })

    test('should render file upload label in bold', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain('govuk-!-font-weight-bold')
    })

    test('should render Continue button', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Continue')
    })

    test('should not render accordion sections', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).not.toContain('govuk-accordion')
      expect(result).not.toContain('Why this is needed')
    })

    test('should not render inset text', async () => {
      const { result } = await server.inject({ method: 'GET', url })

      expect(result).not.toContain('govuk-inset-text')
    })
  })

  describe('session validation', () => {
    test('should redirect to logged-out when session is invalid', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValueOnce({
        ok: false
      })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
