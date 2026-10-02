import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getByLabelText, getByRole, getByText } from '@testing-library/dom'
import * as cheerio from 'cheerio'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn().mockResolvedValue({
      organisationData: { id: '123' },
      registration: { id: '456', status: 'approved', validFrom: '2026-01-01' },
      accreditation: undefined
    })
  })
)

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

const mockFetchRegistrationAndAccreditation = vi.mocked(
  fetchRegistrationAndAccreditation,
  { partial: true, deep: true }
)

vi.spyOn(metrics.journey, 'start').mockResolvedValue()
vi.spyOn(metrics.journey, 'end').mockResolvedValue()

const mockAuth = buildMockAuth({ backendToken: 'test-id-token' })

describe('#summaryLogUploadController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchRegistrationAndAccreditation.mockResolvedValue({
      organisationData: { id: organisationId },
      registration: {
        id: registrationId,
        status: 'approved',
        validFrom: '2026-01-01'
      },
      accreditation: undefined
    })
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

  it('should render the upload form for an operator', async ({ server }) => {
    const { result } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    const $ = cheerio.load(
      /** @type {string} */ (/** @type {unknown} */ (result))
    )

    expect($('main form')).toHaveLength(1)
  })

  it('should not render the upload form for a regulator', async ({
    server
  }) => {
    const { result } = await server.inject({
      method: 'GET',
      url,
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        idToken: 'test-id-token',
        ...sessionIdentity(IDENTITIES.regulator)
      })
    })

    const $ = cheerio.load(
      /** @type {string} */ (/** @type {unknown} */ (result))
    )

    expect($('main form')).toHaveLength(0)
  })

  it('should not create a summary log for a regulator opening the page', async ({
    server
  }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        idToken: 'test-id-token',
        ...sessionIdentity(IDENTITIES.regulator)
      })
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(initiateSummaryLogUpload).not.toHaveBeenCalled()

    const $ = cheerio.load(
      /** @type {string} */ (/** @type {unknown} */ (result))
    )

    expect($('main h1').text()).toContain('Summary log')
  })

  it('should record the journey start when an operator opens the upload page', async ({
    server
  }) => {
    await server.inject({ method: 'GET', url, auth: mockAuth })

    expect(metrics.journey.start).toHaveBeenCalledWith(
      expect.anything(),
      JOURNEY.uploadSummaryLog,
      registrationId
    )
  })

  it('should not record a journey start for a regulator opening the page', async ({
    server
  }) => {
    await server.inject({
      method: 'GET',
      url,
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        idToken: 'test-id-token',
        ...sessionIdentity(IDENTITIES.regulator)
      })
    })

    expect(metrics.journey.start).not.toHaveBeenCalled()
  })

  it('should display error page without leaking backend error details', async ({
    server
  }) => {
    const uploadError = Boom.notFound(
      'Failed to fetch from backend at url: http://backend.url/v1/organisations/123/registrations/456/summary-logs: 404 Not Found'
    )
    vi.mocked(initiateSummaryLogUpload).mockRejectedValueOnce(uploadError)

    const { result } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    const $ = cheerio.load(
      /** @type {string} */ (/** @type {unknown} */ (result))
    )

    expect($('main h1').text()).toBe('Summary log upload error')
    expect($('main p').text()).toBe('Failed to initialise upload')

    expect(server.loggerMocks.error).toHaveBeenCalledWith({
      message: 'Failed to initiate summary log upload',
      err: uploadError,
      event: {
        category: 'upload',
        action: 'summary-log-upload-failed',
        reference: `organisationId=${organisationId}, registrationId=${registrationId}`
      }
    })
  })

  it('should call initiateSummaryLogUpload with the year from the registration validFrom and redirectUrl template', async ({
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
      year: 2026,
      redirectUrl:
        '/organisations/123/registrations/456/summary-logs/{summaryLogId}',
      backendToken: 'test-id-token'
    })
  })

  it("should use the registration's own validFrom year, not the current year, when they differ", async ({
    server
  }) => {
    mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
      organisationData: { id: organisationId },
      registration: {
        id: registrationId,
        status: 'approved',
        validFrom: '2025-06-01'
      },
      accreditation: undefined
    })

    await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(initiateSummaryLogUpload).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2025 })
    )
  })

  describe('page content', () => {
    const introText =
      'You can upload the latest version of your summary log whenever you need to add or adjust waste records.'

    it('should render caption "Summary log"', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, 'Summary log').className).toContain(
        'govuk-caption-xl'
      )
    })

    it('should render heading "Upload your summary log" as an h1', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(
        getByRole(main, 'heading', {
          level: 1,
          name: /Upload your summary log/i
        })
      ).toBeDefined()
    })

    it('should render the intro as a lead paragraph', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, introText).className).toContain('govuk-body-l')
    })

    it('should wrap the intro in an inset text component', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(main.querySelector('.govuk-inset-text')?.textContent).toContain(
        introText
      )
    })

    it('should render file upload labelled "Choose XLSX file"', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(getByLabelText(main, 'Choose XLSX file')).toBeDefined()
    })

    it('should render the file upload label in bold', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, 'Choose XLSX file').className).toContain(
        'govuk-!-font-weight-bold'
      )
    })

    it('should render helper text below the file input', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(
        getByText(
          main,
          'Your chosen file will be checked for errors, new data and data changes when you continue.'
        )
      ).toBeDefined()
    })

    it('should render a Continue button', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(getByRole(main, 'button', { name: 'Continue' })).toBeDefined()
    })

    it('should not render accordion sections', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const main = getByRole(body, 'main')

      expect(main.querySelector('.govuk-accordion')).toBeNull()
      expect(main.textContent).not.toContain('Why this is needed')
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

  describe('registration validation', () => {
    it('should return 404 when registration not found for organisation', async ({
      server
    }) => {
      mockFetchRegistrationAndAccreditation.mockRejectedValueOnce(
        Boom.notFound('Registration not found')
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/nonexistent-registration/summary-logs/upload`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should not call initiateSummaryLogUpload when registration not found', async ({
      server
    }) => {
      mockFetchRegistrationAndAccreditation.mockRejectedValueOnce(
        Boom.notFound('Registration not found')
      )

      await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/nonexistent-registration/summary-logs/upload`,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).not.toHaveBeenCalled()
    })
  })
})
