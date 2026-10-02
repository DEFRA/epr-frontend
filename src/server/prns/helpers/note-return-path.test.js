import { describe, expect, it } from 'vitest'

import { noteReturn } from './note-return-path.js'

const ids = {
  organisationId: 'org-1',
  registrationId: 'reg-1',
  accreditationId: 'acc-1'
}

const accreditation =
  '/organisations/org-1/registrations/reg-1/accreditations/acc-1'

describe(noteReturn, () => {
  it('returns an operator to their own note list', () => {
    expect(noteReturn(ids)).toStrictEqual({
      path: `${accreditation}/packaging-recycling-notes`,
      textKey: 'prns:view:returnLink'
    })
  })
})
