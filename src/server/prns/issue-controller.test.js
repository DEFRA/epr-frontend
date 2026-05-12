import { statusCodes } from '#server/common/constants/status-codes.js'
import { mockAuth, mockCredentials } from '#server/common/test-helpers/auth.js'
import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { describe, expect, vi } from 'vitest'

/**
 * @import { Server } from '@hapi/hapi'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 * @import { PackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
 * @import { UpdatePrnStatusResponse } from './helpers/update-prn-status.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)
vi.mock(import('./helpers/fetch-packaging-recycling-note.js'))
vi.mock(import('./helpers/update-prn-status.js'))

const asRegWithAcc = (/** @type {object} */ value) =>
  /** @type {Required<RegistrationWithAccreditation>} */ (
    /** @type {unknown} */ (value)
  )
const asPrn = (/** @type {object} */ value) =>
  /** @type {PackagingRecyclingNote} */ (/** @type {unknown} */ (value))
const asUpdatePrn = (/** @type {object} */ value) =>
  /** @type {UpdatePrnStatusResponse} */ (/** @type {unknown} */ (value))
const asServer = (/** @type {object} */ value) =>
  /** @type {Server} */ (/** @type {unknown} */ (value))
const csrfOpts = (/** @type {object} */ value) =>
  /** @type {{ headers?: object }} */ (value)

const { getRequiredRegistrationWithAccreditation } =
  await import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
const { fetchPackagingRecyclingNote } =
  await import('./helpers/fetch-packaging-recycling-note.js')
const { updatePrnStatus } = await import('./helpers/update-prn-status.js')

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const prnId = 'prn-789'
const issueUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issue`
const actionUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
const issuedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issued`
const errorUrl = `/organisations/${organisationId}/error`

const mockPrnIssued = {
  id: 'prn-789',
  status: 'awaiting_acceptance',
  prnNumber: 'ER2625001A'
}

describe('#issueController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
      asRegWithAcc({
        organisationData: {
          id: organisationId,
          companyDetails: { name: 'Test Org' }
        },
        registration: {
          id: registrationId,
          wasteProcessingType: 'reprocessor-input',
          material: 'plastic',
          nation: 'england',
          site: { address: { line1: 'Test Site' } },
          accreditationId
        },
        accreditation: { id: accreditationId, status: 'approved' }
      })
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
      asPrn({
        id: prnId,
        prnNumber: 'ER2625001A',
        status: 'awaiting_authorisation',
        issuedToOrganisation: { id: 'producer-1', name: 'Test Producer' },
        tonnage: 100,
        material: 'plastic'
      })
    )
    vi.mocked(updatePrnStatus).mockResolvedValue(asUpdatePrn(mockPrnIssued))
  })

  describe('request handling', () => {
    it('updates PRN status to awaiting_acceptance and redirects to issued page', async ({
      server
    }) => {
      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        asServer(server),
        viewUrl,
        csrfOpts({ auth: mockAuth })
      )

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(issuedUrl)
      expect(updatePrnStatus).toHaveBeenCalledWith(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'awaiting_acceptance' },
        mockCredentials.idToken
      )
    })

    it('redirects to action page with issue_failed error when updatePrnStatus fails', async ({
      server
    }) => {
      const backendError = new Error('Backend error')
      vi.mocked(updatePrnStatus).mockRejectedValueOnce(backendError)

      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        asServer(server),
        viewUrl,
        csrfOpts({ auth: mockAuth })
      )

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(`${actionUrl}?error=issue_failed`)
      expect(server.loggerMocks.error).toHaveBeenCalledWith({
        message: 'Failed to issue PRN',
        err: backendError
      })
    })

    it('redirects to error page when backend returns 409 conflict', async ({
      server
    }) => {
      const Boom = await import('@hapi/boom')
      vi.mocked(updatePrnStatus).mockRejectedValueOnce(
        Boom.default.conflict('Insufficient total waste balance')
      )

      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        asServer(server),
        viewUrl,
        csrfOpts({ auth: mockAuth })
      )

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(errorUrl)
    })

    it('redirects to action page with issue_failed error for non-conflict Boom errors', async ({
      server
    }) => {
      const Boom = await import('@hapi/boom')
      vi.mocked(updatePrnStatus).mockRejectedValueOnce(
        Boom.default.forbidden('Not authorised')
      )

      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        asServer(server),
        viewUrl,
        csrfOpts({ auth: mockAuth })
      )

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(`${actionUrl}?error=issue_failed`)
    })

    describe('PRN number session storage (race condition mitigation)', () => {
      it('displays PRN number from session when backend fetch returns null due to replication lag', async ({
        server
      }) => {
        // Mock the race condition: updatePrnStatus returns prnNumber,
        // but subsequent fetch returns null (DB hasn't replicated yet)
        vi.mocked(updatePrnStatus).mockResolvedValue(
          asUpdatePrn({
            ...mockPrnIssued,
            prnNumber: 'ER2625001A'
          })
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          asPrn({
            id: prnId,
            prnNumber: null,
            issuedToOrganisation: { id: 'producer-1', name: 'Test Producer' },
            tonnage: 100,
            material: 'plastic',
            status: 'awaiting_acceptance'
          })
        )

        // Step 1: POST to issue endpoint (stores prnNumber in session)
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          asServer(server),
          viewUrl,
          csrfOpts({ auth: mockAuth })
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: issueUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        // Merge cookies from POST response (includes session with prnNumber)
        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        // Step 2: GET issued page with session cookies
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // PRN number should come from session, not the (null) fetched value
        expect(getByText(main, /ER2625001A/)).toBeDefined()
      })

      it('does not use session prnNumber when issued page is for a different PRN', async ({
        server
      }) => {
        // Issue prn-789 (stores session with id: 'prn-789')
        vi.mocked(updatePrnStatus).mockResolvedValue(
          asUpdatePrn({
            ...mockPrnIssued,
            prnNumber: 'ER2625001A'
          })
        )
        // Fetch for a different PRN returns null prnNumber
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          asPrn({
            id: 'different-prn',
            prnNumber: null,
            issuedToOrganisation: { id: 'producer-1', name: 'Test Producer' },
            tonnage: 100,
            material: 'plastic',
            status: 'awaiting_acceptance'
          })
        )

        // POST to issue prn-789
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          asServer(server),
          viewUrl,
          csrfOpts({ auth: mockAuth })
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: issueUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        // GET issued page for a DIFFERENT PRN
        const differentIssuedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/different-prn/issued`

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: differentIssuedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Session prnNumber should NOT be used (ID mismatch)
        expect(queryByText(main, /ER2625001A/)).toBeNull()
      })
    })
  })
})
