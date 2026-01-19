import { statusCodes } from '#server/common/constants/status-codes.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import * as cheerio from 'cheerio'
import { beforeEach, describe, expect, vi } from 'vitest'

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

const mockAuth = {
  strategy: 'session',
  credentials: {
    idToken: 'test-id-token',
    profile: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    }
  }
}

describe('#summaryLogUploadController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide expected response', async ({ server }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(result).toStrictEqual(
      expect.stringContaining('Summary log: upload |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  it('should render back link to registration dashboard', async ({
    server
  }) => {
    const { result } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(result).toContain('govuk-back-link')
    expect(result).toContain(
      `href="/organisations/${organisationId}/registrations/${registrationId}"`
    )
  })

  it('should display error page without leaking backend error details', async ({
    server
  }) => {
    initiateSummaryLogUpload.mockRejectedValueOnce(
      Boom.notFound(
        'Failed to fetch from backend at url: http://backend.url/v1/organisations/123/registrations/456/summary-logs: 404 Not Found'
      )
    )

    const { result } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    const $ = cheerio.load(result)

    expect($('main h1').text()).toBe('Summary log upload error')
    expect($('main p').text()).toBe('Failed to initialize upload')
  })

  it('should call initiateSummaryLogUpload with organisation, registration and redirectUrl template', async ({
    server
  }) => {
    await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
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
    it('should render caption "Upload summary log"', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Upload summary log')
    })

    it('should render heading "Choose file"', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Choose file')
    })

    it('should render intro text', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(
        'You can upload the latest version of your summary log whenever you need to add or adjust waste records.'
      )
    })

    it('should render file upload with label "Upload XLSX file"', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Upload XLSX file')
    })

    it('should render file upload label in bold', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('govuk-!-font-weight-bold')
    })

    it('should render Continue button', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Continue')
    })

    it('should not render accordion sections', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).not.toContain('govuk-accordion')
      expect(result).not.toContain('Why this is needed')
    })

    it('should not render inset text', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).not.toContain('govuk-inset-text')
    })
  })

  describe('session validation', () => {
    it('should redirect to logged-out when not authenticated', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })
})
