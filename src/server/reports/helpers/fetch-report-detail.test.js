import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

import { fetchReportDetail } from './fetch-report-detail.js'
import { ReportStaleError, STALE_REASON } from './stale.js'

/**
 * @import { SetupServerApi } from 'msw/node'
 */

const backendUrl = config.get('eprBackendUrl')

describe(fetchReportDetail, () => {
  const report = { id: 'report-1', status: 'in_progress' }
  const summaryLogChanged = {
    uploadedAt: '2026-06-01T00:00:00.000Z',
    summaryLogId: 'sl-1'
  }
  const prnCancelled = {
    occurredAt: '2026-06-01T00:00:00.000Z',
    prnId: 'prn-1'
  }

  /**
   * @param {SetupServerApi} msw
   * @param {object} body
   */
  const backendAnswers = (msw, body) =>
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-1/registrations/reg-1/reports/2026/monthly/3/submissions/1`,
        () => HttpResponse.json(body)
      )
    )

  const fetchDetail = () =>
    fetchReportDetail('org-1', 'reg-1', 2026, 'monthly', 3, 1, 'a-token')

  it.for([
    {
      description: 'a summary log changed under it',
      stale: { summaryLogChanged },
      reasons: [STALE_REASON.SUMMARY_LOG_CHANGED]
    },
    {
      description: 'a prn it counted was cancelled',
      stale: { prnCancelled },
      reasons: [STALE_REASON.PRN_CANCELLED]
    },
    {
      description: 'both',
      stale: { summaryLogChanged, prnCancelled },
      reasons: [STALE_REASON.SUMMARY_LOG_CHANGED, STALE_REASON.PRN_CANCELLED]
    }
  ])(
    'should reject as stale a report the backend marks stale because $description',
    async ({ stale, reasons }, { msw }) => {
      backendAnswers(msw, { ...report, stale })

      await expect(fetchDetail()).rejects.toStrictEqual(
        new ReportStaleError(reasons)
      )
    }
  )

  it.for([
    { description: 'carries no stale marker', body: report },
    {
      description: 'carries a stale marker with no reason it recognises',
      body: { ...report, stale: {} }
    }
  ])(
    'should resolve to a report that $description',
    async ({ body }, { msw }) => {
      backendAnswers(msw, body)

      await expect(fetchDetail()).resolves.toStrictEqual(body)
    }
  )
})
