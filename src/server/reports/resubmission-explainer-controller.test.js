import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

vi.mock(import('./helpers/fetch-report-detail.js'))

const mockAuth = buildMockAuth()

/**
 * @param {ReportDetailResponse['resubmissionRequired']} resubmissionRequired
 * @returns {ReportDetailResponse}
 */
const buildResubmissionDetail = (resubmissionRequired) =>
  /** @type {ReportDetailResponse} */ ({ resubmissionRequired })

const operatorRequested = {
  requestedAt: '2026-02-10T09:00:00.000Z',
  requestedBy: { id: 'user-1', name: 'Ada Operator', position: 'Manager' }
}

const closedPeriodRestated = {
  uploadedAt: '2026-02-08T09:00:00.000Z',
  summaryLogId: 'sl-001'
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`
const periodPath = `${reportsUrl}/2026/monthly/2/submissions/2`
const explainerUrl = `${periodPath}/resubmission-explainer`

describe('#resubmissionExplainerController', () => {
  beforeEach(() => {
    vi.mocked(fetchReportDetail).mockResolvedValue(
      buildResubmissionDetail(undefined)
    )
  })

  describe('when it is a resubmission', () => {
    it('should return 200', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render the create-draft caption', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('.govuk-caption-xl').textContent).toContain(
        'Create draft report'
      )
    })

    it('should render the period-specific heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Why your February, 2026 report needs to be resubmitted'
      )
    })

    it('should render a quarterly period label in the heading', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: `${reportsUrl}/2026/quarterly/1/submissions/2/resubmission-explainer`,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Why your Quarter 1, 2026 report needs to be resubmitted'
      )
    })

    it('should render the three explanatory paragraphs', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.textContent).toContain(
        'Your summary log data for this period has been changed since the report was submitted to your regulator.'
      )
      expect(body.textContent).toContain(
        'You need to create a new draft report that an approved person will need to submit in order to remain compliant with the regulations.'
      )
      expect(body.textContent).toContain(
        'Your old February, 2026 report can still be viewed from the reports page until the new report replaces it after submission.'
      )
    })

    it('should render a Continue button linking to the period path', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const button = getByText(body, 'Continue')

      expect(button.closest('a').getAttribute('href')).toBe(periodPath)
    })

    it('should render a Cancel and return to home link to the reports page', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const link = getByText(body, 'Cancel and return to home')

      expect(link.getAttribute('href')).toBe(reportsUrl)
    })

    it('should render a back link to the reports page', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('.govuk-back-link').getAttribute('href')).toBe(
        reportsUrl
      )
    })
  })

  describe('when the resubmission was operator-initiated', () => {
    beforeEach(() => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        buildResubmissionDetail({ operatorRequested })
      )
    })

    it('should render the operator-initiated heading without "Why"', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const heading = body.querySelector('h1').textContent

      expect(heading).toContain(
        'Your February, 2026 report needs to be resubmitted'
      )
      expect(heading).not.toContain('Why')
    })

    it('should render the operator-initiated first paragraph', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.textContent).toContain(
        'You started to make changes to the report, but did not resubmit the new draft.'
      )
    })

    it('should render the operator-initiated second paragraph', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.textContent).toContain(
        'You need to create the new draft report and an approved person will need to submit it in order to remain compliant with the regulations.'
      )
    })
  })

  describe('when the resubmission was a closed-period restatement', () => {
    beforeEach(() => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        buildResubmissionDetail({ closedPeriodRestated })
      )
    })

    it('should render the data-changed heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Why your February, 2026 report needs to be resubmitted'
      )
    })

    it('should render the data-changed first paragraph', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.textContent).toContain(
        'Your summary log data for this period has been changed since the report was submitted to your regulator.'
      )
    })
  })

  // The backend does not currently produce a both-causes state where the
  // operator request is the more recent: resubmissionEligibility returns
  // ALREADY_REQUESTED once any resubmissionRequired key exists, and the pre-CPA
  // backfill skips already-flagged reports, so operatorRequested is only ever
  // written before closedPeriodRestated (stamped at flag time). These tests
  // therefore pin the tie-break as defensive code, not a live business rule.
  describe('when both resubmission causes are recorded (defensive tie-break)', () => {
    it('should show the operator copy when the operator request is more recent', async ({
      server
    }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        buildResubmissionDetail({ operatorRequested, closedPeriodRestated })
      )

      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Your February, 2026 report needs to be resubmitted'
      )
      expect(body.textContent).toContain(
        'You started to make changes to the report, but did not resubmit the new draft.'
      )
    })

    it('should show the operator copy when the timestamps are equal', async ({
      server
    }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        buildResubmissionDetail({
          operatorRequested,
          closedPeriodRestated: {
            uploadedAt: operatorRequested.requestedAt,
            summaryLogId: 'sl-001'
          }
        })
      )

      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Your February, 2026 report needs to be resubmitted'
      )
      expect(body.querySelector('h1').textContent).not.toContain('Why')
    })

    it('should show the data-changed copy when the restatement is more recent', async ({
      server
    }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        buildResubmissionDetail({
          operatorRequested,
          closedPeriodRestated: {
            uploadedAt: '2026-02-12T09:00:00.000Z',
            summaryLogId: 'sl-001'
          }
        })
      )

      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Why your February, 2026 report needs to be resubmitted'
      )
    })
  })

  describe('fetching the resubmission cause', () => {
    it('should read the submitted report at submissionNumber - 1', async ({
      server
    }) => {
      await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      expect(fetchReportDetail).toHaveBeenCalledWith(
        organisationId,
        registrationId,
        2026,
        'monthly',
        2,
        1,
        'mock-id-token'
      )
    })
  })

  describe('when fetching the resubmission cause fails', () => {
    beforeEach(() => {
      vi.mocked(fetchReportDetail).mockRejectedValue(new Error('backend down'))
    })

    it('should still return 200', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should fall back to the data-changed copy', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Why your February, 2026 report needs to be resubmitted'
      )
      expect(body.textContent).toContain(
        'Your summary log data for this period has been changed since the report was submitted to your regulator.'
      )
    })
  })

  describe('guards', () => {
    it('should return 404 for a first submission (not a resubmission)', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `${reportsUrl}/2026/monthly/2/submissions/1/resubmission-explainer`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})

/**
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 */
