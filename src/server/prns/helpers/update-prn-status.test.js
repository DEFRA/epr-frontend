import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'

import { isClosedYearRefusal } from './closed-year.js'
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
        organisationNumber: '500123',
        registrationNumber: 'R26/1',
        year: '2026'
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

  it('should reject as a closed-year refusal when the backend says the year has closed', async ({
    msw
  }) => {
    msw.use(
      http.post(/\/status$/, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'Conflict',
            message:
              'The deadline for a 2026 relevant year was 31 January 2027.',
            code: 'RELEVANT_YEAR_CLOSED'
          },
          { status: 409 }
        )
      )
    )

    const error = await updatePrnStatus(
      {
        organisationNumber: '500123',
        registrationNumber: 'R26/1',
        year: '2026'
      },
      'prn-789',
      { status: 'awaiting_acceptance' },
      toBackendToken('a-token')
    ).catch((rejected) => rejected)

    expect(isClosedYearRefusal(error)).toBe(true)
  })
})
