import { toYear } from '#server/common/helpers/year.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'

import { updatePrnStatus } from './update-prn-status.js'

describe(updatePrnStatus, () => {
  it('should post the status to the note the keys name and resolve to it in the page shape', async ({
    msw
  }) => {
    /** @type {{ body: unknown, pathname: string }[]} */
    const received = []
    msw.use(
      http.post(/\/status$/, async ({ request }) => {
        received.push({
          body: await request.json(),
          pathname: new URL(request.url).pathname
        })
        return HttpResponse.json(
          buildPrnResource({
            status: { current: 'awaiting_acceptance', timeline: [] },
            prnNumber: 'ER2625001A'
          })
        )
      })
    )

    const result = await updatePrnStatus(
      {
        organisationNumber: toOrganisationNumber('500123'),
        registrationNumber: toRegistrationNumber('R26/1'),
        year: toYear(2026)
      },
      'prn#789',
      { status: 'awaiting_acceptance' },
      toBackendToken('a-token')
    )

    expect(result).toMatchObject({
      id: 'prn-789',
      status: 'awaiting_acceptance',
      prnNumber: 'ER2625001A',
      material: 'plastic'
    })
    expect(received).toStrictEqual([
      {
        body: { status: 'awaiting_acceptance' },
        pathname:
          '/organisations/500123/registrations/R26%2F1/accreditations/2026/packaging-recycling-notes/prn%23789/status'
      }
    ])
  })
})
