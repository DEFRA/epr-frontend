import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'
import { fetchSummaryLogStatus } from './fetch-summary-log-status.js'

describe(fetchSummaryLogStatus, () => {
  const backendUrl = config.get('eprBackendUrl')
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

  it('should return the summary log status when the backend responds successfully', async ({
    msw
  }) => {
    const mockResponse = {
      status: 'validated',
      validation: null
    }

    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () => HttpResponse.json(mockResponse)
      )
    )

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId,
      { backendToken: 'test-id-token' }
    )

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
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () =>
          HttpResponse.json({
            status: 'validated',
            processingType: 'REPROCESSOR_INPUT',
            loadsByReportingPeriod
          })
      )
    )

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId,
      { backendToken: 'test-id-token' }
    )

    expect(
      result.loadsByReportingPeriod?.openPeriodLoads.added.nonBalanceAffecting
        .rows
    ).toStrictEqual(rows)
  })

  it('should strip unknown fields from the response', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () =>
          HttpResponse.json({
            status: 'validated',
            unknownField: 'should be stripped'
          })
      )
    )

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId,
      { backendToken: 'test-id-token' }
    )

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
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () =>
          HttpResponse.json({
            status: 'validated',
            loadsByReportingPeriod: { openPeriodLoads: 'not-an-object' }
          })
      )
    )

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId,
      { backendToken: 'test-id-token' }
    )

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('validated')

    warnSpy.mockRestore()
  })
})
