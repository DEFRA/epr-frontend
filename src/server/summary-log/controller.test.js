import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { extractCookieValues } from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import {
  getAllByRole,
  getAllByText,
  getByRole,
  getByTestId,
  getByText,
  queryAllByRole,
  queryAllByText,
  queryByRole,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { summaryLogStatuses } from '../common/constants/statuses.js'

/**
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { WasteRecordType } from '#domain/waste-records/model.js'
 * @import { LoadRow, PeriodStatusByChange, SummaryLogStatusResponse } from './types.js'
 */

const mockUploadUrl = 'https://storage.example.com/upload?signature=abc123'

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
const mockInitiateSummaryLogUpload = vi.mocked(initiateSummaryLogUpload, {
  partial: true,
  deep: true
})
const mockSubmitSummaryLog = vi.mocked(submitSummaryLog, {
  partial: true,
  deep: true
})
const mockFetchRegistrationAndAccreditation = vi.mocked(
  fetchRegistrationAndAccreditation,
  { partial: true, deep: true }
)
const mockFetchWasteBalances = vi.mocked(fetchWasteBalances, {
  partial: true,
  deep: true
})

const mockAuth = buildMockAuth({ idToken: 'test-id-token' })

const enablesClientSidePolling = () =>
  expect.stringContaining('meta http-equiv="refresh"')

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs`
  const summaryLogBaseUrl = `${baseUrl}/${summaryLogId}`
  const url = summaryLogBaseUrl

  beforeEach(() => {
    mockFetchSummaryLogStatus.mockReset().mockResolvedValue({
      status: 'preprocessing'
    })

    mockInitiateSummaryLogUpload.mockReset().mockResolvedValue({
      uploadUrl: mockUploadUrl,
      uploadId: 'new-upload-id-123'
    })

    mockSubmitSummaryLog.mockReset()
  })

  it('should provide expected response', async ({ server }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(fetchSummaryLogStatus).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId,
      { idToken: 'test-id-token' }
    )
    expect(result).toStrictEqual(expect.stringContaining('Summary log |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  describe('processing states', () => {
    it('status: preprocessing - should show processing message and poll', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.preprocessing
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const pageBody = getByTestId(body, 'app-page-body')

      /* eslint-disable vitest/max-expects */
      expect(
        getByRole(pageBody, 'heading', {
          level: 1,
          name: 'Your summary log is being checked'
        })
      ).toBeDefined()
      const paragraphs = getAllByRole(pageBody, 'paragraph')
      expect(paragraphs[0].textContent?.trim()).toBe(
        'The file is being checked for:'
      )
      expect(
        getAllByRole(pageBody, 'listitem').map((li) => li.textContent?.trim())
      ).toStrictEqual([
        'errors',
        'new data',
        'changes to previously uploaded data'
      ])
      expect(paragraphs[1].textContent?.trim()).toBe(
        'This may take a few minutes.'
      )
      expect(paragraphs[2].textContent?.trim()).toBe(
        'Keep this page open and do not refresh it.'
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
      /* eslint-enable vitest/max-expects */
    })

    it('status: validating - should show processing message and poll', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validating
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Your summary log is being checked')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submitting - should show submitting message and poll', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitting
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Your waste records are being updated')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('This may take a few minutes.')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open and do not refresh it.')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('terminal states', () => {
    it('status: submitted - should show success page and stop polling', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted,
        accreditationNumber: 'ACC-2025-001'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log uploaded')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'You can upload an updated summary log whenever you need to provide new data.'
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('Return to home'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: submitted - should link to organisation root', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining(`href="/organisations/${organisationId}"`)
      )
    })

    describe('waste balance', () => {
      it('status: submitted - should fetch waste balance data', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        mockFetchWasteBalances.mockResolvedValueOnce({
          [accreditationId]: {
            amount: 1000,
            availableAmount: 1234.56
          }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          'test-id-token'
        )
        expect(fetchWasteBalances).toHaveBeenCalledWith(
          organisationId,
          [accreditationId],
          'test-id-token'
        )
      })

      it.for([
        { label: 'a balance', availableAmount: 1234.56, expected: '1,234.56' },
        { label: 'a zero balance', availableAmount: 0, expected: '0.00' }
      ])(
        'status: submitted - should display $label in the confirmation panel',
        async ({ availableAmount, expected }, { server }) => {
          const accreditationId = 'accreditation-id-456'

          mockFetchSummaryLogStatus.mockResolvedValueOnce({
            status: summaryLogStatuses.submitted,
            accreditationNumber: 'ACC-2025-001'
          })

          mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
            organisationData: { id: organisationId },
            registration: { id: registrationId, accreditationId },
            accreditation: {
              id: accreditationId,
              accreditationNumber: 'ACC-2025-001'
            }
          })

          mockFetchWasteBalances.mockResolvedValueOnce({
            [accreditationId]: {
              amount: 1000,
              availableAmount
            }
          })

          const { result } = await server.inject({
            method: 'GET',
            url,
            auth: mockAuth
          })

          const { body } = new JSDOM(result).window.document
          const panelBody = body.querySelector(
            '.govuk-panel--confirmation .govuk-panel__body'
          )

          expect(panelBody).not.toBeNull()
          expect(panelBody?.textContent).toContain(
            'Your updated waste balance is'
          )
          expect(panelBody?.textContent).toContain(expected)
          expect(panelBody?.textContent).toContain('tonnes')
        }
      )

      it('status: submitted - should not display waste balance section when balance unavailable', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId },
          accreditation: undefined
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document

        expect(statusCode).toBe(statusCodes.ok)
        expect(body.querySelector('.govuk-panel--confirmation')).not.toBeNull()
        expect(body.querySelector('.govuk-panel__body')).toBeNull()
        expect(result).not.toContain('Your updated waste balance')
      })

      it('status: submitted - should not display waste balance when balance not found', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        mockFetchWasteBalances.mockResolvedValueOnce({})

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toContain('Your updated waste balance')
      })

      it('status: submitted - should handle waste balance fetch failure gracefully', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'
        const fetchError = new Error('Waste balance service unavailable')

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        mockFetchWasteBalances.mockRejectedValueOnce(fetchError)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('Summary log uploaded')
        expect(result).not.toContain('Your updated waste balance')

        expect(server.loggerMocks.error).toHaveBeenCalledWith({
          message: 'Failed to fetch waste balance data',
          err: fetchError
        })
      })

      it('status: submitted - should propagate 404 when registration not found', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockRejectedValueOnce(
          Boom.notFound('Registration not found')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })
    })

    describe('closed-period adjustments "Further action needed" section', () => {
      const CLOSED_PERIOD_FLAG = 'featureFlags.closedPeriodAdjustments'

      const ZERO_CHANGE = {
        balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
        nonBalanceAffecting: { count: 0, rows: [] }
      }
      const emptyPeriod = () => ({ added: ZERO_CHANGE, adjusted: ZERO_CHANGE })

      const submittedWithClosedAdjustment = () => ({
        status: summaryLogStatuses.submitted,
        loadsByReportingPeriod: {
          openPeriodLoads: emptyPeriod(),
          closedPeriodLoads: {
            added: ZERO_CHANGE,
            adjusted: {
              balanceAffecting: { count: 2, tonnageDelta: -4, rows: [] },
              nonBalanceAffecting: { count: 0, rows: [] }
            }
          }
        }
      })

      const getMain = async (server) => {
        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })
        const { body } = new JSDOM(result).window.document
        return getByRole(body, 'main')
      }

      afterEach(() => {
        config.reset(CLOSED_PERIOD_FLAG)
      })

      it('shows the section and a "Go to reports" link when the flag is on and a closed period changed', async ({
        server
      }) => {
        config.set(CLOSED_PERIOD_FLAG, true)
        mockFetchSummaryLogStatus.mockResolvedValueOnce(
          submittedWithClosedAdjustment()
        )

        const main = await getMain(server)
        const reportsButton = queryByRole(main, 'button', {
          name: 'Go to reports'
        })

        expect(
          queryByRole(main, 'heading', { name: 'Further action needed' })
        ).not.toBeNull()
        expect(reportsButton).not.toBeNull()
        expect(reportsButton?.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      })

      it('hides the section when no closed period changed', async ({
        server
      }) => {
        config.set(CLOSED_PERIOD_FLAG, true)
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          loadsByReportingPeriod: {
            openPeriodLoads: {
              added: {
                balanceAffecting: { count: 1, tonnageDelta: 2, rows: [] },
                nonBalanceAffecting: { count: 0, rows: [] }
              },
              adjusted: ZERO_CHANGE
            },
            closedPeriodLoads: emptyPeriod()
          }
        })

        const main = await getMain(server)

        expect(
          queryByRole(main, 'heading', { name: 'Further action needed' })
        ).toBeNull()
        expect(
          queryByRole(main, 'button', { name: 'Go to reports' })
        ).toBeNull()
      })

      it('hides the section when the closed-period flag is off', async ({
        server
      }) => {
        config.set(CLOSED_PERIOD_FLAG, false)
        mockFetchSummaryLogStatus.mockResolvedValueOnce(
          submittedWithClosedAdjustment()
        )

        const main = await getMain(server)

        expect(
          queryByRole(main, 'heading', { name: 'Further action needed' })
        ).toBeNull()
      })
    })

    it('status: submitted with freshData from POST - should use freshData and not call backend', async ({
      server
    }) => {
      const submitUrl = `${url}/submit`

      mockSubmitSummaryLog.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted,
        accreditationNumber: 'ACC-2025-002'
      })

      const { cookie, crumb } = await getCsrfToken(server, url, {
        auth: mockAuth
      })

      const postResponse = await server.inject({
        method: 'POST',
        url: submitUrl,
        headers: { cookie },
        payload: { crumb },
        auth: mockAuth
      })

      expect(postResponse.statusCode).toBe(statusCodes.found)

      const cookieHeader = extractCookieValues(
        postResponse.headers['set-cookie']
      ).join('; ')

      const initialCallCount = mockFetchSummaryLogStatus.mock.calls.length

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        headers: {
          cookie: cookieHeader
        },
        auth: mockAuth
      })

      expect(fetchSummaryLogStatus).toHaveBeenCalledTimes(initialCallCount)

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log uploaded')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: rejected with validation failure code - should show validation failures page', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ errorCode: 'FILE_VIRUS_DETECTED' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('The selected file contains a virus')
    })

    describe('located cell errors (per-cell detail)', () => {
      const locatedFailure = {
        errorCode: 'MUST_BE_A_NUMBER',
        location: {
          sheet: 'Reprocessing',
          table: 'RECEIVED_LOADS_FOR_REPROCESSING',
          row: 8,
          rowId: '1003',
          column: 'D',
          header: 'NET_WEIGHT'
        },
        actual: 'abc'
      }

      const pageBody = (result) =>
        getByTestId(new JSDOM(result).window.document.body, 'app-page-body')

      const dataRows = (table) =>
        getAllByRole(getAllByRole(table, 'rowgroup')[1], 'row')

      const rowCells = (row) =>
        getAllByRole(row, 'cell').map((cell) => cell.textContent?.trim())

      it('should render a per-cell detail row instead of a collapsed category message', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: { failures: [locatedFailure] }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const table = getByRole(pageBody(result), 'table')
        const cells = rowCells(dataRows(table)[0])

        expect(cells).toStrictEqual([
          '1003',
          'Loads received',
          'Net weight',
          'D8',
          'abc',
          'Must be a number'
        ])
      })

      it('should render all records in one flat table with a Section column, sorting ROW_ID within each section', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [
              {
                errorCode: 'MUST_BE_A_NUMBER',
                actual: 'x',
                location: {
                  sheet: 'Reprocessing',
                  table: 'RECEIVED_LOADS_FOR_REPROCESSING',
                  row: 10,
                  rowId: '1003',
                  column: 'D',
                  header: 'NET_WEIGHT'
                }
              },
              {
                errorCode: 'MUST_BE_A_NUMBER',
                actual: 'y',
                location: {
                  sheet: 'Reprocessing',
                  table: 'RECEIVED_LOADS_FOR_REPROCESSING',
                  row: 8,
                  rowId: '1001',
                  column: 'D',
                  header: 'NET_WEIGHT'
                }
              },
              {
                errorCode: 'MUST_BE_A_VALID_DATE',
                actual: 'z',
                location: {
                  sheet: 'Reprocessing',
                  table: 'SENT_ON_LOADS_FOR_REPROCESSING',
                  row: 8,
                  rowId: '1001',
                  column: 'H',
                  header: 'DATE_OF_EXPORT'
                }
              }
            ]
          }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const scope = pageBody(result)
        const tables = getAllByRole(scope, 'table')
        const worksheetHeadings = queryAllByRole(scope, 'heading', {
          level: 2
        })
        const rows = dataRows(tables[0])
        const rowIdColumn = rows.map((row) => rowCells(row)[0])
        const sectionColumn = rows.map((row) => rowCells(row)[1])

        expect(tables).toHaveLength(1)
        expect(worksheetHeadings).toHaveLength(0)
        expect(rowIdColumn).toStrictEqual(['1001', '1003', '1001'])
        expect(sectionColumn).toStrictEqual([
          'Loads received',
          'Loads received',
          'Reprocessing'
        ])
      })

      it('should state how many errors were found', async ({ server }) => {
        const located = (rowId, column) => ({
          errorCode: 'MUST_BE_A_NUMBER',
          actual: 'x',
          location: {
            sheet: 'Received',
            table: 'RECEIVED_LOADS_FOR_REPROCESSING',
            row: 8,
            rowId,
            column,
            header: 'NET_WEIGHT'
          }
        })

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [
              located('1001', 'D'),
              located('1002', 'E'),
              located('1003', 'F')
            ]
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(result).toContain('We found 3 errors in your summary log')
      })

      it('should fold the cap notice into the count line, showing the exact total, when counts are present', async ({
        server
      }) => {
        const failures = Array.from({ length: 100 }, (_, i) => ({
          errorCode: 'MUST_BE_A_NUMBER',
          actual: 'x',
          location: {
            sheet: 'Received',
            table: 'RECEIVED_LOADS_FOR_REPROCESSING',
            row: i + 4,
            rowId: String(1000 + i),
            column: 'D',
            header: 'NET_WEIGHT'
          }
        }))

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures,
            counts: { fatal: 150, error: 0, warning: 0, total: 150 }
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const table = getByRole(pageBody(result), 'table')

        expect(result).toContain(
          'We found 150 errors in your summary log, but can only display 50 of them at the moment'
        )
        expect(dataRows(table)).toHaveLength(50)
      })

      it('should not show a cap notice below the 50 limit', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: { failures: [locatedFailure] }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(result).not.toContain('can only display')
      })

      it('should show "(empty)" when the failing cell has no value', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [
              {
                errorCode: 'FIELD_REQUIRED',
                location: {
                  sheet: 'Reprocessing',
                  table: 'RECEIVED_LOADS_FOR_REPROCESSING',
                  row: 8,
                  rowId: '1001',
                  column: 'C',
                  header: 'EWC_CODE'
                }
              }
            ]
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const table = getByRole(pageBody(result), 'table')
        const [, , , , valueCell] = rowCells(dataRows(table)[0])

        expect(valueCell).toBe('(empty)')
      })

      it('should render located errors as a table while keeping meta-level category messages', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [locatedFailure, { errorCode: 'REGISTRATION_MISMATCH' }]
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const tables = getAllByRole(pageBody(result), 'table')

        expect(tables).toHaveLength(1)
        expect(result).toContain('Registration number on summary log')
      })

      it.for([
        ['MUST_BE_A_NUMBER', 'GROSS_WEIGHT', 'Must be a number'],
        ['MUST_BE_AT_MOST_1000', 'GROSS_WEIGHT', 'Must be 1,000 or less'],
        ['MUST_BE_AT_LEAST_ZERO', 'TARE_WEIGHT', 'Must be 0 or more'],
        ['MUST_BE_GREATER_THAN_ZERO', 'PALLET_WEIGHT', 'Must be more than 0'],
        [
          'MUST_BE_LESS_THAN_1',
          'RECYCLABLE_PROPORTION_PERCENTAGE',
          'Must be less than 1'
        ],
        [
          'MUST_BE_AT_MOST_1',
          'UK_PACKAGING_WEIGHT_PERCENTAGE',
          'Must be 1 or less'
        ],
        [
          'MUST_BE_A_VALID_DATE',
          'DATE_OF_EXPORT',
          'Must be a valid date in the format dd/mm/yyyy'
        ],
        ['MUST_BE_YES_OR_NO', 'BAILING_WIRE_PROTOCOL', 'Must be Yes or No'],
        [
          'MUST_BE_VALID_EWC_CODE',
          'EWC_CODE',
          'Select a value from the drop-down list'
        ],
        [
          'MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS',
          'CONTAINER_NUMBER',
          'Contains characters that are not allowed'
        ],
        [
          'MUST_BE_AT_MOST_100_CHARS',
          'CUSTOMS_CODES',
          'Must be 100 characters or fewer'
        ],
        ['MUST_BE_3_DIGIT_ID', 'OSR_ID', 'Must be a 3-digit number'],
        [
          'NET_WEIGHT_CALCULATION_MISMATCH',
          'NET_WEIGHT',
          'Does not match the calculated value'
        ],
        ['MUST_BE_A_STRING', 'ADD_PRODUCT_WEIGHT', 'Must be Yes or No'],
        [
          'MUST_BE_A_STRING',
          'EWC_CODE',
          'Select a value from the drop-down list'
        ],
        ['FIELD_REQUIRED', 'GROSS_WEIGHT', 'Check this value']
      ])(
        'maps errorCode %s to its per-cell problem',
        async ([errorCode, header, expectedProblem], { server }) => {
          mockFetchSummaryLogStatus.mockResolvedValueOnce({
            status: summaryLogStatuses.invalid,
            validation: {
              failures: [
                {
                  errorCode,
                  actual: 'x',
                  location: {
                    sheet: 'Received',
                    table: 'RECEIVED_LOADS_FOR_REPROCESSING',
                    row: 4,
                    rowId: '1001',
                    column: 'D',
                    header
                  }
                }
              ]
            }
          })

          const { result } = await server.inject({
            method: 'GET',
            url,
            auth: mockAuth
          })

          const table = getByRole(pageBody(result), 'table')
          const cells = rowCells(dataRows(table)[0])
          const problem = cells.at(-1)

          expect(problem).toBe(expectedProblem)
        }
      )

      it('should show a human-readable column label, not the raw header code', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [
              {
                errorCode: 'MUST_BE_VALID_EWC_CODE',
                actual: '99',
                location: {
                  sheet: 'Received',
                  table: 'RECEIVED_LOADS_FOR_REPROCESSING',
                  row: 9,
                  rowId: '1002',
                  column: 'F',
                  header: 'EWC_CODE'
                }
              }
            ]
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const table = getByRole(pageBody(result), 'table')
        const [, , columnCell] = rowCells(dataRows(table)[0])

        expect(columnCell).toBe('EWC code')
      })

      it('should fall back to the worksheet name as the Section when the table has no distinct label', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [
              {
                errorCode: 'MUST_BE_A_NUMBER',
                actual: 'x',
                location: {
                  sheet: 'Reprocessing',
                  table: 'UNMAPPED_TABLE',
                  row: 8,
                  rowId: '1001',
                  column: 'D',
                  header: 'NET_WEIGHT'
                }
              }
            ]
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const table = getByRole(pageBody(result), 'table')
        const [, sectionCell] = rowCells(dataRows(table)[0])

        expect(sectionCell).toBe('Reprocessing')
      })

      it('should rowspan the Row ID across a record with multiple failing cells', async ({
        server
      }) => {
        const failingCell = (column, header) => ({
          errorCode: 'MUST_BE_A_NUMBER',
          actual: 'x',
          location: {
            sheet: 'Received',
            table: 'RECEIVED_LOADS_FOR_REPROCESSING',
            row: 8,
            rowId: '1000',
            column,
            header
          }
        })

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [
              failingCell('K', 'GROSS_WEIGHT'),
              failingCell('L', 'TARE_WEIGHT'),
              failingCell('M', 'PALLET_WEIGHT')
            ]
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const table = getByRole(pageBody(result), 'table')
        const rows = dataRows(table)
        const rowIdCells = getAllByRole(table, 'cell').filter(
          (cell) => cell.textContent?.trim() === '1000'
        )
        const sectionCells = getAllByRole(table, 'cell').filter(
          (cell) => cell.textContent?.trim() === 'Loads received'
        )

        expect(rowIdCells).toHaveLength(1)
        expect(rowIdCells[0].getAttribute('rowspan')).toBe('3')
        expect(sectionCells).toHaveLength(1)
        expect(sectionCells[0].getAttribute('rowspan')).toBe('3')
        expect(rows).toHaveLength(3)
      })
    })

    // Codes that resolve via the direct-key fallback to their own
    // `failure.<code>` copy. Without that copy they would silently render the
    // technical-error defaultValue, so each case asserts the tailored message
    // AND the absence of the fallback.
    const technicalErrorCopy =
      'Sorry, there is a problem with the service - try again later'

    it.for([
      {
        errorCode: 'FILE_EMPTY',
        status: summaryLogStatuses.rejected,
        copy: 'The selected file is empty'
      },
      {
        errorCode: 'FILE_TOO_LARGE',
        status: summaryLogStatuses.rejected,
        copy: 'The selected file must be smaller than 100MB'
      },
      {
        errorCode: 'FILE_WRONG_TYPE',
        status: summaryLogStatuses.rejected,
        copy: 'The selected file must be a .XLSX'
      },
      {
        errorCode: 'PROCESSING_TYPE_DATA_INVALID',
        status: summaryLogStatuses.invalid,
        copy: 'There is a problem with your registration - please contact support'
      },
      {
        errorCode: 'TEMPLATE_VERSION_REQUIRED',
        status: summaryLogStatuses.invalid,
        copy: 'The template version could not be determined'
      },
      {
        errorCode: 'TEMPLATE_VERSION_INVALID',
        status: summaryLogStatuses.invalid,
        copy: 'The template version is not recognised'
      }
    ])(
      'status: $status with $errorCode - should render its tailored failure copy, not the technical-error fallback',
      async ({ errorCode, status, copy }, { server }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status,
          validation: { failures: [{ errorCode }] }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document

        expect(statusCode).toBe(statusCodes.ok)
        expect(getByText(body, copy)).toBeDefined()
        expect(queryByText(body, technicalErrorCopy)).toBeNull()
      }
    )

    it('status: rejected - should initiate upload with pre-signed URL', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ errorCode: 'FILE_VIRUS_DETECTED' }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: rejected without validation - should show validation failures page with technical error', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with validation failures - should show validation failures page with correct content', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('We found 1 error in your summary log')
      expect(result).toContain(
        'Registration number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: invalid with validation failures - should show re-upload form and cancel button', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Upload updated XLSX file')
      expect(result).toContain('Continue')
      expect(result).toContain('Cancel and return to home')
      expect(result).toContain(
        `href="/organisations/${organisationId}/registrations/${registrationId}"`
      )
    })

    it('status: invalid - should render back link to registration dashboard', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

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

    it('status: invalid - should initiate upload with pre-signed URL', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: invalid with SEQUENTIAL_ROW_REMOVED alongside another failure - should render both the composite block and the other failure message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'SEQUENTIAL_ROW_REMOVED',
              location: { sheet: 'Received' }
            },
            { errorCode: 'HEADER_REQUIRED' }
          ]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(
        'Since your summary log was last submitted, rows have been removed from:'
      )
      expect(result).toContain(
        'The columns in the file you selected have been changed'
      )
    })

    it.for([
      {
        label: 'one sheet',
        failures: [
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          }
        ],
        expectedBullets: ['Exported (sections 1, 2 and 3)']
      },
      {
        label: 'multiple sheets listed once each',
        failures: [
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          },
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Sent on (sections 4 and 5)' }
          }
        ],
        expectedBullets: [
          'Exported (sections 1, 2 and 3)',
          'Sent on (sections 4 and 5)'
        ]
      },
      {
        label: 'duplicate sheet deduped to one bullet',
        failures: [
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          },
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          }
        ],
        expectedBullets: ['Exported (sections 1, 2 and 3)']
      },
      {
        label: 'missing sheet falls back to Unknown',
        failures: [{ errorCode: 'SEQUENTIAL_ROW_REMOVED' }],
        expectedBullets: ['Unknown']
      }
    ])(
      'status: invalid with SEQUENTIAL_ROW_REMOVED ($label) - should list affected sheets as bullets with preamble and closing',
      async ({ failures, expectedBullets }, { server }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: { failures }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const bullets = getAllByRole(
          getByTestId(body, 'app-page-body'),
          'listitem'
        ).map((li) => li.textContent?.trim())

        expect(statusCode).toBe(statusCodes.ok)
        expect(bullets).toStrictEqual(expectedBullets)
        expect(
          getAllByText(
            body,
            'Since your summary log was last submitted, rows have been removed from:'
          )
        ).toHaveLength(1)
        expect(
          getByText(
            body,
            'The rows must be re-added before you can submit your file.'
          )
        ).toBeDefined()
        expect(
          getByText(body, /We found 1 error in your summary log/)
        ).toBeDefined()
      }
    )

    it('status: invalid with unknown failure code - should show technical error message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'SOME_UNKNOWN_CODE' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: invalid with data entry failures - should show single deduplicated message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'VALUE_OUT_OF_RANGE' },
            { errorCode: 'INVALID_TYPE' },
            { errorCode: 'VALUE_OUT_OF_RANGE' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(statusCode).toBe(statusCodes.ok)
      expect(
        getByText(body, 'Your summary log cannot be uploaded')
      ).toBeDefined()
      expect(
        getAllByText(
          body,
          "The selected file contains data that's been entered incorrectly - check that the data you've entered matches the examples provided in the summary log"
        )
      ).toHaveLength(1)
    })

    it('status: invalid with mixed failures - should show data entry message and other failures', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'VALUE_OUT_OF_RANGE' },
            { errorCode: 'REGISTRATION_MISMATCH' },
            { errorCode: 'INVALID_TYPE' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )
      expect(result).toContain(
        'Registration number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with material failure - should show material invalid message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'MATERIAL_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Material on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with accreditation failure - should show accreditation invalid message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'ACCREDITATION_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Accreditation number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with processing type failure - should show template incorrect message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'PROCESSING_TYPE_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with SPREADSHEET_MALFORMED_MARKERS failure - should show malformed template message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'SPREADSHEET_MALFORMED_MARKERS' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with SPREADSHEET_INVALID_ERROR failure - should show malformed template message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'SPREADSHEET_INVALID_ERROR' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with multiple spreadsheet failures - should show single deduplicated message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'SPREADSHEET_MALFORMED_MARKERS' },
            { errorCode: 'SPREADSHEET_INVALID_ERROR' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(statusCode).toBe(statusCodes.ok)
      // Should only appear once (deduplicated)
      expect(
        getAllByText(
          body,
          "The summary log template you're uploading is incorrect - make sure you download the correct template for your registration or accreditation"
        )
      ).toHaveLength(1)
    })

    it.for([
      'FILE_UPLOAD_FAILED',
      'FILE_DOWNLOAD_FAILED',
      'FILE_REJECTED',
      'VALIDATION_SYSTEM_ERROR',
      'UNKNOWN'
    ])('%s - should show technical error message', async (code, { server }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: code }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with multiple technical errors - should show single deduplicated message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'FILE_UPLOAD_FAILED' },
            { errorCode: 'FILE_DOWNLOAD_FAILED' },
            { errorCode: 'VALIDATION_SYSTEM_ERROR' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(statusCode).toBe(statusCodes.ok)
      expect(
        getAllByText(
          body,
          'Sorry, there is a problem with the service - try again later'
        )
      ).toHaveLength(1)
    })

    it('status: invalid with NET_WEIGHT_CALCULATION_MISMATCH errorCode - should show calculated field mismatch message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'NET_WEIGHT_CALCULATION_MISMATCH',
              location: { header: 'NET_WEIGHT' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values within the automatically calculated fields that differ from the correctly calculated values'
      )
    })

    it('status: invalid with weight numeric errorCode - should show weight format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_NUMBER',
              location: { header: 'GROSS_WEIGHT' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains tonnage and weight values with formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with date errorCode on date header - should show date format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_VALID_DATE',
              location: { header: 'DATE_LOAD_LEFT_SITE' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains date formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with yes/no errorCode on yes/no header - should show yes/no format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_YES_OR_NO',
              location: { header: 'BAILING_WIRE_PROTOCOL' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains answers to Yes / No questions with formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with dropdown errorCode on dropdown header - should show dropdown format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD',
              location: {
                header: 'HOW_DID_YOU_CALCULATE_RECYCLABLE_PROPORTION'
              }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values in some fields that have not been selected from within the drop-down provided'
      )
    })

    it('status: invalid with MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS errorCode on free-text header - should show free-text message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS',
              location: { header: 'CONTAINER_NUMBER' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains unacceptable content within the fields that accept free text'
      )
    })

    it('status: invalid with ID errorCode on ID header - should show ID format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_3_DIGIT_ID',
              location: { header: 'OSR_ID' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values in ID fields with formats that do not match the 3 digit format of the examples provided in the summary log'
      )
    })

    it('status: invalid with percentage errorCode on percentage header - should show percentage format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_AT_LEAST_ZERO',
              location: { header: 'RECYCLABLE_PROPORTION_PERCENTAGE' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains percentage values with formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with known errorCode but unrecognised header - should show safety net fallback', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_VALID_DATE',
              location: { header: 'SOME_DATE_FIELD' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )
    })

    it('status: invalid with completely unrecognised errorCode - should show technical error as fallback', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'SOMETHING_TOTALLY_UNKNOWN',
              location: { header: 'WHATEVER' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with unknown errorCode alongside real failures - should strip technical error', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_NUMBER',
              location: { header: 'GROSS_WEIGHT' }
            },
            {
              errorCode: 'SOMETHING_TOTALLY_UNKNOWN',
              location: { header: 'WHATEVER' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains tonnage and weight values with formats that do not match the examples provided in the summary log'
      )
      expect(result).not.toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with mixed errorCode failures - should show correct deduplicated messages', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'NET_WEIGHT_CALCULATION_MISMATCH',
              location: { header: 'NET_WEIGHT' }
            },
            {
              errorCode: 'MUST_BE_A_NUMBER',
              location: { header: 'GROSS_WEIGHT' }
            },
            { errorCode: 'REGISTRATION_MISMATCH' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values within the automatically calculated fields that differ from the correctly calculated values'
      )
      expect(result).toContain(
        'The selected file contains tonnage and weight values with formats that do not match the examples provided in the summary log'
      )
      expect(result).toContain(
        'Registration number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with empty validation failures - should show technical error message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: []
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: invalid without validation object - should show technical error message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validation_failed - should show validation failures page with re-upload option', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed,
        validation: {
          failures: [{ errorCode: 'PROCESSING_FAILED' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validation_failed - should initiate upload for re-upload', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed
      })

      await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: submission_failed - should show validation failures page with re-upload option', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submissionFailed
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submission_failed - should initiate upload for re-upload', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submissionFailed
      })

      await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    describe('status: superseded', () => {
      it('should show superseded page with link to organisation', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('This summary log has been replaced')
        expect(result).toContain(
          'A newer summary log has been uploaded. This upload is no longer being processed.'
        )
        expect(result).toContain(`href="/organisations/${organisationId}"`)
        expect(result).toContain('Return to home')
      })

      it('should not enable client-side polling', async ({ server }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(result).not.toStrictEqual(enablesClientSidePolling())
      })

      it('should not initiate upload', async ({ server }) => {
        const initialCallCount = mockInitiateSummaryLogUpload.mock.calls.length

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(initiateSummaryLogUpload).toHaveBeenCalledTimes(initialCallCount)
      })
    })

    it('status: superseded - should not enable client-side polling', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.superseded
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })
  })

  describe('unexpected status handling', () => {
    it('unexpected status - should show error page', async ({ server }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: 'some_unknown_status'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Error checking status')
      expect(result).toContain('Unable to check upload status')
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('error handling', () => {
    it('should show 404 error page when summary log not found', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockRejectedValueOnce(Boom.notFound())

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('Page not found'))
      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should show 500 error page when backend fetch fails', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockRejectedValueOnce(
        Boom.internal('Failed to fetch')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Something went wrong')
      )
      expect(statusCode).toBe(statusCodes.internalServerError)
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

describe('summary log check view', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

  /** @type {PeriodStatusByChange} */
  const ZERO_CHANGE = {
    balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
    nonBalanceAffecting: { count: 0, rows: [] }
  }

  const emptyPeriod = () => ({ added: ZERO_CHANGE, adjusted: ZERO_CHANGE })

  /** Make the current accredited waste balance available to the check page. */
  const givenWasteBalance = (availableAmount) => {
    mockFetchRegistrationAndAccreditation.mockResolvedValue({
      registration: { accreditationId: 'acc-1' }
    })
    mockFetchWasteBalances.mockResolvedValue({ 'acc-1': { availableAmount } })
  }

  const renderMain = async (server) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })
    const { body } = new JSDOM(result).window.document
    return { main: getByRole(body, 'main'), result, statusCode }
  }

  /** Minimal validated response so the check page renders its empty state. */
  const givenValidatedCheckPage = () => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: emptyPeriod(),
        closedPeriodLoads: emptyPeriod()
      }
    })
  }

  beforeEach(() => {
    mockFetchSummaryLogStatus.mockReset().mockResolvedValue({
      status: 'preprocessing'
    })
    // No accreditation by default, so the projection panel stays hidden unless a
    // test opts in via givenWasteBalance().
    mockFetchRegistrationAndAccreditation.mockReset().mockResolvedValue({
      registration: { accreditationId: undefined }
    })
    mockFetchWasteBalances.mockReset().mockResolvedValue({})
  })

  it('status: validated - should render the check page without client-side polling', async ({
    server
  }) => {
    givenValidatedCheckPage()

    const { result } = await renderMain(server)

    expect(result).not.toStrictEqual(enablesClientSidePolling())
  })

  it('status: validated - should link back to the organisation home page', async ({
    server
  }) => {
    givenValidatedCheckPage()

    const { result } = await renderMain(server)

    expect(result).toStrictEqual(
      expect.stringContaining(`href="/organisations/${organisationId}"`)
    )
  })

  it('renders all four populated accredited sections with balance language', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 5, tonnageDelta: 10 },
            nonBalanceAffecting: { count: 2 }
          },
          adjusted: {
            balanceAffecting: { count: 3, tonnageDelta: 6 },
            nonBalanceAffecting: { count: 1 }
          }
        },
        closedPeriodLoads: {
          added: {
            balanceAffecting: { count: 4, tonnageDelta: 8 },
            nonBalanceAffecting: { count: 0 }
          },
          adjusted: {
            balanceAffecting: { count: 2, tonnageDelta: -4 },
            nonBalanceAffecting: { count: 1 }
          }
        }
      }
    })

    const { main, statusCode } = await renderMain(server)

    const hasHeading = (name) => Boolean(queryByRole(main, 'heading', { name }))
    const hasText = (text) => Boolean(queryByText(main, text))
    const hasAnyText = (text) => queryAllByText(main, text).length > 0

    // A single structural assertion of the whole rendered page: every section
    // heading and caption present, plus the counts that carry meaning (the
    // "not relevant" heading appears in both periods).
    expect({
      statusCode,
      openNewLoadsHeading: hasHeading('Open periods: new loads'),
      openNewLoadsCaption: hasText(
        'The new loads will add 10.00 tonnes to your waste balance.'
      ),
      openNewLoadsAddedHeading: hasHeading(
        '5 new loads will be recorded (and will add to your waste balance)'
      ),
      loadsIncludeData: hasAnyText(
        'The loads include all the required summary log data.'
      ),
      openNewLoadsNotAddedHeading: hasHeading(
        '2 new loads will be recorded (but will NOT add to your waste balance)'
      ),
      openAdjustedLoadsHeading: hasHeading('Open periods: adjusted loads'),
      openAdjustedLoadsCaption: hasText(
        'The adjusted loads will add 6.00 tonnes to your waste balance.'
      ),
      openAdjustedReflectedHeading: hasHeading(
        '3 adjusted loads will be recorded (and will reflect in your waste balance)'
      ),
      adjustedReflectedBody: hasAnyText(
        "These loads could 'add to' or 'remove from' your waste balance, depending on the adjustment."
      ),
      notRelevantHeadings: queryAllByRole(main, 'heading', {
        name: '1 change is NOT relevant to your waste balance'
      }).length,
      closedNewLoadsHeading: hasHeading('Closed periods: new loads'),
      closedNewLoadsAddedHeading: hasHeading(
        '4 new loads will be recorded (and will add to your waste balance)'
      ),
      closedAdjustedLoadsHeading: hasHeading('Closed periods: adjusted loads'),
      closedAdjustedLoadsCaption: hasText(
        'The adjusted loads will remove 4.00 tonnes from your waste balance.'
      )
    }).toStrictEqual({
      statusCode: statusCodes.ok,
      openNewLoadsHeading: true,
      openNewLoadsCaption: true,
      openNewLoadsAddedHeading: true,
      loadsIncludeData: true,
      openNewLoadsNotAddedHeading: true,
      openAdjustedLoadsHeading: true,
      openAdjustedLoadsCaption: true,
      openAdjustedReflectedHeading: true,
      adjustedReflectedBody: true,
      notRelevantHeadings: 2,
      closedNewLoadsHeading: true,
      closedNewLoadsAddedHeading: true,
      closedAdjustedLoadsHeading: true,
      closedAdjustedLoadsCaption: true
    })
  })

  it('hides the tonnage caption when a section has no net tonnage change', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0 },
            nonBalanceAffecting: { count: 3 }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    expect(
      getByRole(main, 'heading', {
        name: '3 new loads will be recorded (but will NOT add to your waste balance)'
      })
    ).toBeDefined()
    expect(queryByText(main, /will add .* tonnes/)).toBeNull()
  })

  it('renders totals-only section headings for registered-only', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER_REGISTERED_ONLY',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0 },
            nonBalanceAffecting: { count: 4 }
          },
          adjusted: {
            balanceAffecting: { count: 0, tonnageDelta: 0 },
            nonBalanceAffecting: { count: 2 }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasHeading = (name) => Boolean(queryByRole(main, 'heading', { name }))

    // The totals-only headings carry no balance suffix (the accredited variant
    // would read "... (and added to your waste balance)").
    expect({
      openNewLoadsHeading: hasHeading('Open periods: new loads'),
      regOnlyNewLoadsHeading: hasHeading('4 new loads will be recorded'),
      regOnlyAdjustedLoadsHeading: hasHeading(
        '2 adjusted loads will be recorded'
      )
    }).toStrictEqual({
      openNewLoadsHeading: true,
      regOnlyNewLoadsHeading: true,
      regOnlyAdjustedLoadsHeading: true
    })
  })

  it('hides the closed sections when only the open period has changes', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 1, tonnageDelta: 2 },
            nonBalanceAffecting: { count: 0 }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    expect(
      getByRole(main, 'heading', { name: 'Open periods: new loads' })
    ).toBeDefined()
    expect(
      queryByRole(main, 'heading', { name: 'Closed periods: new loads' })
    ).toBeNull()
    expect(
      queryByRole(main, 'heading', { name: 'Closed periods: adjusted loads' })
    ).toBeNull()
  })

  it('hides the open sections when only the closed period has changes', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: emptyPeriod(),
        closedPeriodLoads: {
          added: {
            balanceAffecting: { count: 1, tonnageDelta: 2 },
            nonBalanceAffecting: { count: 0 }
          },
          adjusted: ZERO_CHANGE
        }
      }
    })

    const { main } = await renderMain(server)

    expect(
      getByRole(main, 'heading', { name: 'Closed periods: new loads' })
    ).toBeDefined()
    expect(
      queryByRole(main, 'heading', { name: 'Open periods: new loads' })
    ).toBeNull()
    expect(
      queryByRole(main, 'heading', { name: 'Open periods: adjusted loads' })
    ).toBeNull()
  })

  it('renders the four-section empty state when the whole page is empty', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: emptyPeriod(),
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    expect(
      getByText(main, 'No new loads have been added to your open period')
    ).toBeDefined()
    expect(
      getByText(main, 'No adjustments have been made to your open period')
    ).toBeDefined()
    expect(
      getByText(main, 'No new loads have been added to your closed periods')
    ).toBeDefined()
    expect(
      getByText(main, 'No adjustments have been made to your closed periods')
    ).toBeDefined()
  })

  it('returns a 500 when a validated response is missing loadsByReportingPeriod', async ({
    server
  }) => {
    // The backend always pairs a validated summary log with its period
    // aggregate; a missing loadsByReportingPeriod is a contract violation, so we
    // fail loudly rather than render a misleading empty page (enforced by the
    // loadsByReportingPeriod guard in renderCheckView).
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER'
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toStrictEqual(
      expect.stringContaining('Something went wrong')
    )
  })

  it('returns a 500 when a validated response is missing processingType', async ({
    server
  }) => {
    // The backend requires processingType on every validated response, so a
    // missing one is a contract violation: fail loudly at the boundary rather
    // than render the page as though the operator were accredited.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      loadsByReportingPeriod: {
        openPeriodLoads: emptyPeriod(),
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toStrictEqual(
      expect.stringContaining('Something went wrong')
    )
  })

  /* eslint-disable vitest/max-expects -- single request, asserting all the new page chrome copy */
  it('uses the new page heading, intro and submit copy', async ({ server }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: emptyPeriod(),
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main, result } = await renderMain(server)

    expect(
      getByRole(main, 'heading', { level: 1, name: /Upload your summary log/ })
    ).toBeDefined()
    expect(
      getByRole(main, 'button', { name: 'Upload summary log' })
    ).toBeDefined()
    // The legacy "Check the following..." intro line is gone from the new page
    expect(queryByText(main, /Check the following/)).toBeNull()
    expect(result).toStrictEqual(expect.not.stringContaining('Confirm upload'))

    // The inset uses the new wording, not the legacy copy
    expect(
      getByText(main, /Your data will not be saved until you upload it\./)
    ).toBeDefined()
    expect(
      getByRole(main, 'link', { name: 'choose the file again' })
    ).toBeDefined()
    expect(result).toStrictEqual(
      expect.not.stringContaining('upload an updated summary log')
    )
  })
  /* eslint-enable vitest/max-expects */

  it('renders a submit form and a back link to the upload page', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: emptyPeriod(),
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main, result } = await renderMain(server)

    expect(result).toStrictEqual(
      expect.stringContaining(
        'action="/organisations/123/registrations/456/summary-logs/789/submit"'
      )
    )
    expect(result).toStrictEqual(
      expect.stringContaining('govuk-section-break--visible')
    )

    const backLink = getByRole(main, 'button', {
      name: 'Go back to previous page'
    })
    expect(backLink.getAttribute('href')).toBe(
      '/organisations/123/registrations/456/summary-logs/upload'
    )
  })

  it('shows the projected waste balance panel for an accredited operator with a non-zero delta', async ({
    server
  }) => {
    givenWasteBalance(100)
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 5, tonnageDelta: 10 },
            nonBalanceAffecting: { count: 0 }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { result } = await renderMain(server)

    expect(result).toStrictEqual(
      expect.stringContaining(
        'If you upload this summary log to create a new report, your waste balance will be'
      )
    )
    expect(result).toStrictEqual(
      expect.stringContaining('<strong>110.00</strong>')
    )
    expect(result).toStrictEqual(expect.stringContaining('(from 100.00)'))
  })

  it('shows the unchanged projection panel when the net tonnage delta is zero', async ({
    server
  }) => {
    givenWasteBalance(100)
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0 },
            nonBalanceAffecting: { count: 3 }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { result } = await renderMain(server)

    expect(result).toStrictEqual(
      expect.stringContaining(
        'If you upload this summary log to create a new report, your waste balance will still be'
      )
    )
    expect(result).toStrictEqual(
      expect.stringContaining('<strong>100.00</strong>')
    )
    // The unchanged wording carries no "(from ...)" suffix.
    expect(result).toStrictEqual(expect.not.stringContaining('(from'))
  })

  it('shows the unchanged projection panel when the deltas cancel to a sub-penny float residue', async ({
    server
  }) => {
    // 0.1 + 0.2 - 0.3 does not sum to exactly 0 in IEEE 754 (it lands on
    // ~5.5e-17). The rounded-to-2dp gate treats this as no change, so the panel
    // reads "will still be 100.00" rather than "will be 100.00 (from 100.00)".
    givenWasteBalance(100)
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 1, tonnageDelta: 0.1 },
            nonBalanceAffecting: { count: 0 }
          },
          adjusted: {
            balanceAffecting: { count: 1, tonnageDelta: 0.2 },
            nonBalanceAffecting: { count: 0 }
          }
        },
        closedPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: { count: 1, tonnageDelta: -0.3 },
            nonBalanceAffecting: { count: 0 }
          }
        }
      }
    })

    const { result } = await renderMain(server)

    expect(result).toStrictEqual(
      expect.stringContaining(
        'If you upload this summary log to create a new report, your waste balance will still be'
      )
    )
    expect(result).toStrictEqual(
      expect.stringContaining('<strong>100.00</strong>')
    )
    expect(result).toStrictEqual(expect.not.stringContaining('(from'))
  })

  it('hides the projection panel for a registered-only operator', async ({
    server
  }) => {
    givenWasteBalance(100)
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER_REGISTERED_ONLY',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0 },
            nonBalanceAffecting: { count: 4 }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { result } = await renderMain(server)

    expect(result).toStrictEqual(
      expect.not.stringContaining(
        'If you upload this summary log to create a new report'
      )
    )
  })

  it('renders the page without the panel when the waste balance is unavailable', async ({
    server
  }) => {
    // Default mocks: no accreditationId, so no balance can be fetched.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 5, tonnageDelta: 10 },
            nonBalanceAffecting: { count: 0 }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main, result, statusCode } = await renderMain(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(main, 'heading', { name: 'Open periods: new loads' })
    ).toBeDefined()
    expect(result).toStrictEqual(
      expect.not.stringContaining(
        'If you upload this summary log to create a new report'
      )
    )
  })

  it('lists new non-balance-affecting loads in an accordion with worksheet, row ID and reason', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 2,
              rows: [
                {
                  rowId: '5',
                  wasteRecordType: 'exported',
                  exclusionReasons: ['MISSING_REQUIRED_FIELD'],
                  tonnageDelta: 0
                },
                {
                  rowId: '8',
                  wasteRecordType: 'sentOn',
                  exclusionReasons: ['PRODUCT_WEIGHT_NOT_ADDED'],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      // Contributing worksheets carry no cautionary sub-heading: each row's own
      // reason already explains why it was excluded, so the heading is redundant.
      cautionaryLineCount: queryAllByText(
        main,
        'These loads could be missing required summary log data that stops them from adding to your waste balance.'
      ).length,
      disclosure: hasText('Show 2 loads'),
      exportedSection: hasText('Exported'),
      exportedRow: hasText('Row ID: 5. Required summary log data is missing'),
      sentOnSection: hasText('Sent on'),
      sentOnRow: hasText('Row ID: 8. Product weight is missing')
    }).toStrictEqual({
      cautionaryLineCount: 0,
      disclosure: true,
      exportedSection: true,
      exportedRow: true,
      sentOnSection: true,
      sentOnRow: true
    })
  })

  it('lists a fully by-design section under a neutral never-counts heading with each row id', async ({
    server
  }) => {
    // Every row in the Reprocessed section carries the by-design exclusion code,
    // so the section is by-design non-contributing: it renders the neutral
    // "never count" heading and lists each row id (never the raw code).
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 2,
              rows: [
                {
                  rowId: '4001',
                  wasteRecordType: 'processed',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
                  ],
                  tonnageDelta: 0
                },
                {
                  rowId: '4002',
                  wasteRecordType: 'processed',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
                  ],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      bucketHeading: hasText(
        '2 new loads will be recorded (but will NOT add to your waste balance)'
      ),
      // The worksheet is labelled with no row-count suffix.
      section: hasText('Reprocessed'),
      countedHeading: hasText('Reprocessed (2 rows)'),
      neverCountsLine: hasText(
        'These loads would never count towards your waste balance.'
      ),
      rawCodeShown: hasText(
        'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
      ),
      // Each by-design row is now listed by id, without a per-row reason.
      firstRowIdShown: hasText('Row ID: 4001'),
      secondRowIdShown: hasText('Row ID: 4002')
    }).toStrictEqual({
      bucketHeading: true,
      section: true,
      countedHeading: false,
      neverCountsLine: true,
      rawCodeShown: false,
      firstRowIdShown: true,
      secondRowIdShown: true
    })
  })

  it('renders the never-counts heading only for the by-design worksheet in a mixed bucket', async ({
    server
  }) => {
    // A mixed non-balance-affecting bucket: the Received section carries a real
    // data problem (no sub-heading, just its per-row reason) alongside the
    // by-design Reprocessed section (never-counts heading + its row id listed).
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 2,
              rows: [
                {
                  rowId: '1001',
                  wasteRecordType: 'received',
                  exclusionReasons: ['MISSING_REQUIRED_FIELD'],
                  tonnageDelta: 0
                },
                {
                  rowId: '4001',
                  wasteRecordType: 'processed',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
                  ],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      bucketHeading: hasText(
        '2 new loads will be recorded (but will NOT add to your waste balance)'
      ),
      // The Received worksheet gets no sub-heading, only its per-row reason.
      cautionaryLine: hasText(
        'These loads could be missing required summary log data that stops them from adding to your waste balance.'
      ),
      receivedRowWithReason: hasText(
        'Row ID: 1001. Required summary log data is missing'
      ),
      // The Reprocessed worksheet gets the neutral never-counts heading and lists
      // its row id (no count suffix, no raw code).
      reprocessedSection: hasText('Reprocessed'),
      countedHeading: hasText('Reprocessed (1 row)'),
      neverCountsLine: hasText(
        'These loads would never count towards your waste balance.'
      ),
      byDesignRowIdShown: hasText('Row ID: 4001')
    }).toStrictEqual({
      bucketHeading: true,
      cautionaryLine: false,
      receivedRowWithReason: true,
      reprocessedSection: true,
      countedHeading: false,
      neverCountsLine: true,
      byDesignRowIdShown: true
    })
  })

  it('keeps a section expanded when a by-design row sits beside a real-reason row of the same worksheet', async ({
    server
  }) => {
    // Same worksheet (processed), one by-design row and one with a genuine data
    // problem. The worksheet is not wholly by-design, so it gets no sub-heading:
    // the real-reason row shows its reason, the by-design row lists as a plain id
    // (its code is dropped), and the never-counts heading does not appear.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 2,
              rows: [
                {
                  rowId: '4001',
                  wasteRecordType: 'processed',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
                  ],
                  tonnageDelta: 0
                },
                {
                  rowId: '4002',
                  wasteRecordType: 'processed',
                  exclusionReasons: ['MISSING_REQUIRED_FIELD'],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      cautionaryLine: hasText(
        'These loads could be missing required summary log data that stops them from adding to your waste balance.'
      ),
      realReasonRow: hasText(
        'Row ID: 4002. Required summary log data is missing'
      ),
      byDesignRowPlain: hasText('Row ID: 4001'),
      sectionPlain: hasText('Reprocessed'),
      countedHeading: hasText('Reprocessed (2 rows)'),
      neverCountsLine: hasText(
        'These loads would never count towards your waste balance.'
      ),
      rawCodeShown: hasText(
        'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
      )
    }).toStrictEqual({
      cautionaryLine: false,
      realReasonRow: true,
      byDesignRowPlain: true,
      sectionPlain: true,
      countedHeading: false,
      neverCountsLine: false,
      rawCodeShown: false
    })
  })

  it('does not collapse a section when a by-design row also carries a real reason, surfacing that reason', async ({
    server
  }) => {
    // Defends the backend invariant that a by-design sheet emits the code alone.
    // Were a row ever to carry the code plus a real data reason, the section
    // must stay expanded so the data problem surfaces rather than being hidden
    // behind the "never counts" line.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 1,
              rows: [
                {
                  rowId: '4001',
                  wasteRecordType: 'processed',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE',
                    'MISSING_REQUIRED_FIELD'
                  ],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      rowWithRealReason: hasText(
        'Row ID: 4001. Required summary log data is missing'
      ),
      rawCodeShown: hasText(
        'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
      ),
      neverCountsLineShown: hasText(
        'These loads would never count towards your waste balance.'
      )
    }).toStrictEqual({
      rowWithRealReason: true,
      rawCodeShown: false,
      neverCountsLineShown: false
    })
  })

  it('lists registered-only by-design rows as plain row ids with no reason, code or balance line', async ({
    server
  }) => {
    // Registered-only rows carry the by-design code too, but the page has no
    // waste balance, so the code is simply dropped: rows stay as plain ids and
    // the accredited "never count" line does not appear.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_REGISTERED_ONLY',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 1,
              rows: [
                {
                  rowId: '9',
                  wasteRecordType: 'received',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
                  ],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      receivedRow: hasText('Row ID: 9'),
      rawCodeShown: hasText(
        'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
      ),
      neverCountsLineShown: hasText(
        'These loads would never count towards your waste balance.'
      )
    }).toStrictEqual({
      receivedRow: true,
      rawCodeShown: false,
      neverCountsLineShown: false
    })
  })

  it('lists a by-design worksheet under the never-counts heading in the adjusted bucket', async ({
    server
  }) => {
    // The never-counts treatment applies to the adjusted "not relevant" bucket
    // too, not just new loads: a wholly by-design worksheet there lists its row
    // ids under the neutral never-counts heading rather than the raw code.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 2,
              rows: [
                {
                  rowId: '4001',
                  wasteRecordType: 'processed',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
                  ],
                  tonnageDelta: 0
                },
                {
                  rowId: '4002',
                  wasteRecordType: 'processed',
                  exclusionReasons: [
                    'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
                  ],
                  tonnageDelta: 0
                }
              ]
            }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      neverCountsLine: hasText(
        'These loads would never count towards your waste balance.'
      ),
      firstRowIdShown: hasText('Row ID: 4001'),
      secondRowIdShown: hasText('Row ID: 4002'),
      rawCodeShown: hasText(
        'TEMPLATE_SECTION_DOES_NOT_CONTRIBUTE_TO_WASTE_BALANCE'
      )
    }).toStrictEqual({
      neverCountsLine: true,
      firstRowIdShown: true,
      secondRowIdShown: true,
      rawCodeShown: false
    })
  })

  it('groups load rows by section in received, processed, exported, sent-on order', async ({
    server
  }) => {
    // Rows arrive jumbled; the page groups them under section labels in the
    // canonical summary-log flow order regardless of the order received.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 3,
              rows: [
                {
                  rowId: '300',
                  wasteRecordType: 'sentOn',
                  exclusionReasons: [],
                  tonnageDelta: 0
                },
                {
                  rowId: '100',
                  wasteRecordType: 'received',
                  exclusionReasons: [],
                  tonnageDelta: 0
                },
                {
                  rowId: '200',
                  wasteRecordType: 'processed',
                  exclusionReasons: [],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const sectionLabels = [...main.querySelectorAll('dt')].map((dt) =>
      dt.textContent.trim()
    )
    expect(sectionLabels).toStrictEqual(['Received', 'Reprocessed', 'Sent on'])
  })

  // The adjusted balance-affecting bucket is split by direction: the +6 row
  // added to the balance (listed by id — an added row never carries a reason,
  // as an included row has no exclusions), and the -1 MISSING_REQUIRED_FIELD row
  // reduced it (listed with its reason). Missing data is now just a per-row
  // reason, not a separate "does NOT have all the required data" heading.
  it('splits adjusted balance-affecting loads into added and reduced sub-groups, each showing per-row reasons', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: {
              count: 2,
              tonnageDelta: 5,
              rows: [
                {
                  rowId: '1',
                  wasteRecordType: 'exported',
                  exclusionReasons: [],
                  tonnageDelta: 6
                },
                {
                  rowId: '2',
                  wasteRecordType: 'sentOn',
                  exclusionReasons: ['MISSING_REQUIRED_FIELD'],
                  tonnageDelta: -1
                }
              ]
            },
            nonBalanceAffecting: { count: 0, rows: [] }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      disclosure: hasText('Show 2 loads'),
      addedHeading: hasText('This load has added to your waste balance'),
      addedSection: hasText('Exported'),
      addedRow: hasText('Row ID: 1'),
      reducedHeading: hasText('This load has reduced your waste balance'),
      reducedSection: hasText('Sent on'),
      reducedRowWithReason: hasText(
        'Row ID: 2. Required summary log data is missing'
      )
    }).toStrictEqual({
      disclosure: true,
      addedHeading: true,
      addedSection: true,
      addedRow: true,
      reducedHeading: true,
      reducedSection: true,
      reducedRowWithReason: true
    })
  })

  // A still-included load corrected downward reduces the balance but carries no
  // exclusion reason, so it lists bare under the reduced heading — the reason
  // slot is filled only for rows that were excluded.
  it('lists an adjusted downward-corrected load bare under the reduced heading', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: {
              count: 1,
              tonnageDelta: -6,
              rows: [
                {
                  rowId: '1',
                  wasteRecordType: 'exported',
                  exclusionReasons: [],
                  tonnageDelta: -6
                }
              ]
            },
            nonBalanceAffecting: { count: 0, rows: [] }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      reducedHeading: hasText('This load has reduced your waste balance'),
      reducedRowBare: hasText('Row ID: 1'),
      addedHeadingAbsent: hasText('This load has added to your waste balance')
    }).toStrictEqual({
      reducedHeading: true,
      reducedRowBare: true,
      addedHeadingAbsent: false
    })
  })

  // The reported defect: a data-intact exclusion (a PRN was issued) keeps all
  // its data and only reduces the balance by reversing its earlier contribution.
  // It belongs under the reduced heading carrying its own reason, never under a
  // "missing data" heading with the reason hidden.
  it('shows the reason for an adjusted data-intact exclusion under the reduced heading', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: {
              count: 1,
              tonnageDelta: -2,
              rows: [
                {
                  rowId: '1046',
                  wasteRecordType: 'received',
                  exclusionReasons: ['PRN_ISSUED'],
                  tonnageDelta: -2
                }
              ]
            },
            nonBalanceAffecting: { count: 0, rows: [] }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      reducedHeading: hasText('This load has reduced your waste balance'),
      prnRowWithReason: hasText(
        'Row ID: 1046. A PRN was already issued for this load'
      )
    }).toStrictEqual({
      reducedHeading: true,
      prnRowWithReason: true
    })
  })

  // Defensive: the added sub-group never renders a per-row reason, even for a
  // row that arrives carrying an exclusion code. The backend zeroes an excluded
  // row's amount, so a reason-carrying row can only ever reduce the balance and
  // never reach the added group; the frontend does not rely on that and simply
  // suppresses reasons in the added group, so a stray reason can never masquerade
  // as an "added to your waste balance" explanation.
  it('suppresses any reason on an adjusted added load', async ({ server }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_INPUT',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: {
              count: 1,
              tonnageDelta: 4,
              rows: [
                {
                  rowId: '1',
                  wasteRecordType: 'received',
                  exclusionReasons: ['PRN_ISSUED'],
                  tonnageDelta: 4
                }
              ]
            },
            nonBalanceAffecting: { count: 0, rows: [] }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      addedHeading: hasText('This load has added to your waste balance'),
      bareRow: hasText('Row ID: 1'),
      reasonAbsent: hasText('Row ID: 1. A PRN was already issued for this load')
    }).toStrictEqual({
      addedHeading: true,
      bareRow: true,
      reasonAbsent: false
    })
  })

  it('lists adjusted not-relevant loads in an accordion with worksheet and row ID only', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 1,
              rows: [
                {
                  rowId: '9',
                  wasteRecordType: 'exported',
                  exclusionReasons: [],
                  tonnageDelta: 0
                }
              ]
            }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      heading: hasText('1 change is NOT relevant to your waste balance'),
      disclosure: hasText('Show 1 load'),
      section: hasText('Exported'),
      row: hasText('Row ID: 9')
    }).toStrictEqual({
      heading: true,
      disclosure: true,
      section: true,
      row: true
    })
  })

  it('lists registered-only loads in an accordion with worksheet and row ID only', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER_REGISTERED_ONLY',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 2,
              rows: [
                {
                  rowId: '3',
                  wasteRecordType: 'received',
                  exclusionReasons: [],
                  tonnageDelta: 0
                },
                {
                  rowId: '7',
                  wasteRecordType: 'exported',
                  exclusionReasons: [],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    const hasText = (text) => Boolean(queryByText(main, text))

    expect({
      heading: hasText('2 new loads will be recorded'),
      body: hasText('These have been added to your summary log.'),
      disclosure: hasText('Show 2 loads'),
      receivedSection: hasText('Received'),
      receivedRow: hasText('Row ID: 3'),
      exportedSection: hasText('Exported'),
      exportedRow: hasText('Row ID: 7')
    }).toStrictEqual({
      heading: true,
      body: true,
      disclosure: true,
      receivedSection: true,
      receivedRow: true,
      exportedSection: true,
      exportedRow: true
    })
  })

  it('suppresses the new-loads accordion and shows the too-many message over the cap', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: { count: 100, rows: [] }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    expect({
      disclosure: Boolean(queryByText(main, 'Show 100 loads')),
      tooMany: Boolean(
        queryByText(
          main,
          'As there are 100 or more loads, we are not able to list them all here.'
        )
      ),
      // Over the cap only the too-many message shows: there is no cautionary
      // line anywhere on the check page in v2.
      cautionaryBody: Boolean(
        queryByText(
          main,
          'These loads could be missing required summary log data that stops them from adding to your waste balance.'
        )
      )
    }).toStrictEqual({
      disclosure: false,
      tooMany: true,
      cautionaryBody: false
    })
  })

  it('suppresses the adjusted balance-affecting accordion over the cap', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: ZERO_CHANGE,
          adjusted: {
            balanceAffecting: { count: 100, tonnageDelta: 50, rows: [] },
            nonBalanceAffecting: { count: 0, rows: [] }
          }
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    expect({
      disclosure: Boolean(queryByText(main, 'Show 100 loads')),
      tooMany: Boolean(
        queryByText(
          main,
          'As there are 100 or more adjusted loads, we are not able to list them all here.'
        )
      )
    }).toStrictEqual({ disclosure: false, tooMany: true })
  })

  it('renders PRN_ISSUED as PRN for reprocessors and PERN for exporters', async ({
    server
  }) => {
    const prnIssuedRow = (wasteRecordType) => ({
      status: summaryLogStatuses.validated,
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 1,
              rows: [
                {
                  rowId: '4',
                  wasteRecordType,
                  exclusionReasons: ['PRN_ISSUED'],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      ...prnIssuedRow('received'),
      processingType: 'REPROCESSOR_INPUT'
    })
    const reprocessor = await renderMain(server)

    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      ...prnIssuedRow('exported'),
      processingType: 'EXPORTER'
    })
    const exporter = await renderMain(server)

    expect({
      reprocessor: Boolean(
        queryByText(
          reprocessor.main,
          'Row ID: 4. A PRN was already issued for this load'
        )
      ),
      exporter: Boolean(
        queryByText(
          exporter.main,
          'Row ID: 4. A PERN was already issued for this load'
        )
      )
    }).toStrictEqual({ reprocessor: true, exporter: true })
  })

  it('renders an unmapped exclusion code verbatim as the reason', async ({
    server
  }) => {
    // OUTSIDE_ACCREDITATION_PERIOD is filtered out upstream and should never
    // reach the frontend; if any unmapped code does, the raw backend const is
    // shown as the reason rather than dropped, so nothing the operator should
    // see is hidden.
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads: {
          added: {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: {
              count: 1,
              rows: [
                {
                  rowId: '6',
                  wasteRecordType: 'exported',
                  exclusionReasons: ['OUTSIDE_ACCREDITATION_PERIOD'],
                  tonnageDelta: 0
                }
              ]
            }
          },
          adjusted: ZERO_CHANGE
        },
        closedPeriodLoads: emptyPeriod()
      }
    })

    const { main } = await renderMain(server)

    // Exact-text match: the raw const is appended after the row id full stop.
    expect(
      queryByText(main, 'Row ID: 6. OUTSIDE_ACCREDITATION_PERIOD')
    ).not.toBeNull()
  })

  // The single source of truth for where an exclusion reason surfaces: on NEW
  // loads that will NOT add to the balance, and on ADJUSTED balance-affecting
  // loads (the added/reduced split lists every row with its reason). The other
  // two positions list Row ID alone: added.balanceAffecting is count-only with
  // no accordion, and the adjusted "not relevant" bucket lists rows plainly. The
  // richer per-position tests above prove the surrounding behaviour (the
  // direction split, the headings); this table states the visibility rule.
  const REASON_CODE = 'MISSING_REQUIRED_FIELD'
  const REASON_TEXT = 'Required summary log data is missing'

  /**
   * A validated response with one excluded row placed at a single bucket
   * position, so the assertion isolates whether that position renders the
   * reason. Balance-affecting buckets carry a non-zero tonnageDelta so the row
   * genuinely moves the balance.
   * @param {'added' | 'adjusted'} change
   * @param {'balanceAffecting' | 'nonBalanceAffecting'} bucket
   * @returns {SummaryLogStatusResponse}
   */
  const responseWithReasonAt = (change, bucket) => {
    const movesBalance = bucket === 'balanceAffecting'
    /** @type {LoadRow} */
    const row = {
      rowId: '5',
      wasteRecordType: 'exported',
      exclusionReasons: [REASON_CODE],
      tonnageDelta: movesBalance ? -1 : 0
    }
    /** @type {PeriodStatusByChange} */
    const group =
      bucket === 'balanceAffecting'
        ? {
            balanceAffecting: { count: 1, tonnageDelta: -1, rows: [row] },
            nonBalanceAffecting: { count: 0, rows: [] }
          }
        : {
            balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
            nonBalanceAffecting: { count: 1, rows: [row] }
          }
    const openPeriodLoads =
      change === 'added'
        ? { added: group, adjusted: ZERO_CHANGE }
        : { added: ZERO_CHANGE, adjusted: group }
    return {
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER',
      loadsByReportingPeriod: {
        openPeriodLoads,
        closedPeriodLoads: emptyPeriod()
      }
    }
  }

  /**
   * @type {Array<{
   *   change: 'added' | 'adjusted',
   *   bucket: 'balanceAffecting' | 'nonBalanceAffecting',
   *   showsReason: boolean
   * }>}
   */
  const reasonVisibilityCases = [
    { change: 'added', bucket: 'nonBalanceAffecting', showsReason: true },
    { change: 'added', bucket: 'balanceAffecting', showsReason: false },
    { change: 'adjusted', bucket: 'balanceAffecting', showsReason: true },
    { change: 'adjusted', bucket: 'nonBalanceAffecting', showsReason: false }
  ]

  it.for(reasonVisibilityCases)(
    'surfaces the exclusion reason at the expected bucket position ($change / $bucket)',
    async ({ change, bucket, showsReason }, { server }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce(
        responseWithReasonAt(change, bucket)
      )

      const { main } = await renderMain(server)

      expect(Boolean(queryByText(main, new RegExp(REASON_TEXT)))).toBe(
        showsReason
      )
    }
  )

  /**
   * A validated response with a single new, non-balance-affecting row of the
   * given waste record type. This is the one accordion that lists rows for
   * every processing type (registered-only sources its accordion from the same
   * bucket), so it isolates the worksheet-name and reason lookups.
   * @param {ProcessingType} processingType
   * @param {WasteRecordType} wasteRecordType
   * @param {string[]} exclusionReasons
   * @returns {SummaryLogStatusResponse}
   */
  const responseWithNewNonBalanceRow = (
    processingType,
    wasteRecordType,
    exclusionReasons
  ) => ({
    status: summaryLogStatuses.validated,
    processingType,
    loadsByReportingPeriod: {
      openPeriodLoads: {
        added: {
          balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
          nonBalanceAffecting: {
            count: 1,
            rows: [
              { rowId: '5', wasteRecordType, exclusionReasons, tonnageDelta: 0 }
            ]
          }
        },
        adjusted: ZERO_CHANGE
      },
      closedPeriodLoads: emptyPeriod()
    }
  })

  // The single source of truth for the worksheet (tab) name shown in each load
  // row, keyed by processing type and waste record type. Per the design these
  // are the plain tab names with the parenthesised section numbers dropped.
  // Every combination the backend can emit is listed here; a typo in any locale
  // entry fails its row.
  /**
   * @type {Array<{
   *   processingType: ProcessingType,
   *   wasteRecordType: WasteRecordType,
   *   worksheetName: string
   * }>}
   */
  const worksheetNameCases = [
    {
      processingType: 'REPROCESSOR_INPUT',
      wasteRecordType: 'received',
      worksheetName: 'Received'
    },
    {
      processingType: 'REPROCESSOR_INPUT',
      wasteRecordType: 'processed',
      worksheetName: 'Reprocessed'
    },
    {
      processingType: 'REPROCESSOR_INPUT',
      wasteRecordType: 'sentOn',
      worksheetName: 'Sent on'
    },
    {
      processingType: 'REPROCESSOR_OUTPUT',
      wasteRecordType: 'received',
      worksheetName: 'Received'
    },
    {
      processingType: 'REPROCESSOR_OUTPUT',
      wasteRecordType: 'processed',
      worksheetName: 'Reprocessed'
    },
    {
      processingType: 'REPROCESSOR_OUTPUT',
      wasteRecordType: 'sentOn',
      worksheetName: 'Sent on'
    },
    {
      processingType: 'EXPORTER',
      wasteRecordType: 'exported',
      worksheetName: 'Exported'
    },
    {
      processingType: 'EXPORTER',
      wasteRecordType: 'sentOn',
      worksheetName: 'Sent on'
    },
    {
      processingType: 'REPROCESSOR_REGISTERED_ONLY',
      wasteRecordType: 'received',
      worksheetName: 'Received'
    },
    {
      processingType: 'REPROCESSOR_REGISTERED_ONLY',
      wasteRecordType: 'sentOn',
      worksheetName: 'Sent on'
    },
    {
      processingType: 'EXPORTER_REGISTERED_ONLY',
      wasteRecordType: 'received',
      worksheetName: 'Received'
    },
    {
      processingType: 'EXPORTER_REGISTERED_ONLY',
      wasteRecordType: 'exported',
      worksheetName: 'Exported'
    },
    {
      processingType: 'EXPORTER_REGISTERED_ONLY',
      wasteRecordType: 'sentOn',
      worksheetName: 'Sent on'
    }
  ]

  it.for(worksheetNameCases)(
    'renders the worksheet name for $processingType / $wasteRecordType',
    async ({ processingType, wasteRecordType, worksheetName }, { server }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce(
        responseWithNewNonBalanceRow(processingType, wasteRecordType, [])
      )

      const { main } = await renderMain(server)

      // The worksheet name renders as the section label (a <dt>) the row sits
      // under; a wrong string in any locale entry fails its row.
      expect(queryByText(main, worksheetName)).not.toBeNull()
    }
  )

  // The single source of truth for the exclusion-reason display strings. Every
  // CLASSIFICATION_REASON code the frontend can receive maps to one string;
  // PRN_ISSUED renders as PRN for reprocessors and PERN for exporters, and any
  // unmapped code degrades to no reason rather than a raw code. Reasons surface
  // only on new non-balance-affecting rows (see the visibility table above), so
  // that is where this asserts them.
  /**
   * @type {Array<{
   *   code: string,
   *   processingType: ProcessingType,
   *   wasteRecordType: WasteRecordType,
   *   expectedBullet: string
   * }>}
   */
  const reasonTextCases = [
    {
      code: 'MISSING_REQUIRED_FIELD',
      processingType: 'EXPORTER',
      wasteRecordType: 'exported',
      expectedBullet: 'Row ID: 5. Required summary log data is missing'
    },
    {
      code: 'PRODUCT_WEIGHT_NOT_ADDED',
      processingType: 'EXPORTER',
      wasteRecordType: 'exported',
      expectedBullet: 'Row ID: 5. Product weight is missing'
    },
    {
      code: 'ORS_NOT_APPROVED',
      processingType: 'EXPORTER',
      wasteRecordType: 'exported',
      expectedBullet:
        'Row ID: 5. The overseas reprocessing site was not approved at the date of export'
    },
    {
      code: 'ORS_NOT_FOUND',
      processingType: 'EXPORTER',
      wasteRecordType: 'exported',
      expectedBullet:
        'Row ID: 5. The OSR_ID has no matching overseas site registration'
    },
    {
      code: 'PRN_ISSUED',
      processingType: 'REPROCESSOR_INPUT',
      wasteRecordType: 'received',
      expectedBullet: 'Row ID: 5. A PRN was already issued for this load'
    },
    {
      code: 'PRN_ISSUED',
      processingType: 'EXPORTER',
      wasteRecordType: 'exported',
      expectedBullet: 'Row ID: 5. A PERN was already issued for this load'
    },
    {
      code: 'OUTSIDE_ACCREDITATION_PERIOD',
      processingType: 'EXPORTER',
      wasteRecordType: 'exported',
      expectedBullet: 'Row ID: 5. OUTSIDE_ACCREDITATION_PERIOD'
    }
  ]

  it.for(reasonTextCases)(
    'renders the $code reason for a $processingType row',
    async (
      { code, processingType, wasteRecordType, expectedBullet },
      { server }
    ) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce(
        responseWithNewNonBalanceRow(processingType, wasteRecordType, [code])
      )

      const { main } = await renderMain(server)

      expect(queryByText(main, expectedBullet)).not.toBeNull()
    }
  )

  describe('closed-period adjustments "Important" banner', () => {
    const CLOSED_PERIOD_FLAG = 'featureFlags.closedPeriodAdjustments'

    const BANNER_BODY =
      "If you upload this summary log, you'll need to create a new report " +
      'for any relevant period and an approved person from your business ' +
      'will need to resubmit it to your regulator.'

    const periodWithClosedAdjustment = () => ({
      openPeriodLoads: emptyPeriod(),
      closedPeriodLoads: {
        added: ZERO_CHANGE,
        adjusted: {
          balanceAffecting: { count: 2, tonnageDelta: -4, rows: [] },
          nonBalanceAffecting: { count: 0, rows: [] }
        }
      }
    })

    afterEach(() => {
      config.reset(CLOSED_PERIOD_FLAG)
    })

    it('shows the Important banner when the flag is on and the summary log touches a closed period', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, true)
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'EXPORTER',
        loadsByReportingPeriod: periodWithClosedAdjustment()
      })

      const { main } = await renderMain(server)

      expect(queryByText(main, BANNER_BODY)).not.toBeNull()
    })

    it('hides the Important banner when no closed period is touched', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, true)
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'EXPORTER',
        loadsByReportingPeriod: {
          openPeriodLoads: {
            added: {
              balanceAffecting: { count: 1, tonnageDelta: 2, rows: [] },
              nonBalanceAffecting: { count: 0, rows: [] }
            },
            adjusted: ZERO_CHANGE
          },
          closedPeriodLoads: emptyPeriod()
        }
      })

      const { main } = await renderMain(server)

      expect(queryByText(main, BANNER_BODY)).toBeNull()
    })

    it('hides the Important banner when the closed-period flag is off', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, false)
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'EXPORTER',
        loadsByReportingPeriod: periodWithClosedAdjustment()
      })

      const { main } = await renderMain(server)

      expect(queryByText(main, BANNER_BODY)).toBeNull()
    })
  })
})
