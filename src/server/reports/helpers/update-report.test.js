import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { updateReport } from './update-report.js'

describe(updateReport, () => {
  it('should patch the fields onto the submission the period names and resolve to the updated report', async ({
    msw
  }) => {
    /** @type {{ method: string, pathname: string, body: string }[]} */
    const received = []
    msw.use(
      http.patch(/\/reports\//, async ({ request }) => {
        received.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.text()
        })
        return HttpResponse.json({ id: 'report-1' })
      })
    )

    const result = await updateReport(
      {
        organisationId: 'org/1',
        registrationId: 'reg-1',
        year: 2026,
        cadence: 'monthly',
        period: 3,
        submissionNumber: 1
      },
      { supportingInformation: 'notes' },
      'a-token'
    )

    expect(result).toStrictEqual({ id: 'report-1' })
    expect(received).toStrictEqual([
      {
        method: 'PATCH',
        pathname:
          '/v1/organisations/org%2F1/registrations/reg-1/reports/2026/monthly/3/submissions/1',
        body: JSON.stringify({ supportingInformation: 'notes' })
      }
    ])
  })
})
