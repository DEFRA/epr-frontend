import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { createReport } from './create-report.js'

describe(createReport, () => {
  it('should create the submission the period names and resolve to the new report', async ({
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
        return HttpResponse.json({ id: 'report-1' }, { status: 201 })
      })
    )

    const result = await createReport(
      'org/1',
      'reg-1',
      2026,
      'monthly',
      3,
      1,
      'a-token'
    )

    expect(result).toStrictEqual({ id: 'report-1' })
    expect(received).toStrictEqual([
      {
        method: 'POST',
        pathname:
          '/v1/organisations/org%2F1/registrations/reg-1/reports/2026/monthly/3/submissions/1',
        body: ''
      }
    ])
  })
})
