import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'

import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'

const keys = {
  organisationNumber: '500123',
  registrationNumber: 'R26EN0000000001PL',
  year: '2026'
}

describe(fetchPackagingRecyclingNote, () => {
  it('should get the note under its accreditation and resolve to the page shape', async ({
    msw
  }) => {
    /** @type {string[]} */
    const pathnames = []
    msw.use(
      http.get(/packaging-recycling-notes\/[^/]+$/, ({ request }) => {
        pathnames.push(new URL(request.url).pathname)
        return HttpResponse.json(
          buildPrnResource({
            id: 'prn-4',
            status: { current: 'awaiting_authorisation', timeline: [] }
          })
        )
      })
    )

    const result = await fetchPackagingRecyclingNote(keys, 'prn@4', 'a-token')

    expect(result).toMatchObject({
      id: 'prn-4',
      status: 'awaiting_authorisation',
      material: 'plastic',
      prnNumber: null
    })
    expect(pathnames).toStrictEqual([
      '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes/prn%404'
    ])
  })
})
