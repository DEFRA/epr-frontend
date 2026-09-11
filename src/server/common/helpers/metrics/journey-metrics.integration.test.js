import { StorageResolution, Unit } from 'aws-embedded-metrics'
import { describe, expect, vi } from 'vitest'

import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { asGetRequiredRegistrationResult } from '#server/common/test-helpers/organisation-fixtures.js'
import {
  asPackagingRecyclingNote,
  asUpdatePrnStatusResponse
} from '#server/common/test-helpers/prn-fixtures.js'
import { fetchPackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-note.js'
import { updatePrnStatus } from '#server/prns/helpers/update-prn-status.js'
import { beforeEach, it } from '#vite/fixtures/server.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { ServerInjectResponse } from '@hapi/hapi'
 */

// Enablement is read once as the metrics module is evaluated, which happens
// somewhere in the server's import graph -- too early for a beforeEach to
// influence. Hoisting puts it ahead of every import in this file.
vi.hoisted(() => {
  process.env.ENABLE_METRICS = 'true'
})

// The only test driving real requests through a real yar session, so the only
// one that catches a lost start marker or a double-firing route. Mocks the
// aws-embedded-metrics sink alone.

vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
)
vi.mock(
  import('#server/common/helpers/upload/initiate-summary-log-upload.js'),
  () => ({
    initiateSummaryLogUpload: vi.fn().mockResolvedValue({
      uploadUrl: 'http://cdp/upload',
      uploadId: 'cdp-upload-123',
      statusUrl: 'http://cdp/status',
      summaryLogId: '789'
    })
  })
)
vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({ submitSummaryLog: vi.fn() })
)
vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)
vi.mock(import('#server/prns/helpers/fetch-packaging-recycling-note.js'))
vi.mock(import('#server/prns/helpers/update-prn-status.js'))

const mockPutMetric = vi.fn()
const mockSetDimensions = vi.fn()

vi.mock(import('aws-embedded-metrics'), async (importOriginal) => {
  const original = await importOriginal()

  return {
    ...original,
    createMetricsLogger: () =>
      /** @type {never} */ (
        /** @type {unknown} */ ({
          putMetric: mockPutMetric,
          putDimensions: vi.fn(),
          setDimensions: mockSetDimensions,
          flush: vi.fn()
        })
      )
  }
})

const mockAuth = buildMockAuth({ backendToken: 'test-id-token' })

/**
 * A real browser resends whatever `Set-Cookie` the previous response carried;
 * `server.inject` does not, so a test chaining two mutating requests on one
 * session must thread the session cookie forward itself or it silently
 * replays the pre-mutation session on the second request.
 * @param {string} cookie
 * @param {ServerInjectResponse} response
 */
const nextSessionCookie = (cookie, response) => {
  const setCookie = response.headers['set-cookie'] ?? []
  const setCookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  const sessionCookie = setCookies
    .filter(/** @returns {c is string} */ (c) => Boolean(c))
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith('session='))

  if (!sessionCookie) {
    return cookie
  }

  return cookie
    .split('; ')
    .map((c) => (c.startsWith('session=') ? sessionCookie : c))
    .join('; ')
}

describe('journey metrics emit-once, driven through a real session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('summary log upload journey (success page re-renders on every poll)', () => {
    const organisationId = '123'
    const registrationId = '456'
    const summaryLogId = '789'
    const uploadUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
    const submitUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`

    const mockOrganisationData = /** @type {Organisation} */ (
      /** @type {unknown} */ ({
        id: organisationId,
        registrations: [{ id: registrationId, status: 'approved' }]
      })
    )

    beforeEach(() => {
      vi.mocked(fetchOrganisationById).mockResolvedValue(mockOrganisationData)
      vi.mocked(submitSummaryLog).mockResolvedValue({
        status: 'submitted',
        accreditationNumber: '493021'
      })
    })

    it('should record one start across repeat visits to the upload page', async ({
      server
    }) => {
      const { cookie } = await getCsrfToken(server, uploadUrl, {
        auth: mockAuth
      })

      await server.inject({
        method: 'GET',
        url: uploadUrl,
        auth: mockAuth,
        headers: { cookie }
      })

      expect(mockPutMetric).toHaveBeenCalledTimes(1)
      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionStart',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'UploadSummaryLogStart' },
        false
      )
    })

    it('should record one end across repeat submissions, following the real start', async ({
      server
    }) => {
      const { cookie: startCookie, crumb } = await getCsrfToken(
        server,
        uploadUrl,
        { auth: mockAuth }
      )

      const firstSubmit = await server.inject({
        method: 'POST',
        url: submitUrl,
        auth: mockAuth,
        headers: { cookie: startCookie },
        payload: { crumb }
      })
      await server.inject({
        method: 'POST',
        url: submitUrl,
        auth: mockAuth,
        headers: { cookie: nextSessionCookie(startCookie, firstSubmit) },
        payload: { crumb }
      })

      const endCalls = mockPutMetric.mock.calls.filter(
        ([metricName]) => metricName === 'TransactionEnd'
      )
      expect(endCalls).toHaveLength(1)
      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'UploadSummaryLogEnd' },
        false
      )
    })

    it('should start a fresh attempt once the previous one has ended', async ({
      server
    }) => {
      const { cookie: startCookie, crumb } = await getCsrfToken(
        server,
        uploadUrl,
        { auth: mockAuth }
      )

      const submitResponse = await server.inject({
        method: 'POST',
        url: submitUrl,
        auth: mockAuth,
        headers: { cookie: startCookie },
        payload: { crumb }
      })
      await server.inject({
        method: 'GET',
        url: uploadUrl,
        auth: mockAuth,
        headers: { cookie: nextSessionCookie(startCookie, submitResponse) }
      })

      const startCalls = mockPutMetric.mock.calls.filter(
        ([metricName]) => metricName === 'TransactionStart'
      )
      expect(startCalls).toHaveLength(2)
    })
  })

  describe('delete a PRN journey (redirect-ended, no confirmation page)', () => {
    const organisationId = 'org-123'
    const registrationId = 'reg-456'
    const accreditationId = 'acc-001'
    const prnId = 'prn-789'
    const deleteUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/delete`

    beforeEach(() => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        asGetRequiredRegistrationResult({
          organisationData: {
            id: organisationId,
            name: 'Reprocessor Organisation'
          },
          registration: {
            id: registrationId,
            wasteProcessingType: 'reprocessor-input',
            material: 'plastic',
            nation: 'england',
            site: { address: { line1: 'Reprocessing Site' } },
            accreditationId
          },
          accreditation: { id: accreditationId, status: 'approved' }
        })
      )
      vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
        asPackagingRecyclingNote({
          id: prnId,
          tonnage: 100,
          material: 'plastic',
          status: 'awaiting_authorisation',
          issuedToOrganisation: 'Test Producer Ltd',
          createdAt: '2026-01-15T10:00:00Z'
        })
      )
      vi.mocked(updatePrnStatus).mockResolvedValue(
        asUpdatePrnStatusResponse({ id: prnId, status: 'deleted' })
      )
    })

    it('should record one start across repeat visits to the delete confirmation page', async ({
      server
    }) => {
      const { cookie } = await getCsrfToken(server, deleteUrl, {
        auth: mockAuth
      })

      await server.inject({
        method: 'GET',
        url: deleteUrl,
        auth: mockAuth,
        headers: { cookie }
      })

      expect(mockPutMetric).toHaveBeenCalledTimes(1)
      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'DeletePRNStart' },
        false
      )
    })

    it('should record one end across repeat delete submissions, following the real start', async ({
      server
    }) => {
      const { cookie: startCookie, crumb } = await getCsrfToken(
        server,
        deleteUrl,
        { auth: mockAuth }
      )

      const firstDelete = await server.inject({
        method: 'POST',
        url: deleteUrl,
        auth: mockAuth,
        headers: { cookie: startCookie },
        payload: { crumb }
      })
      await server.inject({
        method: 'POST',
        url: deleteUrl,
        auth: mockAuth,
        headers: { cookie: nextSessionCookie(startCookie, firstDelete) },
        payload: { crumb }
      })

      const endCalls = mockPutMetric.mock.calls.filter(
        ([metricName]) => metricName === 'TransactionEnd'
      )
      expect(endCalls).toHaveLength(1)
      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'DeletePRNEnd' },
        false
      )
    })
  })
})
