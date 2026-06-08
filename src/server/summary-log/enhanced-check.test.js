import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole, queryByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { config } from '#config/config.js'
import { summaryLogStatuses } from '../common/constants/statuses.js'

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'preprocessing'
    })
  })
)

vi.mock(
  import('#server/common/helpers/upload/initiate-summary-log-upload.js'),
  () => ({
    initiateSummaryLogUpload: vi.fn().mockResolvedValue({
      uploadUrl: 'https://storage.example.com/upload?signature=abc123',
      uploadId: 'new-upload-id-123'
    })
  })
)

vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({
    submitSummaryLog: vi.fn()
  })
)

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn().mockResolvedValue({
      organisationData: undefined,
      registration: undefined,
      accreditation: undefined
    })
  })
)

vi.mock(
  import('#server/common/helpers/waste-balance/fetch-waste-balances.js'),
  () => ({
    fetchWasteBalances: vi.fn()
  })
)

const mockFetchSummaryLogStatus = vi.mocked(fetchSummaryLogStatus, {
  partial: true,
  deep: true
})

const mockAuth = buildMockAuth({ idToken: 'test-id-token' })

describe('enhanced check page (feature flag on)', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

  beforeEach(() => {
    config.set('featureFlags.enhancedSummaryLogCheckPages', true)
    mockFetchSummaryLogStatus.mockReset().mockResolvedValue({
      status: 'preprocessing'
    })
  })

  afterEach(() => {
    config.reset('featureFlags.enhancedSummaryLogCheckPages')
  })

  describe('accredited with open period loads only', () => {
    beforeEach(() => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT',
        loadsByPeriodStatus: {
          open: { added: { tonnageDelta: 10 }, adjusted: null },
          closed: null
        }
      })
    })

    it('renders the enhanced check page heading', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toStrictEqual(
        expect.stringContaining('Check before confirming upload')
      )
    })

    it('shows open period section with tonnage', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(
        getByRole(main, 'heading', { level: 2, name: /open periods/i })
      ).toBeDefined()
      expect(queryByText(main, /10 tonnes/)).not.toBeNull()
    })

    it('hides closed period section when closed is null', async ({
      server
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(queryByText(main, /closed periods/i)).toBeNull()
    })

    it('includes the submit form', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining(
          `action="/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit"`
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('method="POST"'))
      expect(result).toStrictEqual(expect.stringContaining('Confirm upload'))
    })
  })

  describe('accredited with mixed open and closed period loads', () => {
    beforeEach(() => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'EXPORTER',
        loadsByPeriodStatus: {
          open: { added: { tonnageDelta: 5 }, adjusted: null },
          closed: {
            added: { tonnageDelta: 8 },
            adjusted: { tonnageDelta: -3 }
          }
        }
      })
    })

    it('renders both open and closed period sections', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const h2s = getAllByRole(main, 'heading', { level: 2 })
      const h2Texts = h2s.map((el) => el.textContent)
      expect(h2Texts).toStrictEqual(
        expect.arrayContaining([
          expect.stringMatching(/open periods/i),
          expect.stringMatching(/closed periods/i)
        ])
      )

      expect(queryByText(main, /5 tonnes/)).not.toBeNull()
      expect(queryByText(main, /8 tonnes/)).not.toBeNull()
      expect(queryByText(main, /-3 tonnes/)).not.toBeNull()
    })
  })

  describe('registered-only processing type', () => {
    beforeEach(() => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_REGISTERED_ONLY',
        loadsByPeriodStatus: {
          open: { added: { tonnageDelta: 0 }, adjusted: null },
          closed: null
        }
      })
    })

    it('shows open period section without tonnage language', async ({
      server
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(
        getByRole(main, 'heading', { level: 2, name: /open periods/i })
      ).toBeDefined()
      expect(queryByText(main, /tonnes/)).toBeNull()
    })
  })

  describe('loadsByPeriodStatus missing (not validated or prerequisites unavailable)', () => {
    beforeEach(() => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT'
      })
    })

    it('renders page without period sections', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(queryByText(main, /open periods/i)).toBeNull()
      expect(queryByText(main, /closed periods/i)).toBeNull()
    })

    it('still includes the submit form', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('Confirm upload'))
    })
  })

  describe('only closed period loads', () => {
    beforeEach(() => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT',
        loadsByPeriodStatus: {
          open: null,
          closed: { added: { tonnageDelta: 15 }, adjusted: null }
        }
      })
    })

    it('hides open period section and shows closed', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(queryByText(main, /open periods/i)).toBeNull()
      expect(
        getByRole(main, 'heading', { level: 2, name: /closed periods/i })
      ).toBeDefined()
      expect(queryByText(main, /15 tonnes/)).not.toBeNull()
    })
  })
})

describe('enhanced check page (feature flag off)', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

  beforeEach(() => {
    mockFetchSummaryLogStatus.mockReset().mockResolvedValue({
      status: 'preprocessing'
    })
  })

  it('renders the existing check page when flag is off', async ({ server }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT'
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toStrictEqual(
      expect.stringContaining('Check before confirming upload')
    )
    // Old check page has "New loads" heading, not "Open periods"
    expect(result).toStrictEqual(expect.stringContaining('New loads'))
    expect(result).not.toStrictEqual(expect.stringContaining('Open periods'))
  })
})
