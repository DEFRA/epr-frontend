import { describe, expect, it } from 'vitest'

import { CADENCE } from '../constants.js'
import {
  organisationPath,
  reportApiPath,
  reportPath,
  reportsCalendarApiPath,
  reportsListPath,
  summaryLogUploadPath
} from './report-paths.js'

const registrationKeys = {
  organisationNumber: '500001',
  registrationNumber: 'R25SR500030912PA'
}

const quarterlyKeys = {
  ...registrationKeys,
  year: 2026,
  cadence: CADENCE.QUARTERLY,
  period: 3,
  submissionNumber: 2
}

const monthlyKeys = {
  ...registrationKeys,
  year: 2026,
  cadence: CADENCE.MONTHLY,
  period: 8,
  submissionNumber: 1
}

describe(reportPath, () => {
  it('puts a quarterly submission under the registration reports', () => {
    expect(reportPath(quarterlyKeys)).toBe(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/3/submissions/2'
    )
  })

  it("puts a monthly submission under its accreditation's year", () => {
    expect(reportPath(monthlyKeys)).toBe(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/8/submissions/1'
    )
  })

  it('encodes a registration number holding reserved characters', () => {
    expect(
      reportPath({ ...quarterlyKeys, registrationNumber: 'R25/SR&1' })
    ).toBe(
      '/organisations/500001/registrations/R25%2FSR%261/reports/2026/quarterly/3/submissions/2'
    )
  })
})

describe(reportApiPath, () => {
  it('gives the backend registered-only route for a quarterly submission', () => {
    expect(reportApiPath(quarterlyKeys)).toBe(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/3/submissions/2'
    )
  })

  it('gives the backend accredited route for a monthly submission', () => {
    expect(reportApiPath(monthlyKeys)).toBe(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/8/submissions/1'
    )
  })
})

describe(organisationPath, () => {
  it('gives the organisation home page, encoding the number', () => {
    expect(organisationPath({ organisationNumber: '5/1' })).toBe(
      '/organisations/5%2F1'
    )
  })
})

describe(summaryLogUploadPath, () => {
  it('gives the upload page by id', () => {
    expect(
      summaryLogUploadPath({ organisationId: 'org-1', registrationId: 'reg-1' })
    ).toBe('/organisations/org-1/registrations/reg-1/summary-logs/upload')
  })
})

describe(reportsListPath, () => {
  it('gives the report list for the registration', () => {
    expect(reportsListPath(registrationKeys)).toBe(
      '/organisations/500001/registrations/R25SR500030912PA/reports'
    )
  })

  it('encodes the organisation and registration numbers', () => {
    expect(
      reportsListPath({
        organisationNumber: '5/1',
        registrationNumber: 'R&1'
      })
    ).toBe('/organisations/5%2F1/registrations/R%261/reports')
  })
})

describe(reportsCalendarApiPath, () => {
  it('gives the backend calendar route for the registration', () => {
    expect(reportsCalendarApiPath(registrationKeys)).toBe(
      '/organisations/500001/registrations/R25SR500030912PA/reports/calendar'
    )
  })
})
