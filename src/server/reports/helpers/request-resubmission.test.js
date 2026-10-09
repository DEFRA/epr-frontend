import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { requestResubmission } from './request-resubmission.js'

describe(requestResubmission, () => {
  it('should ask to resubmit the submission the period names', async ({
    msw
  }) => {
    /** @type {{ method: string, pathname: string, body: string }[]} */
    const received = []
    msw.use(
      http.post(/\/reports\//, async ({ request }) => {
        received.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.text()
        })
        return new HttpResponse(null, { status: 204 })
      })
    )

    const result = await requestResubmission(
      {
        organisationId: 'org/1',
        registrationId: 'reg-1',
        year: 2026,
        cadence: 'monthly',
        period: 3,
        submissionNumber: 1
      },
      'a-token'
    )

    expect(result).toBeUndefined()
    expect(received).toStrictEqual([
      {
        method: 'POST',
        pathname:
          '/v1/organisations/org%2F1/registrations/reg-1/reports/2026/monthly/3/submissions/1/request-resubmission',
        body: ''
      }
    ])
  })
})
