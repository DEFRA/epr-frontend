import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { CADENCE, SUBMISSION_STATUS } from '#server/reports/constants.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  vi
} from 'vitest'

/**
 * @import { ServerInjectOptions } from '@hapi/hapi'
 * @import { DOMWindow } from 'jsdom'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-reporting-periods.js'))

const mockCredentials = {
  profile: {
    id: 'user-123',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

const mockAuth = /** @type {ServerInjectOptions['auth']} */ (
  /** @type {unknown} */ ({
    strategy: 'session',
    credentials: mockCredentials
  })
)

const accreditedRegistration = /** @type {RegistrationWithAccreditation} */ (
  /** @type {unknown} */ ({
    organisationData: { id: 'org-123' },
    registration: {
      id: 'reg-001',
      material: 'glass',
      glassRecyclingProcess: ['glass_re_melt'],
      wasteProcessingType: 'reprocessor',
      accreditationId: 'acc-001',
      registrationNumber: 'REG001234',
      site: {
        address: {
          line1: 'Manchester Glass Facility',
          town: 'Manchester',
          postcode: 'M1 1AA'
        }
      }
    },
    accreditation: {
      id: 'acc-001',
      status: 'approved'
    }
  })
)

const accreditedExporter = /** @type {RegistrationWithAccreditation} */ (
  /** @type {unknown} */ ({
    organisationData: { id: 'org-123' },
    registration: {
      id: 'reg-001',
      material: 'plastic',
      wasteProcessingType: 'exporter',
      registrationNumber: 'REG001234'
    },
    accreditation: {
      id: 'acc-002',
      status: 'approved'
    }
  })
)

const registeredOnlyExporter = /** @type {RegistrationWithAccreditation} */ (
  /** @type {unknown} */ ({
    organisationData: { id: 'org-456' },
    registration: {
      id: 'reg-002',
      material: 'plastic',
      wasteProcessingType: 'exporter',
      registrationNumber: 'REG002345'
    },
    accreditation: undefined
  })
)

const registeredOnlyReprocessor = /** @type {RegistrationWithAccreditation} */ (
  /** @type {unknown} */ ({
    organisationData: { id: 'org-789' },
    registration: {
      id: 'reg-003',
      material: 'plastic',
      wasteProcessingType: 'reprocessor',
      registrationNumber: 'REG003456',
      site: {
        address: {
          line1: 'North Road',
          town: 'Manchester',
          postcode: 'M1 1AA'
        }
      }
    },
    accreditation: undefined
  })
)

const monthlyResponse = {
  cadence: CADENCE.MONTHLY,
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      submissionNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      periodStatus: SUBMISSION_STATUS.OVERDUE,
      report: null
    },
    {
      year: 2026,
      period: 2,
      submissionNumber: 1,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      dueDate: '2026-03-20',
      periodStatus: SUBMISSION_STATUS.OVERDUE,
      report: null
    },
    {
      year: 2026,
      period: 3,
      submissionNumber: 1,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      dueDate: '2026-04-20',
      periodStatus: SUBMISSION_STATUS.DUE,
      report: null
    }
  ]
}

const quarterlyResponse = {
  cadence: CADENCE.QUARTERLY,
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      submissionNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      dueDate: '2026-04-20',
      periodStatus: SUBMISSION_STATUS.DUE,
      report: null
    }
  ]
}

const monthlyWithReportResponse = {
  cadence: CADENCE.MONTHLY,
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      submissionNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      periodStatus: SUBMISSION_STATUS.IN_PROGRESS,
      report: {
        id: 'report-001',
        status: SUBMISSION_STATUS.IN_PROGRESS,
        submittedAt: null,
        submittedBy: null
      }
    }
  ]
}

const monthlyWithReadyToSubmitResponse = {
  cadence: CADENCE.MONTHLY,
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      submissionNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      periodStatus: SUBMISSION_STATUS.READY_TO_SUBMIT,
      report: {
        id: 'report-002',
        status: SUBMISSION_STATUS.READY_TO_SUBMIT,
        submittedAt: null,
        submittedBy: null
      }
    }
  ]
}

const monthlyWithTwoReadyToSubmitResponse = {
  cadence: CADENCE.MONTHLY,
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      submissionNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      periodStatus: SUBMISSION_STATUS.READY_TO_SUBMIT,
      report: {
        id: 'report-003',
        status: SUBMISSION_STATUS.READY_TO_SUBMIT,
        submittedAt: null,
        submittedBy: null
      }
    },
    {
      year: 2026,
      period: 2,
      submissionNumber: 1,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      dueDate: '2026-03-20',
      periodStatus: SUBMISSION_STATUS.READY_TO_SUBMIT,
      report: {
        id: 'report-004',
        status: SUBMISSION_STATUS.READY_TO_SUBMIT,
        submittedAt: null,
        submittedBy: null
      }
    }
  ]
}

const monthlyWithSubmittedResponse = {
  cadence: CADENCE.MONTHLY,
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      submissionNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      periodStatus: SUBMISSION_STATUS.SUBMITTED,
      report: {
        id: 'report-002',
        status: SUBMISSION_STATUS.SUBMITTED,
        submittedAt: '2026-02-05T18:22:00.000Z',
        submittedBy: {
          id: 'user-1',
          name: 'Matt Davis',
          position: 'Approved person'
        }
      }
    }
  ]
}

const monthlyMixedStatusResponse = {
  cadence: CADENCE.MONTHLY,
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      submissionNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      periodStatus: SUBMISSION_STATUS.SUBMITTED,
      report: {
        id: 'report-001',
        status: SUBMISSION_STATUS.SUBMITTED,
        submittedAt: '2026-02-05T18:22:00.000Z',
        submittedBy: {
          id: 'user-1',
          name: 'Matt Davis',
          position: 'Approved person'
        }
      }
    },
    {
      year: 2026,
      period: 2,
      submissionNumber: 1,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      dueDate: '2026-03-20',
      periodStatus: SUBMISSION_STATUS.IN_PROGRESS,
      report: {
        id: 'report-002',
        status: SUBMISSION_STATUS.IN_PROGRESS,
        submittedAt: null,
        submittedBy: null
      }
    },
    {
      year: 2026,
      period: 3,
      submissionNumber: 1,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      dueDate: '2026-04-20',
      periodStatus: SUBMISSION_STATUS.DUE,
      report: null
    }
  ]
}

const emptyResponse = {
  cadence: CADENCE.MONTHLY,
  reportingPeriods: []
}

const accreditedUrl = '/organisations/org-123/registrations/reg-001/reports'
const exporterUrl = '/organisations/org-456/registrations/reg-002/reports'
const reprocessorUrl = '/organisations/org-789/registrations/reg-003/reports'

/** @param {InstanceType<DOMWindow['HTMLElement']>} body */
const extractTagData = (body) =>
  Array.from(body.querySelectorAll('.govuk-table .govuk-tag')).map((tag) => ({
    text: tag.textContent?.trim(),
    modifier:
      Array.from(tag.classList).find((c) => c.startsWith('govuk-tag--')) ?? null
  }))

/**
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 * @param {string} headingText
 */
const findSection = (body, headingText) => {
  const heading = Array.from(body.querySelectorAll('h3.govuk-heading-m')).find(
    (h) => h.textContent?.trim() === headingText
  )
  return heading?.nextElementSibling
}

/** @param {InstanceType<DOMWindow['Element']>} table */
const readTable = (table) => ({
  headers: Array.from(table.querySelectorAll('thead th')).map((th) =>
    th.textContent?.trim()
  ),
  rows: Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim())
  )
})

describe('#listReportsController', () => {
  beforeAll(() => {
    vi.useFakeTimers({
      now: new Date('2026-03-20T12:00:00Z'),
      toFake: ['Date']
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('for accredited operator (monthly periods)', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(monthlyResponse)
    })

    it('should return 200', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should display page heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const heading = getByRole(body, 'heading', {
        name: /Reports/,
        level: 1
      })

      expect(heading).toBeDefined()
    })

    it('should display back link to dashboard', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const backLink = body.querySelector('.govuk-back-link')

      expect(backLink).not.toBeNull()
      expect(backLink?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001'
      )
    })

    it('should render monthly periods in a table', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const table = body.querySelector('.govuk-table')

      expect(table).not.toBeNull()
      expect(table?.textContent).toContain('January 2026')
      expect(table?.textContent).toContain('February 2026')
      expect(table?.textContent).toContain('March 2026')
    })

    it('should display Create draft links for accredited reprocessor periods', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const selectLinks = body.querySelectorAll('.govuk-table a.govuk-link')

      expect(selectLinks).toHaveLength(3)
      expect(selectLinks[0]?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/1'
      )
      expect(selectLinks[0]?.textContent).toContain('Create draft')
    })

    it('should display column headers in order', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const headerTexts = Array.from(
        body.querySelectorAll('.govuk-table thead th')
      ).map((th) => th.textContent?.trim())

      expect(headerTexts).toStrictEqual(['Period', 'Status', 'Due date', ''])
    })

    it('should let the action-required columns hug their content rather than forcing quarter-widths', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const headerClasses = Array.from(
        body.querySelectorAll('.govuk-table thead th')
      ).map((th) => Array.from(th.classList))

      expect(
        headerClasses.some((classes) =>
          classes.includes('govuk-!-width-one-quarter')
        )
      ).toBe(false)
    })

    it('should display formatted due date per row', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const dueDateCells = Array.from(
        body.querySelectorAll('.govuk-table tbody tr')
      ).map((tr) => tr.querySelectorAll('td')[2]?.textContent?.trim())

      expect(dueDateCells).toStrictEqual([
        '20 Feb 2026',
        '20 Mar 2026',
        '20 Apr 2026'
      ])
    })

    it('should render a status tag per period from periodStatus', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const tagData = extractTagData(body)

      expect(tagData).toStrictEqual([
        { text: 'Overdue', modifier: 'govuk-tag--red' },
        { text: 'Overdue', modifier: 'govuk-tag--red' },
        { text: 'Due', modifier: 'govuk-tag--orange' }
      ])
    })
  })

  describe('for ended period with in_progress report', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(
        monthlyWithReportResponse
      )
    })

    it('should display In progress tag', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const tagData = extractTagData(body)

      expect(tagData).toStrictEqual([
        { text: 'In progress', modifier: 'govuk-tag--yellow' }
      ])
    })

    it('should display Continue link instead of Create draft', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const link = body.querySelector('.govuk-table a.govuk-link')

      expect(link).not.toBeNull()
      expect(link?.textContent).toContain('Continue')
      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/1/tonnes-recycled'
      )
    })

    it('should link Continue to prn-summary for accredited exporter', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedExporter
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const link = body.querySelector('.govuk-table a.govuk-link')

      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/1/prn-summary'
      )
    })

    it('should not display Due tag', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const tags = body.querySelectorAll('.govuk-table .govuk-tag')
      const dueTag = Array.from(tags).find(
        (tag) => tag.textContent?.trim() === 'Due'
      )

      expect(dueTag).toBeUndefined()
    })
  })

  describe('for ended period with ready_to_submit report', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(
        monthlyWithReadyToSubmitResponse
      )
    })

    it('should display Ready to submit tag', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const tagData = extractTagData(body)

      expect(tagData).toStrictEqual([
        { text: 'Ready to submit', modifier: null }
      ])
    })

    it('should display Review and submit link to submit page', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const link = body.querySelector('.govuk-table a.govuk-link')

      expect(link).not.toBeNull()
      expect(link?.textContent).toContain('Review and submit')
      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/1/submit'
      )
    })

    it('should display approved person banner with singular count', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const banner = body.querySelector('.govuk-warning-text__text')

      expect(banner?.textContent?.trim()).toContain(
        'Your approved person needs to review and submit 1 report.'
      )
    })
  })

  describe('for multiple ready_to_submit reports', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(
        monthlyWithTwoReadyToSubmitResponse
      )
    })

    it('should display approved person banner with plural count', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const banner = body.querySelector('.govuk-warning-text__text')

      expect(banner?.textContent?.trim()).toContain(
        'Your approved person needs to review and submit 2 reports.'
      )
    })
  })

  describe('for ended period with submitted report', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(
        monthlyWithSubmittedResponse
      )
    })

    it('should display Submitted tag', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const tagData = extractTagData(body)

      expect(tagData).toStrictEqual([
        { text: 'Submitted', modifier: 'govuk-tag--green' }
      ])
    })

    it('should display View link to view reports page', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const link = body.querySelector('.govuk-table a.govuk-link')

      expect(link).not.toBeNull()
      expect(link?.textContent).toContain('View')
      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/1/view'
      )
    })

    it('should render empty Date and time + Submitted by when backend has not supplied them yet', async ({
      server
    }) => {
      vi.mocked(fetchReportingPeriods).mockResolvedValue({
        cadence: CADENCE.MONTHLY,
        reportingPeriods: [
          {
            year: 2026,
            period: 1,
            submissionNumber: 1,
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            dueDate: '2026-02-20',
            periodStatus: SUBMISSION_STATUS.SUBMITTED,
            report: {
              id: 'report-002',
              status: SUBMISSION_STATUS.SUBMITTED,
              submittedAt: null,
              submittedBy: null
            }
          }
        ]
      })

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const cells = Array.from(
        body.querySelectorAll('.govuk-table tbody tr td')
      ).map((td) => td.textContent?.trim())

      expect(cells).toStrictEqual([
        'January 2026',
        'Submitted',
        '',
        '',
        'View report January 2026'
      ])
    })
  })

  describe('for mixed-status periods', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(
        monthlyMixedStatusResponse
      )
    })

    it('should display Action required and Submitted section headings', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const sectionHeadings = Array.from(
        body.querySelectorAll('h3.govuk-heading-m')
      ).map((h) => h.textContent?.trim())

      expect(sectionHeadings).toStrictEqual(['Action required', 'Submitted'])
    })

    it('should render the action-required table', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const actionRequiredTable = findSection(body, 'Action required')

      expect(readTable(actionRequiredTable)).toStrictEqual({
        headers: ['Period', 'Status', 'Due date', ''],
        rows: [
          [
            'February 2026',
            'In progress',
            '20 Mar 2026',
            'Continue February 2026'
          ],
          ['March 2026', 'Due', '20 Apr 2026', 'Create draft March 2026']
        ]
      })
    })

    it('should render the submitted table', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const submittedTable = findSection(body, 'Submitted')

      expect(readTable(submittedTable)).toStrictEqual({
        headers: ['Period', 'Status', 'Date and time', 'Submitted by', ''],
        rows: [
          [
            'January 2026',
            'Submitted',
            '5 Feb 2026, 6:22pm',
            'Matt Davis',
            'View report January 2026'
          ]
        ]
      })
    })
  })

  describe('when only active periods exist', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(monthlyResponse)
    })

    it('should display both section headings', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const sectionHeadings = Array.from(
        body.querySelectorAll('h3.govuk-heading-m')
      ).map((h) => h.textContent?.trim())

      expect(sectionHeadings).toStrictEqual(['Action required', 'Submitted'])
    })

    it('should render the submitted-section placeholder in place of a table', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const submittedSection = findSection(body, 'Submitted')

      expect({
        tag: submittedSection?.tagName,
        className: submittedSection?.className,
        text: submittedSection?.textContent?.trim()
      }).toStrictEqual({
        tag: 'P',
        className: 'govuk-body app-colour-secondary',
        text: 'You do not currently have any submitted reports.'
      })
    })

    it('should not display approved person banner when no Ready to submit reports', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      expect(body.querySelector('.govuk-warning-text')).toBeNull()
    })
  })

  describe('when only submitted periods exist', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(
        monthlyWithSubmittedResponse
      )
    })

    it('should display both section headings', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const sectionHeadings = Array.from(
        body.querySelectorAll('h3.govuk-heading-m')
      ).map((h) => h.textContent?.trim())

      expect(sectionHeadings).toStrictEqual(['Action required', 'Submitted'])
    })

    it('should render the action-required placeholder in place of a table', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const actionRequiredSection = findSection(body, 'Action required')

      expect({
        tag: actionRequiredSection?.tagName,
        className: actionRequiredSection?.className,
        text: actionRequiredSection?.textContent?.trim()
      }).toStrictEqual({
        tag: 'P',
        className: 'govuk-body app-colour-secondary',
        text: 'You do not currently have any reports that require an action.'
      })
    })
  })

  describe('for registered-only exporter (quarterly)', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        registeredOnlyExporter
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(quarterlyResponse)
    })

    it('should return 200', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render quarterly periods in a table', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const table = body.querySelector('.govuk-table')

      expect(table).not.toBeNull()
      expect(table?.textContent).toContain('Quarter 1, 2026')
    })

    it('should display Create draft links for exporter', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const selectLinks = body.querySelectorAll('.govuk-table a.govuk-link')

      expect(selectLinks).toHaveLength(1)
      expect(selectLinks[0]?.getAttribute('href')).toBe(
        '/organisations/org-456/registrations/reg-002/reports/2026/quarterly/1/submissions/1'
      )
      expect(selectLinks[0]?.textContent).toContain('Create draft')
    })

    it('should link Continue to tonnes-not-exported for in-progress report', async ({
      server
    }) => {
      vi.mocked(fetchReportingPeriods).mockResolvedValue({
        cadence: CADENCE.QUARTERLY,
        reportingPeriods: [
          {
            year: 2026,
            period: 1,
            submissionNumber: 1,
            startDate: '2026-01-01',
            endDate: '2026-03-31',
            dueDate: '2026-04-20',
            periodStatus: SUBMISSION_STATUS.IN_PROGRESS,
            report: {
              id: 'report-003',
              status: SUBMISSION_STATUS.IN_PROGRESS,
              submittedAt: null,
              submittedBy: null
            }
          }
        ]
      })

      const { result } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const link = body.querySelector('.govuk-table a.govuk-link')

      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-456/registrations/reg-002/reports/2026/quarterly/1/submissions/1/tonnes-not-exported'
      )
    })

    it('should default Continue link to supporting-information for unknown processing type', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
        ...registeredOnlyExporter,
        registration: {
          ...registeredOnlyExporter.registration,
          wasteProcessingType: 'unknown'
        }
      })
      vi.mocked(fetchReportingPeriods).mockResolvedValue({
        cadence: CADENCE.QUARTERLY,
        reportingPeriods: [
          {
            year: 2026,
            period: 1,
            submissionNumber: 1,
            startDate: '2026-01-01',
            endDate: '2026-03-31',
            dueDate: '2026-04-20',
            periodStatus: SUBMISSION_STATUS.IN_PROGRESS,
            report: {
              id: 'report-004',
              status: SUBMISSION_STATUS.IN_PROGRESS,
              submittedAt: null,
              submittedBy: null
            }
          }
        ]
      })

      const { result } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const link = body.querySelector('.govuk-table a.govuk-link')

      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-456/registrations/reg-002/reports/2026/quarterly/1/submissions/1/supporting-information'
      )
    })
  })

  describe('for registered-only reprocessor (quarterly)', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        registeredOnlyReprocessor
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(quarterlyResponse)
    })

    it('should display Create draft links for reprocessor periods', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const link = body.querySelector('.govuk-table a.govuk-link')

      expect(link).not.toBeNull()
      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-789/registrations/reg-003/reports/2026/quarterly/1/submissions/1'
      )
      expect(link?.textContent).toContain('Create draft')

      const hidden = link?.querySelector('.govuk-visually-hidden')
      expect(hidden?.textContent).toBe('Quarter 1, 2026')
    })
  })

  describe('when no periods have data', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(emptyResponse)
    })

    it('should display both section headings', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const sectionHeadings = Array.from(
        body.querySelectorAll('h3.govuk-heading-m')
      ).map((h) => h.textContent?.trim())

      expect(sectionHeadings).toStrictEqual(['Action required', 'Submitted'])
    })

    it('should render the action-required placeholder in place of a table', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const actionRequiredSection = findSection(body, 'Action required')

      expect({
        tag: actionRequiredSection?.tagName,
        className: actionRequiredSection?.className,
        text: actionRequiredSection?.textContent?.trim()
      }).toStrictEqual({
        tag: 'P',
        className: 'govuk-body app-colour-secondary',
        text: 'You do not currently have any reports that require an action.'
      })
    })

    it('should render the submitted-section placeholder in place of a table', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const submittedSection = findSection(body, 'Submitted')

      expect({
        tag: submittedSection?.tagName,
        className: submittedSection?.className,
        text: submittedSection?.textContent?.trim()
      }).toStrictEqual({
        tag: 'P',
        className: 'govuk-body app-colour-secondary',
        text: 'You do not currently have any submitted reports.'
      })
    })
  })

  describe('error handling', () => {
    it('should return 404 when registration not found', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockRejectedValue(
        Boom.notFound('Registration not found')
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('requires resubmission', () => {
    const CLOSED_PERIOD_FLAG = 'featureFlags.closedPeriodAdjustments'

    // One submitted report plus its requires_resubmission skeleton (the
    // submission-grained pair the backend emits for a restated closed period).
    const resubmissionPeriodPair = (period) => [
      {
        year: 2026,
        period,
        submissionNumber: 1,
        startDate: `2026-0${period}-01`,
        endDate: `2026-0${period}-28`,
        dueDate: `2026-0${period + 1}-20`,
        periodStatus: SUBMISSION_STATUS.SUBMITTED,
        report: {
          id: `report-00${period}`,
          status: SUBMISSION_STATUS.SUBMITTED,
          submittedAt: '2026-02-05T18:22:00.000Z',
          submittedBy: {
            id: 'user-1',
            name: 'Matt Davis',
            position: 'Approved person'
          }
        }
      },
      {
        year: 2026,
        period,
        submissionNumber: 2,
        startDate: `2026-0${period}-01`,
        endDate: `2026-0${period}-28`,
        dueDate: `2026-0${period + 1}-20`,
        periodStatus: SUBMISSION_STATUS.REQUIRES_RESUBMISSION,
        report: null
      }
    ]

    const monthlyWithResubmissionResponse = {
      cadence: CADENCE.MONTHLY,
      reportingPeriods: resubmissionPeriodPair(1)
    }

    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(
        monthlyWithResubmissionResponse
      )
    })

    afterEach(() => {
      config.reset(CLOSED_PERIOD_FLAG)
    })

    it('renders a Requires resubmission entry with a purple tag and create-draft CTA, keeping the original submitted report', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, true)

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })
      const { body } = new JSDOM(result).window.document

      const resubTag = Array.from(body.querySelectorAll('.govuk-tag')).find(
        (tag) => tag.textContent?.trim() === 'Requires resubmission'
      )
      expect(resubTag?.classList.contains('govuk-tag--purple')).toBe(true)
      expect(resubTag?.classList.contains('epr-tag--no-max-width')).toBe(true)

      const resubLink = Array.from(body.querySelectorAll('a.govuk-link')).find(
        (anchor) => anchor.textContent?.includes('Review and create draft')
      )
      expect(resubLink?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/2/resubmission-explainer'
      )

      expect(body.textContent).toContain('Matt Davis')
    })

    // The due-date column renders the absolute due date verbatim, whether or
    // not it has passed: the 'Overdue' wording belongs to the status column
    // alone. Both a past-due and a future due date are covered to pin that the
    // rendering does not vary by whether the date is behind or ahead of today.
    describe.each([
      {
        name: 'renders a past due date verbatim, never as Overdue',
        reportingPeriods: resubmissionPeriodPair(1),
        expectedRow: [
          'January 2026',
          'Requires resubmission',
          '20 Feb 2026',
          'Review and create draft January 2026'
        ]
      },
      {
        name: 'renders a future due date verbatim',
        reportingPeriods: resubmissionPeriodPair(3),
        expectedRow: [
          'March 2026',
          'Requires resubmission',
          '20 Apr 2026',
          'Review and create draft March 2026'
        ]
      }
    ])('due date column: $name', ({ reportingPeriods, expectedRow }) => {
      it('renders the action required row with the expected due date', async ({
        server
      }) => {
        config.set(CLOSED_PERIOD_FLAG, true)

        vi.mocked(fetchReportingPeriods).mockResolvedValue({
          cadence: CADENCE.MONTHLY,
          reportingPeriods
        })

        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })
        const { body } = new JSDOM(result).window.document

        const actionRequired = findSection(body, 'Action required')

        expect(readTable(actionRequired)).toStrictEqual({
          headers: ['Period', 'Status', 'Due date', ''],
          rows: [expectedRow]
        })
      })
    })

    it('hides the requires resubmission entry when the feature flag is off, keeping the original submitted report', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, false)

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })
      const { body } = new JSDOM(result).window.document

      const resubTag = Array.from(body.querySelectorAll('.govuk-tag')).find(
        (tag) => tag.textContent?.trim() === 'Requires resubmission'
      )
      expect(resubTag).toBeUndefined()

      expect(body.textContent).toContain('Matt Davis')
    })

    it('renders a requires resubmission entry for each affected period', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, true)

      vi.mocked(fetchReportingPeriods).mockResolvedValue({
        cadence: CADENCE.MONTHLY,
        reportingPeriods: [
          ...resubmissionPeriodPair(1),
          ...resubmissionPeriodPair(2)
        ]
      })

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })
      const { body } = new JSDOM(result).window.document

      const resubTags = Array.from(body.querySelectorAll('.govuk-tag')).filter(
        (tag) => tag.textContent?.trim() === 'Requires resubmission'
      )
      expect(resubTags).toHaveLength(2)
    })

    it('links a resubmission carrying an in-progress draft to Continue, keeping the purple tag', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, true)

      const [submitted, skeleton] = resubmissionPeriodPair(1)
      vi.mocked(fetchReportingPeriods).mockResolvedValue({
        cadence: CADENCE.MONTHLY,
        reportingPeriods: [
          submitted,
          {
            ...skeleton,
            report: {
              id: 'draft-2',
              status: SUBMISSION_STATUS.IN_PROGRESS,
              submittedAt: null,
              submittedBy: null
            }
          }
        ]
      })

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })
      const { body } = new JSDOM(result).window.document

      const resubTag = Array.from(body.querySelectorAll('.govuk-tag')).find(
        (tag) => tag.textContent?.trim() === 'Requires resubmission'
      )
      expect(resubTag?.classList.contains('govuk-tag--purple')).toBe(true)

      const link = Array.from(body.querySelectorAll('a.govuk-link')).find(
        (anchor) => anchor.textContent?.includes('Continue')
      )
      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/2/tonnes-recycled'
      )
    })

    it('links a resubmission carrying a ready-to-submit draft to Review and submit and counts it in the banner', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, true)

      const [submitted, skeleton] = resubmissionPeriodPair(1)
      vi.mocked(fetchReportingPeriods).mockResolvedValue({
        cadence: CADENCE.MONTHLY,
        reportingPeriods: [
          submitted,
          {
            ...skeleton,
            report: {
              id: 'draft-2',
              status: SUBMISSION_STATUS.READY_TO_SUBMIT,
              submittedAt: null,
              submittedBy: null
            }
          }
        ]
      })

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })
      const { body } = new JSDOM(result).window.document

      const resubTag = Array.from(body.querySelectorAll('.govuk-tag')).find(
        (tag) => tag.textContent?.trim() === 'Requires resubmission'
      )
      expect(resubTag?.classList.contains('govuk-tag--purple')).toBe(true)

      const link = Array.from(body.querySelectorAll('a.govuk-link')).find(
        (anchor) => anchor.textContent?.includes('Review and submit')
      )
      expect(link?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/2/submit'
      )

      expect(body.textContent).toContain('review and submit 1 report')
    })
  })

  describe('resubmitted (submitted period with submissionNumber > 1)', () => {
    const CLOSED_PERIOD_FLAG = 'featureFlags.closedPeriodAdjustments'

    // Once a resubmission is itself submitted the backend collapses the period
    // to a single submitted item carrying submissionNumber 2.
    const resubmittedResponse = {
      cadence: CADENCE.MONTHLY,
      reportingPeriods: [
        {
          year: 2026,
          period: 1,
          submissionNumber: 2,
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          dueDate: '2026-02-20',
          periodStatus: SUBMISSION_STATUS.SUBMITTED,
          report: {
            id: 'report-001',
            status: SUBMISSION_STATUS.SUBMITTED,
            submittedAt: '2026-02-05T18:22:00.000Z',
            submittedBy: {
              id: 'user-1',
              name: 'Matt Davis',
              position: 'Approved person'
            }
          }
        }
      ]
    }

    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedRegistration
      )
      vi.mocked(fetchReportingPeriods).mockResolvedValue(resubmittedResponse)
    })

    afterEach(() => {
      config.reset(CLOSED_PERIOD_FLAG)
    })

    it('renders the period as Resubmitted with a green tag and View report in the Submitted table', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, true)

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })
      const { body } = new JSDOM(result).window.document

      expect(findSection(body, 'Action required')?.textContent).not.toContain(
        'January 2026'
      )

      const submittedTable = findSection(body, 'Submitted')
      expect(readTable(submittedTable)).toStrictEqual({
        headers: ['Period', 'Status', 'Date and time', 'Submitted by', ''],
        rows: [
          [
            'January 2026',
            'Resubmitted',
            '5 Feb 2026, 6:22pm',
            'Matt Davis',
            'View report January 2026'
          ]
        ]
      })

      const tag = Array.from(body.querySelectorAll('.govuk-tag')).find(
        (t) => t.textContent?.trim() === 'Resubmitted'
      )
      expect(tag?.classList.contains('govuk-tag--green')).toBe(true)

      // View report must open the resubmission (submissionNumber 2), the report
      // that replaced the original, not the superseded submissionNumber 1.
      const viewLink = submittedTable?.querySelector('a.govuk-link')
      expect(viewLink?.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submissions/2/view'
      )
    })

    it('renders the period as Submitted when the feature flag is off', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, false)

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })
      const { body } = new JSDOM(result).window.document

      const tagData = extractTagData(body)
      expect(tagData).toStrictEqual([
        { text: 'Submitted', modifier: 'govuk-tag--green' }
      ])
    })
  })
})
