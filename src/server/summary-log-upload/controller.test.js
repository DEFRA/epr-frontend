import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import {
  buildAccreditationView,
  buildOrganisationView,
  buildRegistrationView
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getByLabelText, getByRole, getByText } from '@testing-library/dom'
import * as cheerio from 'cheerio'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

/** @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js' */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration.js'),
  () => ({
    fetchRegistration: vi.fn()
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

const mockFetchRegistration = vi.mocked(fetchRegistration)

const thisYear = new Date().getUTCFullYear()

/**
 * @param {Partial<RegistrationView>} [overrides]
 */
const holdsRegistration = (overrides = {}) => {
  const registration = buildRegistrationView({
    status: {
      current: 'approved',
      timeline: [{ status: 'approved', at: `${thisYear}-01-01T00:00:00.000Z` }]
    },
    accreditations: {},
    ...overrides
  })

  mockFetchRegistration.mockResolvedValue({
    organisation: buildOrganisationView(),
    registration
  })
}

vi.spyOn(metrics.journey, 'start').mockResolvedValue()
vi.spyOn(metrics.journey, 'end').mockResolvedValue()

const mockAuth = buildMockAuth({
  backendToken: toBackendToken('test-id-token')
})

const regulatorAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  idToken: 'test-id-token',
  ...sessionIdentity(IDENTITIES.regulator)
})

describe('#summaryLogUploadController', () => {
  const organisationNumber = '500118'
  const registrationNumber = 'R26ER5001180041PL'
  const registrationPath = `/organisations/${organisationNumber}/registrations/${registrationNumber}`
  const registeredOnlyHomepage = `${registrationPath}/2027`
  const accreditedHomepage = `${registrationPath}/accreditations/2027`
  const url = `${registeredOnlyHomepage}/summary-logs/upload`

  const kinds = [
    {
      kind: 'registered-only',
      homepage: registeredOnlyHomepage,
      accredited: false
    },
    { kind: 'accredited', homepage: accreditedHomepage, accredited: true }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    holdsRegistration()
  })

  it('should provide expected response', async ({ server }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  it.for(kinds)(
    'shows the year in the $kind page title',
    async ({ homepage }, { server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: `${homepage}/summary-logs/upload`,
        auth: mockAuth
      })

      expect(result).toContain('Summary log: upload (2027) |')
    }
  )

  it.for(kinds)(
    'shows the year in the $kind heading',
    async ({ homepage }, { server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: `${homepage}/summary-logs/upload`,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(
        getByRole(getByRole(body, 'main'), 'heading', { level: 1 }).textContent
      ).toContain('Upload your summary log (2027)')
    }
  )

  it.for(kinds)(
    'links the $kind page back to the materials homepage for the year',
    async ({ homepage }, { server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: `${homepage}/summary-logs/upload`,
        auth: mockAuth
      })

      const $ = cheerio.load(
        /** @type {string} */ (/** @type {unknown} */ (result))
      )

      expect($('.govuk-back-link').attr('href')).toBe(homepage)
    }
  )

  it.for(kinds)(
    'starts a $kind upload for the year',
    async ({ homepage, accredited }, { server }) => {
      await server.inject({
        method: 'GET',
        url: `${homepage}/summary-logs/upload`,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        keys: { organisationNumber, registrationNumber },
        year: 2027,
        accredited,
        redirectUrl: `${registrationPath}/summary-logs/{summaryLogId}`,
        backendToken: 'test-id-token'
      })
    }
  )

  it.for([
    `${registrationPath}/twenty/summary-logs/upload`,
    `${registrationPath}/accreditations/twenty/summary-logs/upload`
  ])(
    'answers not found for a year that is not a year: %s',
    async (notAYear, { server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: notAYear,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(initiateSummaryLogUpload).not.toHaveBeenCalled()
    }
  )

  describe('without a year in the address', () => {
    const yearless = `${registrationPath}/summary-logs/upload`

    it('sends a registered-only operator to the upload page for the latest registered year', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: yearless,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(
        `${registrationPath}/${thisYear}/summary-logs/upload`
      )
      expect(initiateSummaryLogUpload).not.toHaveBeenCalled()
    })

    it('sends an accredited operator to the accredited upload page for the latest registered year', async ({
      server
    }) => {
      holdsRegistration({
        accreditations: { [thisYear]: buildAccreditationView() }
      })

      const { headers } = await server.inject({
        method: 'GET',
        url: yearless,
        auth: mockAuth
      })

      expect(headers.location).toBe(
        `${registrationPath}/accreditations/${thisYear}/summary-logs/upload`
      )
    })

    it('keeps Welsh and the query string', async ({ server }) => {
      const { headers } = await server.inject({
        method: 'GET',
        url: `/cy${yearless}?from=report`,
        auth: mockAuth
      })

      expect(headers.location).toBe(
        `/cy${registrationPath}/${thisYear}/summary-logs/upload?from=report`
      )
    })
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
      auth: regulatorAuth
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
      auth: regulatorAuth
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
      registrationNumber
    )
  })

  it('should not record a journey start for a regulator opening the page', async ({
    server
  }) => {
    await server.inject({ method: 'GET', url, auth: regulatorAuth })

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
        reference: `organisationNumber=${organisationNumber}, registrationNumber=${registrationNumber}`
      }
    })
  })

  it('looks the registration up by its numbers', async ({ server }) => {
    await server.inject({ method: 'GET', url, auth: mockAuth })

    expect(mockFetchRegistration).toHaveBeenCalledWith({
      organisationNumber,
      registrationNumber,
      backendToken: 'test-id-token'
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
    const unknownRegistration = `/organisations/${organisationNumber}/registrations/R26ER9999999999PL/2027/summary-logs/upload`

    it('should return 404 when registration not found for organisation', async ({
      server
    }) => {
      mockFetchRegistration.mockRejectedValueOnce(
        Boom.notFound('Registration not found')
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: unknownRegistration,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should not call initiateSummaryLogUpload when registration not found', async ({
      server
    }) => {
      mockFetchRegistration.mockRejectedValueOnce(
        Boom.notFound('Registration not found')
      )

      await server.inject({
        method: 'GET',
        url: unknownRegistration,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).not.toHaveBeenCalled()
    })
  })
})
