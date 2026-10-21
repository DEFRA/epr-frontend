import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { ReportStaleError, STALE_REASON } from './stale.js'
import { updateReport } from './update-report.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

describe(updateReport, () => {
  /** @type {SubmissionKeys} */
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25/1',
    year: 2026,
    cadence: 'monthly',
    period: 3,
    submissionNumber: 1
  }

  it('should patch the fields onto the submission the period names and resolve to the updated report', async ({
    msw
  }) => {
    /** @type {{ authorization: string | null, method: string, pathname: string, body: string }[]} */
    const received = []
    msw.use(
      http.patch(/\/reports\//, async ({ request }) => {
        received.push({
          authorization: request.headers.get('authorization'),
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.text()
        })
        return HttpResponse.json({ id: 'report-1' })
      })
    )

    const result = await updateReport(
      keys,
      { supportingInformation: 'notes' },
      'a-token'
    )

    expect(result).toStrictEqual({ id: 'report-1' })
    expect(received).toStrictEqual([
      {
        authorization: 'Bearer a-token',
        method: 'PATCH',
        pathname:
          '/organisations/500001/registrations/R25%2F1/accreditations/2026/reports/monthly/3/submissions/1',
        body: JSON.stringify({ supportingInformation: 'notes' })
      }
    ])
  })

  it('should reject a 409 carrying a stale reason as the report going stale', async ({
    msw
  }) => {
    msw.use(
      http.patch(/\/reports\//, () =>
        HttpResponse.json({ code: ['summary_log_changed'] }, { status: 409 })
      )
    )

    await expect(
      updateReport(keys, { supportingInformation: 'notes' }, 'a-token')
    ).rejects.toStrictEqual(
      new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
    )
  })
})
