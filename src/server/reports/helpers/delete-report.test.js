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
      {
        organisationNumber: '500001',
        registrationNumber: 'R25/1',
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
        method: 'DELETE',
        pathname:
          '/organisations/500001/registrations/R25%2F1/accreditations/2026/reports/monthly/3/submissions/1',
        body: ''
      }
    ])
  })
})
