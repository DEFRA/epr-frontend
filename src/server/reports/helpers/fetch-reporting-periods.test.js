import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchReportingPeriodsByNumber } from './fetch-reporting-periods.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(fetchReportingPeriodsByNumber, () => {
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25SR500030912PA'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the natural-key reporting calendar', async () => {
    const calendar = { cadence: 'quarterly', reportingPeriods: [] }
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(calendar)

    await expect(
      fetchReportingPeriodsByNumber(keys, 'test-token')
    ).resolves.toStrictEqual(calendar)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/reports/calendar',
      { method: 'GET', headers: { Authorization: 'Bearer test-token' } }
    )
  })
})
