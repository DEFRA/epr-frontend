import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { deleteReport } from './delete-report.js'

describe(deleteReport, () => {
  it('should delete the submission the period names', async ({ msw }) => {
    /** @type {{ method: string, pathname: string, body: string }[]} */
    const received = []
    msw.use(
      http.delete(/\/reports\//, async ({ request }) => {
        received.push({
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.text()
        })
        return new HttpResponse(null, { status: 204 })
      })
    )

    const result = await deleteReport(
      'org/1',
      'reg-1',
      2026,
      'monthly',
      3,
      1,
      'a-token'
    )

    expect(result).toBeUndefined()
    expect(received).toStrictEqual([
      {
        method: 'DELETE',
        pathname:
          '/v1/organisations/org%2F1/registrations/reg-1/reports/2026/monthly/3/submissions/1',
        body: ''
      }
    ])
  })
})
