import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { updateReportStatus } from './update-report-status.js'

describe(updateReportStatus, () => {
  it('should post the transition to the submission status and resolve to the updated report', async ({
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
        return HttpResponse.json({ id: 'report-1' })
      })
    )

    const result = await updateReportStatus(
      {
        organisationId: 'org/1',
        registrationId: 'reg-1',
        year: 2026,
        cadence: 'monthly',
        period: 3,
        submissionNumber: 1
      },
      { status: 'submitted', version: 1 },
      'a-token'
    )

    expect(result).toStrictEqual({ id: 'report-1' })
    expect(received).toStrictEqual([
      {
        method: 'POST',
        pathname:
          '/v1/organisations/org%2F1/registrations/reg-1/reports/2026/monthly/3/submissions/1/status',
        body: JSON.stringify({ status: 'submitted', version: 1 })
      }
    ])
  })
})
