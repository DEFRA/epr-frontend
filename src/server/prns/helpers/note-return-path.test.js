import { describe, expect, it } from 'vitest'

import { noteReturn } from './note-return-path.js'

const keys = {
  organisationNumber: '500123',
  registrationNumber: 'R26EN0000000001PL',
  year: '2026'
}

describe(noteReturn, () => {
  it('returns an operator to their own note list', () => {
    expect(noteReturn(keys)).toStrictEqual({
      path: '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes',
      textKey: 'prns:view:returnLink'
    })
  })
})
