import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, vi } from 'vitest'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { year } from '#server/common/helpers/year.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'
import { test } from '#vite/fixtures/server.js'

import { fetchAccreditationBalance } from './fetch-accreditation-balance.js'

const backendUrl = config.get('eprBackendUrl')
const balancesUrl = `${backendUrl}/organisations/500001/waste-balances/2026`

const logger = createMockLogger()

const balance = { amount: 20.5, availableAmount: 10.3 }

const params = {
  organisationNumber: organisationNumber(500001),
  year: year(2026),
  accreditationNumber: 'A26ER5001180114PL',
  backendToken: 'mock-token',
  logger
}

describe(fetchAccreditationBalance, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("returns the accreditation's balance for the year", async ({ msw }) => {
    let authorization
    msw.use(
      http.get(balancesUrl, ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({ A26ER5001180114PL: balance })
      })
    )

    await expect(fetchAccreditationBalance(params)).resolves.toStrictEqual(
      balance
    )
    expect(authorization).toBe('Bearer mock-token')
  })

  test('returns null when the year holds no balance for the accreditation', async ({
    msw
  }) => {
    msw.use(
      http.get(balancesUrl, () => HttpResponse.json({ A26OTHER: balance }))
    )

    await expect(fetchAccreditationBalance(params)).resolves.toBeNull()
  })

  test('returns null and logs the organisation and year when the read fails', async ({
    msw
  }) => {
    msw.use(
      http.get(
        balancesUrl,
        () =>
          new HttpResponse(null, { status: statusCodes.internalServerError })
      )
    )

    await expect(fetchAccreditationBalance(params)).resolves.toBeNull()
    expect(logger.error).toHaveBeenCalledWith({
      message: 'Failed to fetch waste balance',
      err: expect.objectContaining({
        output: expect.objectContaining({
          statusCode: statusCodes.internalServerError
        })
      }),
      event: {
        action: 'fetch_accreditation_balance',
        reason: 'organisationNumber=500001 year=2026'
      }
    })
  })
})
