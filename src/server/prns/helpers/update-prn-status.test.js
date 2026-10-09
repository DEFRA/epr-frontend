import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { updatePrnStatus } from './update-prn-status.js'

describe(updatePrnStatus, () => {
  it('should post the new status to the note the ids name and resolve to the updated note', async ({
    msw
  }) => {
    const updated = { id: 'prn/4', status: 'awaiting_authorisation' }
    /** @type {{ pathname: string, body: unknown }[]} */
    const received = []
    msw.use(
      http.post(/\/status$/, async ({ request }) => {
        received.push({
          pathname: new URL(request.url).pathname,
          body: await request.json()
        })
        return HttpResponse.json(updated)
      })
    )

    const result = await updatePrnStatus(
      'org/1',
      'reg&2',
      'acc#3',
      'prn/4',
      { status: 'awaiting_authorisation' },
      'a-token'
    )

    expect(result).toStrictEqual(updated)
    expect(received).toStrictEqual([
      {
        pathname:
          '/v1/organisations/org%2F1/registrations/reg%262/accreditations/acc%233/packaging-recycling-notes/prn%2F4/status',
        body: { status: 'awaiting_authorisation' }
      }
    ])
  })
})
