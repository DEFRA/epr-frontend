import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { submitSummaryLog } from './submit-summary-log.js'

describe(submitSummaryLog, () => {
  it('should submit the summary log the ids name and resolve to the outcome', async ({
    msw
  }) => {
    /** @type {string[]} */
    const pathnames = []
    msw.use(
      http.post(/\/submit$/, ({ request }) => {
        pathnames.push(new URL(request.url).pathname)
        return HttpResponse.json({
          status: 'submitted',
          accreditationNumber: '493021'
        })
      })
    )

    const result = await submitSummaryLog('org/1', 'reg&2', 'log#3', 'a-token')

    expect(result).toStrictEqual({
      status: 'submitted',
      accreditationNumber: '493021'
    })
    expect(pathnames).toStrictEqual([
      '/v1/organisations/org%2F1/registrations/reg%262/summary-logs/log%233/submit'
    ])
  })
})
