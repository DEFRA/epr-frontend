import { toYear } from '#server/common/helpers/year.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { describe, expect, it } from 'vitest'

import { noteReturn } from './note-return-path.js'

const keys = {
  organisationNumber: toOrganisationNumber('500123'),
  registrationNumber: toRegistrationNumber('R26EN0000000001PL'),
  year: toYear(2026)
}

describe(noteReturn, () => {
  it('returns an operator to their own note list', () => {
    expect(noteReturn(keys)).toStrictEqual({
      path: '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes',
      textKey: 'prns:view:returnLink'
    })
  })
})
