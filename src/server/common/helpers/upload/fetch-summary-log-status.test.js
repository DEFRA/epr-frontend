import { config } from '#config/config.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'
import { fetchSummaryLogStatus } from './fetch-summary-log-status.js'

const backendToken = toBackendToken('test-id-token')

describe(fetchSummaryLogStatus, () => {
  const backendUrl = config.get('eprBackendUrl')
  const keys = {
    organisationNumber: toOrganisationNumber('500118'),
    registrationNumber: toRegistrationNumber('R26ER5001180041PL')
  }
  const summaryLogId = 'log-789'

  it('should return the summary log status when the backend responds successfully', async ({
    msw
  }) => {
    const mockResponse = {
      status: 'validated',
      year: 2026,
      validation: null
    }

    msw.use(
      http.get(
        `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/summary-logs/log-789`,
        () => HttpResponse.json(mockResponse)
      )
    )

    const result = await fetchSummaryLogStatus(keys, summaryLogId, {
      backendToken
    })

    expect(result).toStrictEqual(mockResponse)
  })

  it('should preserve loadsByReportingPeriod row detail in the response', async ({
    msw
  }) => {
    const emptyGroup = () => ({
      balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
      nonBalanceAffecting: { count: 0, rows: [] }
    })
    const rows = [
      {
        rowId: '1000',
        wasteRecordType: 'received',
        exclusionReasons: ['MISSING_REQUIRED_FIELD'],
        tonnageDelta: 0
      }
    ]
    const loadsByReportingPeriod = {
      openPeriodLoads: {
        added: {
          balanceAffecting: { count: 0, tonnageDelta: 0, rows: [] },
          nonBalanceAffecting: { count: 1, rows }
        },
        adjusted: emptyGroup()
      },
      closedPeriodLoads: { added: emptyGroup(), adjusted: emptyGroup() }
    }

    msw.use(
      http.get(
        `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/summary-logs/log-789`,
        () =>
          HttpResponse.json({
            status: 'validated',
            year: 2026,
            processingType: 'REPROCESSOR_INPUT',
            loadsByReportingPeriod
          })
      )
    )

    const result = await fetchSummaryLogStatus(keys, summaryLogId, {
      backendToken
    })

    expect(result).toHaveProperty(
      'loadsByReportingPeriod.openPeriodLoads.added.nonBalanceAffecting.rows',
      rows
    )
  })

  it('should strip unknown fields from the response', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/summary-logs/log-789`,
        () =>
          HttpResponse.json({
            status: 'validated',
            year: 2026,
            unknownField: 'should be stripped'
          })
      )
    )

    const result = await fetchSummaryLogStatus(keys, summaryLogId, {
      backendToken
    })

    expect(result).not.toHaveProperty('unknownField')
  })

  it('should log a warning and still return the value when the response fails schema validation', async ({
    msw
  }) => {
    const warnSpy = vi
      .spyOn(createLogger(), 'warn')
      .mockImplementation(() => {})

    msw.use(
      http.get(
        `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/summary-logs/log-789`,
        () =>
          HttpResponse.json({
            status: 'validated',
            year: 2026,
            loadsByReportingPeriod: { openPeriodLoads: 'not-an-object' }
          })
      )
    )

    const result = await fetchSummaryLogStatus(keys, summaryLogId, {
      backendToken
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('validated')

    warnSpy.mockRestore()
  })
})
