import { toYear } from '#server/common/helpers/year.js'
import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import Boom from '@hapi/boom'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchYearCalendar } from '#server/reports/helpers/fetch-reporting-periods.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchReportListDetails } from './fetch-report-list-details.js'

/**
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { Accreditation, OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { ReportListDetails } from './fetch-report-list-details.js'
 */

vi.mock(import('#server/common/helpers/organisations/fetch-organisation.js'))
vi.mock(import('#server/reports/helpers/fetch-reporting-periods.js'))

describe(fetchReportListDetails, () => {
  const organisationNumber = toOrganisationNumber('500118')
  const registrationNumber = toRegistrationNumber('R26ER5001180041PL')
  const backendToken = toBackendToken('token')

  /** @type {Accreditation} */
  const accreditation = {
    accreditationNumber: toAccreditationNumber('A26ER5001180114PL'),
    prns: { open: true },
    status: {
      current: 'approved',
      timeline: [{ status: 'approved', at: '2026-01-01T09:00:00.000Z' }]
    }
  }

  /** @type {OrganisationView} */
  const organisation = {
    organisationNumber: toOrganisationNumber('500118'),
    name: 'Kirkby Plastics Ltd',
    displayName: 'Kirkby Plastics Ltd',
    status: { current: 'active' },
    submittedToRegulator: { code: 'ea' },
    registrations: {
      [registrationNumber]: {
        status: {
          current: 'approved',
          timeline: [{ status: 'approved', at: '2026-01-01T00:00:00.000Z' }]
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
      year: toYear(2026),
      cadence: 'monthly',
      period: 8,
      submissionNumber: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      dueDate: '2026-09-20',
      periodStatus: 'submitted',
      report: null
    }
  ]

  /** @param {{ registrationNumber?: RegistrationNumber, year?: Year }} [overrides] */
  const fetchDetails = (overrides) =>
    fetchReportListDetails({
      organisationNumber,
      registrationNumber,
      year: toYear(2026),
      backendToken,
      ...overrides
    })

  beforeEach(() => {
    vi.mocked(fetchOrganisation).mockResolvedValue(organisation)
    vi.mocked(fetchYearCalendar).mockResolvedValue({
      year: toYear(2026),
      registeredOnly: {
        reportingPeriods: [
          {
            ...reportingPeriods[0],
            cadence: 'quarterly',
            period: 1,
            startDate: '2026-01-01',
            endDate: '2026-03-31',
            dueDate: '2026-04-20'
          }
        ]
      },
      accredited: {
        accreditationNumber: accreditation.accreditationNumber,
        reportingPeriods
      }
    })
  })

  it("reads the organisation, the year's accreditation and its accredited periods", async () => {
    await expect(fetchDetails()).resolves.toStrictEqual({
      organisation,
      accreditation,
      reportingPeriods
    })
  })

  it("reads the organisation and the page year's calendar by number", async () => {
    await fetchDetails()

    expect(fetchOrganisation).toHaveBeenCalledWith('500118', backendToken)
    expect(fetchYearCalendar).toHaveBeenCalledWith(
      { organisationNumber, registrationNumber, year: 2026 },
      backendToken
    )
  })

  it('shows no periods for a year with no accredited periods', async () => {
    vi.mocked(fetchYearCalendar).mockResolvedValue({ year: toYear(2026) })

    await expect(fetchDetails()).resolves.toMatchObject({
      reportingPeriods: []
    })
  })

  it('is not found for an organisation number the backend does not know', async () => {
    vi.mocked(fetchOrganisation).mockRejectedValue(Boom.notFound())

    await expect(fetchDetails()).rejects.toMatchObject({
      output: { statusCode: 404 }
    })
  })

  it('is not found for a registration number the organisation does not hold', async () => {
    await expect(
      fetchDetails({
        registrationNumber: toRegistrationNumber('R26ER5009990041PL')
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } })
  })

  it('is not found for a year the registration holds no accreditation for', async () => {
    await expect(fetchDetails({ year: toYear(2025) })).rejects.toMatchObject({
      output: { statusCode: 404 }
    })
  })

  it('fails the page where the calendar could not be read', async () => {
    vi.mocked(fetchYearCalendar).mockRejectedValue(new Error('nope'))

    await expect(fetchDetails()).rejects.toThrow('nope')
  })
})
