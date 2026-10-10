import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

import { reportBackend, reportPath } from './report-backend.js'
import { ReportStaleError, STALE_REASON } from './stale.js'

/**
 * @import { SetupServerApi } from 'msw/node'
 */

const backendUrl = config.get('eprBackendUrl')

describe('report-backend', () => {
  describe(reportPath, () => {
    it('should address the submission with every id encoded', () => {
      expect(
        reportPath({
          organisationId: 'org/1',
          registrationId: 'reg&2',
          year: 2026,
          cadence: 'monthly',
          period: 3,
          submissionNumber: 1
        })
      ).toBe(
        '/v1/organisations/org%2F1/registrations/reg%262/reports/2026/monthly/3/submissions/1'
      )
    })
  })

  describe(reportBackend, () => {
    /**
     * @param {SetupServerApi} msw
     * @param {Response} response
     */
    const backendAnswers = (msw, response) =>
      msw.use(http.patch(`${backendUrl}/v1/report`, () => response))

    it.for([
      {
        description: 'a list of stale reasons',
        code: [STALE_REASON.SUMMARY_LOG_CHANGED, STALE_REASON.PRN_CANCELLED],
        reasons: [STALE_REASON.SUMMARY_LOG_CHANGED, STALE_REASON.PRN_CANCELLED]
      },
      {
        description: 'a bare stale reason from an older backend',
        code: STALE_REASON.SUMMARY_LOG_CHANGED,
        reasons: [STALE_REASON.SUMMARY_LOG_CHANGED]
      }
    ])(
      'should reject a 409 carrying $description as the report going stale',
      async ({ code, reasons }, { msw }) => {
        backendAnswers(msw, HttpResponse.json({ code }, { status: 409 }))

        await expect(
          reportBackend('a-token').patch('/v1/report', {})
        ).rejects.toStrictEqual(new ReportStaleError(reasons))
      }
    )

    it.for([
      { description: 'no code', body: {} },
      {
        description: 'a code that is not a stale reason',
        body: { code: ['version_conflict'] }
      }
    ])(
      'should reject a 409 with $description as the conflict itself',
      async ({ body }, { msw }) => {
        backendAnswers(msw, HttpResponse.json(body, { status: 409 }))

        await expect(
          reportBackend('a-token').patch('/v1/report', {})
        ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 409 } })
      }
    )

    it('should reject any other failure as itself', async ({ msw }) => {
      backendAnswers(msw, new HttpResponse(null, { status: 500 }))

      await expect(
        reportBackend('a-token').patch('/v1/report', {})
      ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 500 } })
    })
  })
})
