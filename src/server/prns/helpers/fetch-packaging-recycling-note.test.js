import { toYear } from '#server/common/helpers/year.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'

import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'

const keys = {
  organisationNumber: toOrganisationNumber('500123'),
  registrationNumber: toRegistrationNumber('R26EN0000000001PL'),
  year: toYear(2026)
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

    const result = await fetchPackagingRecyclingNote(
      keys,
      'prn@4',
      toBackendToken('a-token')
    )

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
