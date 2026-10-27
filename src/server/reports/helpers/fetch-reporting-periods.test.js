import { toYear } from '#server/common/helpers/year.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { it } from '#vite/fixtures/server.js'

import {
  fetchReportingPeriods,
  fetchYearCalendar
} from './fetch-reporting-periods.js'

describe(fetchYearCalendar, () => {
  it("should read the calendar of the registration's year the keys name", async ({
    msw
  }) => {
    const calendar = {
      year: toYear(2025),
      registeredOnly: { reportingPeriods: [] }
    }
    /** @type {string[]} */
    const pathnames = []
    msw.use(
      http.get(/\/calendar$/, ({ request }) => {
        pathnames.push(new URL(request.url).pathname)
        return HttpResponse.json(calendar)
      })
    )

    const result = await fetchYearCalendar(
      {
        organisationNumber: toOrganisationNumber('500001'),
        registrationNumber: toRegistrationNumber('R25/1'),
        year: toYear(2025)
      },
      toBackendToken('a-token')
    )

    expect(result).toStrictEqual(calendar)
    expect(pathnames).toStrictEqual([
      '/organisations/500001/registrations/R25%2F1/reports/2025/calendar'
    ])
  })
})

describe(fetchReportingPeriods, () => {
  const quarter = { cadence: 'quarterly', period: 1, startDate: '2026-01-01' }
  const march = { cadence: 'monthly', period: 3, startDate: '2026-03-01' }
  const april = { cadence: 'monthly', period: 4, startDate: '2026-04-01' }
  const keys = {
    organisationNumber: toOrganisationNumber('500001'),
    registrationNumber: toRegistrationNumber('R1'),
    year: toYear(2026)
  }

  it('lists registered-only and accredited periods together in date order', async ({
    msw
  }) => {
    msw.use(
      http.get(/\/calendar$/, () =>
        HttpResponse.json({
          year: toYear(2026),
          registeredOnly: { reportingPeriods: [quarter] },
          accredited: {
            accreditationNumber: 'A1',
            reportingPeriods: [april, march]
          }
        })
      )
    )

    await expect(
      fetchReportingPeriods(keys, toBackendToken('a-token'))
    ).resolves.toStrictEqual([quarter, march, april])
  })

  it('lists none for a year with no ended period', async ({ msw }) => {
    msw.use(
      http.get(/\/calendar$/, () => HttpResponse.json({ year: toYear(2026) }))
    )

    await expect(
      fetchReportingPeriods(keys, toBackendToken('a-token'))
    ).resolves.toStrictEqual([])
  })
})
