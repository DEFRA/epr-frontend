import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'

describe(fetchPackagingRecyclingNote, () => {
  it('should get the note the ids name and resolve to it', async ({ msw }) => {
    const note = {
      id: 'prn-4',
      issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
      tonnage: 100,
      status: 'awaiting_authorisation'
    }
    /** @type {string[]} */
    const pathnames = []
    msw.use(
      http.get(/packaging-recycling-notes\/[^/]+$/, ({ request }) => {
        pathnames.push(new URL(request.url).pathname)
        return HttpResponse.json(note)
      })
    )

    const result = await fetchPackagingRecyclingNote(
      'org/1',
      'reg&2',
      'acc#3',
      'prn@4',
      'a-token'
    )

    expect(result).toStrictEqual({
      id: 'prn-4',
      issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
      tonnage: 100,
      status: 'awaiting_authorisation'
    })
    expect(pathnames).toStrictEqual([
      '/v1/organisations/org%2F1/registrations/reg%262/accreditations/acc%233/packaging-recycling-notes/prn%404'
    ])
  })
})
