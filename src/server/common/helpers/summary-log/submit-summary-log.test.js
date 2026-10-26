import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { it } from '#vite/fixtures/server.js'

import { submitSummaryLog } from './submit-summary-log.js'

describe(submitSummaryLog, () => {
  it('should submit the summary log the keys name and resolve to the outcome', async ({
    msw
  }) => {
    /** @type {{ pathname: string }[]} */
    const received = []
    msw.use(
      http.post(/\/submit$/, ({ request }) => {
        received.push({
          pathname: new URL(request.url).pathname
        })
        return HttpResponse.json({
          status: 'submitted',
          accreditationNumber: toAccreditationNumber('493021')
        })
      })
    )

    const result = await submitSummaryLog(
      {
        organisationNumber: toOrganisationNumber('500118'),
        registrationNumber: toRegistrationNumber('R26/1')
      },
      'log#3',
      toBackendToken('a-token')
    )

    expect(result).toStrictEqual({
      status: 'submitted',
      accreditationNumber: toAccreditationNumber('493021')
    })
    expect(received).toStrictEqual([
      {
        pathname:
          '/organisations/500118/registrations/R26%2F1/summary-logs/log%233/submit'
      }
    ])
  })
})
