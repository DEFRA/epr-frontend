import { toYear } from '#server/common/helpers/year.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { it } from '#vite/fixtures/server.js'

import { fetchDecemberPrnEligibility } from './fetch-december-prn-eligibility.js'

describe(fetchDecemberPrnEligibility, () => {
  it('should get the eligibility of the accreditation the keys name and resolve to it', async ({
    msw
  }) => {
    /** @type {{ pathname: string }[]} */
    const received = []
    msw.use(
      http.get(/december-prn-eligibility$/, ({ request }) => {
        received.push({
          pathname: new URL(request.url).pathname
        })
        return HttpResponse.json({ mode: 'manual', windowOpen: true })
      })
    )

    const result = await fetchDecemberPrnEligibility(
      {
        organisationNumber: toOrganisationNumber('500123'),
        registrationNumber: toRegistrationNumber('R26/1'),
        year: toYear(2026)
      },
      toBackendToken('a-token')
    )

    expect(result).toStrictEqual({ mode: 'manual', windowOpen: true })
    expect(received).toStrictEqual([
      {
        pathname:
          '/organisations/500123/registrations/R26%2F1/accreditations/2026/packaging-recycling-notes/december-prn-eligibility'
      }
    ])
  })
})
