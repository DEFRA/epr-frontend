import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { ReportStaleError, STALE_REASON } from './stale.js'
import { updateReportStatus } from './update-report-status.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

describe(updateReportStatus, () => {
  /** @type {SubmissionKeys} */
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25/1',
    year: 2026,
    cadence: 'monthly',
    period: 3,
    submissionNumber: 1
  }

  it('should post the transition to the submission status and resolve to the updated report', async ({
    msw
  }) => {
    /** @type {{ authorization: string | null, method: string, pathname: string, body: string }[]} */
    const received = []
    msw.use(
      http.post(/\/reports\//, async ({ request }) => {
        received.push({
          authorization: request.headers.get('authorization'),
          method: request.method,
          pathname: new URL(request.url).pathname,
          body: await request.text()
        })
        return HttpResponse.json({ id: 'report-1' })
      })
    )

    const result = await updateReportStatus(
      keys,
      { status: 'submitted', version: 1 },
      'a-token'
    )

    expect(result).toStrictEqual({ id: 'report-1' })
    expect(received).toStrictEqual([
      {
        authorization: 'Bearer a-token',
        method: 'POST',
        pathname:
          '/organisations/500001/registrations/R25%2F1/accreditations/2026/reports/monthly/3/submissions/1/status',
        body: JSON.stringify({ status: 'submitted', version: 1 })
      }
    ])
  })

  it('should reject a 409 carrying a stale reason as the report going stale', async ({
    msw
  }) => {
    msw.use(
      http.post(/\/reports\//, () =>
        HttpResponse.json({ code: ['summary_log_changed'] }, { status: 409 })
      )
    )

    await expect(
      updateReportStatus(keys, { status: 'submitted', version: 1 }, 'a-token')
    ).rejects.toStrictEqual(
      new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
    )
  })
})
