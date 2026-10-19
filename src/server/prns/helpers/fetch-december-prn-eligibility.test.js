import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchDecemberPrnEligibility } from './fetch-december-prn-eligibility.js'

describe(fetchDecemberPrnEligibility, () => {
  it('should get the eligibility of the accreditation the keys name and resolve to it', async ({
    msw
  }) => {
    /** @type {{ authorization: string | null, pathname: string }[]} */
    const received = []
    msw.use(
      http.get(/december-prn-eligibility$/, ({ request }) => {
        received.push({
          authorization: request.headers.get('authorization'),
          pathname: new URL(request.url).pathname
        })
        return HttpResponse.json({ mode: 'manual', windowOpen: true })
      })
    )

    const result = await fetchDecemberPrnEligibility(
      {
        organisationNumber: '500123',
        registrationNumber: 'R26/1',
        year: '2026'
      },
      'a-token'
    )

    expect(result).toStrictEqual({ mode: 'manual', windowOpen: true })
    expect(received).toStrictEqual([
      {
        authorization: 'Bearer a-token',
        pathname:
          '/organisations/500123/registrations/R26%2F1/accreditations/2026/packaging-recycling-notes/december-prn-eligibility'
      }
    ])
  })
})
