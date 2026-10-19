import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'

import { updatePrnStatus } from './update-prn-status.js'

describe(updatePrnStatus, () => {
  it('should post the status to the note the keys name and resolve to it in the page shape', async ({
    msw
  }) => {
    /** @type {{ authorization: string | null, body: unknown, pathname: string }[]} */
    const received = []
    msw.use(
      http.post(/\/status$/, async ({ request }) => {
        received.push({
          authorization: request.headers.get('authorization'),
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
      'a-token'
    )

    expect(result).toMatchObject({
      id: 'prn-789',
      status: 'awaiting_acceptance',
      prnNumber: 'ER2625001A',
      material: 'plastic'
    })
    expect(received).toStrictEqual([
      {
        authorization: 'Bearer a-token',
        body: { status: 'awaiting_acceptance' },
        pathname:
          '/organisations/500123/registrations/R26%2F1/accreditations/2026/packaging-recycling-notes/prn%23789/status'
      }
    ])
  })
})
