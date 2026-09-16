import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchReportListDetails } from './fetch-report-list-details.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { ReportListDetails } from './fetch-report-list-details.js'
 */

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')

describe(fetchReportListDetails, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'token'

  const organisation = /** @type {Organisation} */ (
    /** @type {unknown} */ ({
      id: organisationId,
      companyDetails: { name: 'Kirkby Plastics Ltd' }
    })
  )

  const registration = /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL',
      wasteProcessingType: 'reprocessor'
    })
  )

  const accreditation = {
    id: accreditationId,
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved'
  }

  /** @type {ReportListDetails['reportingPeriods']} */
  const reportingPeriods = [
    {
      year: 2026,
      period: 8,
      submissionNumber: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      dueDate: '2026-09-20',
      periodStatus: 'submitted',
      report: null
    }
  ]

  const isCalendarPath = (/** @type {string} */ path) =>
    path.endsWith('/reports/calendar')

  const fetchDetails = () =>
    fetchReportListDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    vi.mocked(fetchJsonFromBackend).mockImplementation((path) =>
      isCalendarPath(path)
        ? Promise.resolve({ cadence: 'monthly', reportingPeriods })
        : Promise.resolve(accreditation)
    )
  })

  it('reads what the page shows, and nothing else', async () => {
    const result = await fetchDetails()

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      cadence: 'monthly',
      reportingPeriods
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledTimes(2)
  })

  it('reads the accreditation and the calendar from the paths the backend serves', async () => {
    await fetchDetails()

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`,
      { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/reports/calendar`,
      expect.anything()
    )
  })

  it('encodes ids that carry characters an address would otherwise read', async () => {
    await fetchReportListDetails({
      organisationId: 'org/123',
      registrationId: 'reg 456',
      accreditationId: 'acc?789',
      backendToken
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%20456/accreditations/acc%3F789',
      expect.anything()
    )
  })

  it('fails the page where the calendar could not be read', async () => {
    vi.mocked(fetchJsonFromBackend).mockImplementation((path) =>
      isCalendarPath(path)
        ? Promise.reject(new Error('nope'))
        : Promise.resolve(accreditation)
    )

    await expect(fetchDetails()).rejects.toThrow('nope')
  })
})
