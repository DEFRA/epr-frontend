import { describe, expect, it } from 'vitest'

import { RETURN_TO_ACCREDITATION, noteReturnPath } from './note-return-path.js'

const ids = {
  organisationId: 'org-1',
  registrationId: 'reg-1',
  accreditationId: 'acc-1'
}

const accreditation =
  '/organisations/org-1/registrations/reg-1/accreditations/acc-1'

describe(noteReturnPath, () => {
  it('returns to the note list by default', () => {
    expect(noteReturnPath(ids)).toBe(
      `${accreditation}/packaging-recycling-notes`
    )
  })

  it('returns to the accreditation for a note opened from its summary', () => {
    expect(noteReturnPath({ ...ids, from: RETURN_TO_ACCREDITATION })).toBe(
      accreditation
    )
  })

  it('falls back to the note list for a value it does not know', () => {
    expect(noteReturnPath({ ...ids, from: 'elsewhere' })).toBe(
      `${accreditation}/packaging-recycling-notes`
    )
  })

  it('never lets the parameter reach the path', () => {
    const path = noteReturnPath({
      ...ids,
      from: 'https://example.com/phishing'
    })

    expect(path).toBe(`${accreditation}/packaging-recycling-notes`)
    expect(path).not.toContain('example.com')
  })
})
