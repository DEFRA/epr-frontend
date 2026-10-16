import Boom from '@hapi/boom'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchReportingPeriodsByNumber } from '#server/reports/helpers/fetch-reporting-periods.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchReportListDetails } from './fetch-report-list-details.js'

/**
 * @import { AccreditationView, OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { ReportListDetails } from './fetch-report-list-details.js'
 */

vi.mock(import('#server/common/helpers/organisations/fetch-organisation.js'))
vi.mock(import('#server/reports/helpers/fetch-reporting-periods.js'))

describe(fetchReportListDetails, () => {
  const organisationNumber = '500118'
  const registrationNumber = 'R26ER5001180041PL'
  const backendToken = 'token'

  /** @type {AccreditationView} */
  const accreditation = {
    accreditationNumber: 'A26ER5001180114PL',
    status: {
      current: 'approved',
      timeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
    }
  }

  /** @type {OrganisationView} */
  const organisation = {
    organisationNumber: 500118,
    name: 'Kirkby Plastics Ltd',
    registrations: {
      [registrationNumber]: {
        status: {
          current: 'approved',
          timeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
        },
        validFrom: '2026-01-01',
        material: 'plastic',
        submittedToRegulator: { code: 'ea' },
        wasteProcessingType: 'exporter',
        accreditations: { 2026: accreditation }
      }
    }
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

  /** @param {{ registrationNumber?: string, year?: string }} [overrides] */
  const fetchDetails = (overrides) =>
    fetchReportListDetails({
      organisationNumber,
      registrationNumber,
      year: '2026',
      backendToken,
      ...overrides
    })

  beforeEach(() => {
    vi.mocked(fetchOrganisation).mockResolvedValue(organisation)
    vi.mocked(fetchReportingPeriodsByNumber).mockResolvedValue({
      cadence: 'monthly',
      reportingPeriods
    })
  })

  it("reads the organisation, the year's accreditation and the calendar", async () => {
    await expect(fetchDetails()).resolves.toStrictEqual({
      organisation,
      accreditation,
      cadence: 'monthly',
      reportingPeriods
    })
  })

  it('reads the organisation and the calendar by number', async () => {
    await fetchDetails()

    expect(fetchOrganisation).toHaveBeenCalledWith(500118, backendToken)
    expect(fetchReportingPeriodsByNumber).toHaveBeenCalledWith(
      { organisationNumber, registrationNumber },
      backendToken
    )
  })

  it('is not found for an organisation number the backend does not know', async () => {
    vi.mocked(fetchOrganisation).mockRejectedValue(Boom.notFound())

    await expect(fetchDetails()).rejects.toMatchObject({
      output: { statusCode: 404 }
    })
  })

  it('is not found for a registration number the organisation does not hold', async () => {
    await expect(
      fetchDetails({ registrationNumber: 'R26ER5009990041PL' })
    ).rejects.toMatchObject({ output: { statusCode: 404 } })
  })

  it('is not found for a year the registration holds no accreditation for', async () => {
    await expect(fetchDetails({ year: '2025' })).rejects.toMatchObject({
      output: { statusCode: 404 }
    })
  })

  it('fails the page where the calendar could not be read', async () => {
    vi.mocked(fetchReportingPeriodsByNumber).mockRejectedValue(
      new Error('nope')
    )

    await expect(fetchDetails()).rejects.toThrow('nope')
  })
})
