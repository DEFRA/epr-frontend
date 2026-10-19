import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { submitSummaryLog } from './submit-summary-log.js'

describe(submitSummaryLog, () => {
  it('should submit the summary log the keys name and resolve to the outcome', async ({
    msw
  }) => {
    /** @type {{ authorization: string | null, pathname: string }[]} */
    const received = []
    msw.use(
      http.post(/\/submit$/, ({ request }) => {
        received.push({
          authorization: request.headers.get('authorization'),
          pathname: new URL(request.url).pathname
        })
        return HttpResponse.json({
          status: 'submitted',
          accreditationNumber: '493021'
        })
      })
    )

    const result = await submitSummaryLog(
      { organisationNumber: '500118', registrationNumber: 'R26/1' },
      'log#3',
      'a-token'
    )

    expect(result).toStrictEqual({
      status: 'submitted',
      accreditationNumber: '493021'
    })
    expect(received).toStrictEqual([
      {
        authorization: 'Bearer a-token',
        pathname:
          '/organisations/500118/registrations/R26%2F1/summary-logs/log%233/submit'
      }
    ])
  })
})
