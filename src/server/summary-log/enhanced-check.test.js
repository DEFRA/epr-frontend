import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getAllByText,
  getByRole,
  getByText,
  queryByRole,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { summaryLogStatuses } from '../common/constants/statuses.js'

/**
 * @import { PeriodStatusByChange } from './types.js'
 */

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'preprocessing'
    })
  })
)

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn()
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
const mockFetchRegistrationAndAccreditation = vi.mocked(
  fetchRegistrationAndAccreditation,
  { partial: true, deep: true }
)
const mockFetchWasteBalances = vi.mocked(fetchWasteBalances, {
  partial: true,
  deep: true
})

/** Make the current accredited waste balance available to the check page. */
const givenWasteBalance = (availableAmount) => {
  mockFetchRegistrationAndAccreditation.mockResolvedValue({
    registration: { accreditationId: 'acc-1' }
  })
  mockFetchWasteBalances.mockResolvedValue({ 'acc-1': { availableAmount } })
}

const mockAuth = buildMockAuth({ idToken: 'test-id-token' })

const FLAG = 'featureFlags.enhancedSummaryLogCheckPages'

/** @type {PeriodStatusByChange} */
const ZERO_CHANGE = {
  balanceAffecting: { count: 0, tonnageDelta: 0 },
  nonBalanceAffecting: { count: 0 }
}

const emptyPeriod = () => ({ added: ZERO_CHANGE, adjusted: ZERO_CHANGE })

describe('enhanced summary log check view', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

  const renderMain = async (server) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })
    const { body } = new JSDOM(result).window.document
    return { main: getByRole(body, 'main'), result, statusCode }
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
    config.set(FLAG, true)
  })

  afterEach(() => {
    config.reset(FLAG)
  })

  /* eslint-disable vitest/max-expects -- single request, asserting every part of the rendered accredited page */
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

    expect(statusCode).toBe(statusCodes.ok)

    expect(
      getByRole(main, 'heading', { name: 'Open periods: new loads' })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'These new loads will add 10.00 tonnes to your waste balance.'
      )
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', {
        name: '5 new loads will be recorded (and added to your waste balance)'
      })
    ).toBeDefined()
    expect(
      getAllByText(
        main,
        'These loads include all the required summary log data.'
      ).length
    ).toBeGreaterThan(0)
    expect(
      getByRole(main, 'heading', {
        name: '2 new loads will be recorded (but NOT added to your waste balance)'
      })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'These loads are missing required summary log data. They will not be included in your waste balance until you add the missing data.'
      )
    ).toBeDefined()

    expect(
      getByRole(main, 'heading', { name: 'Open periods: adjusted loads' })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'These adjusted loads will add 6.00 tonnes to your waste balance.'
      )
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', {
        name: '3 adjusted loads will be recorded (and reflected in your waste balance)'
      })
    ).toBeDefined()
    expect(
      getAllByText(
        main,
        "These could 'add to' or 'remove from' your waste balance, depending on the adjustment."
      ).length
    ).toBeGreaterThan(0)
    expect(
      getAllByRole(main, 'heading', {
        name: '1 adjustment is not relevant to your waste balance'
      })
    ).toHaveLength(2)

    expect(
      getByRole(main, 'heading', { name: 'Closed periods: new loads' })
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', {
        name: '4 new loads will be recorded (and added to your waste balance)'
      })
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', { name: 'Closed periods: adjusted loads' })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'These adjusted loads will remove 4.00 tonnes from your waste balance.'
      )
    ).toBeDefined()

    // The "data changed" inset appears on the open adjusted section only
    expect(
      getAllByText(
        main,
        'Data has been changed since this summary log was last uploaded.'
      )
    ).toHaveLength(1)
  })
  /* eslint-enable vitest/max-expects */

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
        name: '3 new loads will be recorded (but NOT added to your waste balance)'
      })
    ).toBeDefined()
    expect(queryByText(main, /will add .* tonnes/)).toBeNull()
  })

  /* eslint-disable vitest/max-expects -- single request, asserting the totals-only registered-only layout */
  it('renders totals-only sections for registered-only with no balance language', async ({
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

    expect(
      getByRole(main, 'heading', { name: 'Open periods: new loads' })
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', { name: '4 new loads will be recorded' })
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', { name: '2 adjusted loads will be recorded' })
    ).toBeDefined()
    // open adjusted still carries the data-changed inset
    expect(
      getByText(
        main,
        'Data has been changed since this summary log was last uploaded.'
      )
    ).toBeDefined()
    expect(queryByText(main, /waste balance/)).toBeNull()
    expect(queryByText(main, /tonnes/)).toBeNull()
  })
  /* eslint-enable vitest/max-expects */

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

  it('falls back to the empty state when loadsByReportingPeriod is absent', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER'
    })

    const { main, statusCode } = await renderMain(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByText(main, 'No new loads have been added to your open period')
    ).toBeDefined()
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

  it('hides the projection panel when the net tonnage delta is zero', async ({
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
      expect.not.stringContaining(
        'If you upload this summary log to create a new report'
      )
    )
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

  it('renders the legacy check page when the flag is off', async ({
    server
  }) => {
    config.set(FLAG, false)
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
      queryByRole(main, 'heading', { name: 'Open periods: new loads' })
    ).toBeNull()
    expect(
      getByRole(main, 'heading', { name: /Check before confirming upload/ })
    ).toBeDefined()
  })
})
