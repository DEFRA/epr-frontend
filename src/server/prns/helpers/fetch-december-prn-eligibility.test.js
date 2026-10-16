import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchDecemberPrnEligibility } from './fetch-december-prn-eligibility.js'

describe(fetchDecemberPrnEligibility, () => {
  it('should get the eligibility of the accreditation the ids name and resolve to it', async ({
    msw
  }) => {
    const eligibility = { mode: 'manual', windowOpen: true }
    /** @type {{ authorization: string | null, pathname: string }[]} */
    const received = []
    msw.use(
      http.get(/december-prn-eligibility$/, ({ request }) => {
        received.push({
          authorization: request.headers.get('authorization'),
          pathname: new URL(request.url).pathname
        })
        return HttpResponse.json(eligibility)
      })
    )

    const result = await fetchDecemberPrnEligibility(
      'org/1',
      'reg&2',
      'acc#3',
      'a-token'
    )

    expect(result).toStrictEqual({ mode: 'manual', windowOpen: true })
    expect(received).toStrictEqual([
      {
        authorization: 'Bearer a-token',
        pathname:
          '/v1/organisations/org%2F1/registrations/reg%262/accreditations/acc%233/packaging-recycling-notes/december-prn-eligibility'
      }
    ])
  })
})
