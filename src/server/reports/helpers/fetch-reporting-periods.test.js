import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchReportingPeriodsByNumber } from './fetch-reporting-periods.js'

describe(fetchReportingPeriodsByNumber, () => {
  it('should read the calendar of the registration the keys name', async ({
    msw
  }) => {
    const calendar = { cadence: 'quarterly', reportingPeriods: [] }
    /** @type {string[]} */
    const pathnames = []
    msw.use(
      http.get(/\/calendar$/, ({ request }) => {
        pathnames.push(new URL(request.url).pathname)
        return HttpResponse.json(calendar)
      })
    )

    const result = await fetchReportingPeriodsByNumber(
      { organisationNumber: '500001', registrationNumber: 'R25/1' },
      'a-token'
    )

    expect(result).toStrictEqual(calendar)
    expect(pathnames).toStrictEqual([
      '/organisations/500001/registrations/R25%2F1/reports/calendar'
    ])
  })
})
