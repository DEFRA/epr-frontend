import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import * as fetchOrganisationModule from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getByLabelText, getByRole, getByText } from '@testing-library/dom'
import * as cheerio from 'cheerio'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

/** @import {Organisation} from '#domain/organisations/model.js' */

vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
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

const mockOrganisationData = /** @type {Organisation} */ (
  /** @type {unknown} */ ({
    id: '123',
    registrations: [{ id: '456', status: 'approved' }]
  })
)

const mockAuth = buildMockAuth({ idToken: 'test-id-token' })

describe('#summaryLogUploadController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchOrganisationModule.fetchOrganisationById).mockResolvedValue(
      mockOrganisationData
    )
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
      await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/nonexistent-registration/summary-logs/upload`,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).not.toHaveBeenCalled()
    })
  })
})
