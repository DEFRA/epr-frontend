import { describe, expect, it } from 'vitest'

import {
  RETURN_TO_ACCREDITATION,
  RETURN_TO_LEDGER,
  noteReturn
} from './note-return-path.js'

const ids = {
  organisationId: 'org-1',
  registrationId: 'reg-1',
  accreditationId: 'acc-1',
  isRegulator: true
}

const accreditation =
  '/organisations/org-1/registrations/reg-1/accreditations/acc-1'

describe(noteReturn, () => {
  it('returns to the note list by default', () => {
    expect(noteReturn(ids)).toStrictEqual({
      path: `${accreditation}/packaging-recycling-notes`,
      textKey: 'prns:view:returnLink'
    })
  })

  it('returns to the accreditation for a note opened from its summary', () => {
    expect(noteReturn({ ...ids, from: RETURN_TO_ACCREDITATION })).toStrictEqual(
      { path: accreditation, textKey: 'prns:view:returnLinkAccreditation' }
    )
  })

  it('returns to the ledger for a note opened from one of its rows', () => {
    expect(noteReturn({ ...ids, from: RETURN_TO_LEDGER })).toStrictEqual({
      path: `${accreditation}/waste-balance-ledger`,
      textKey: 'prns:view:returnLinkLedger'
    })
  })

  it('sends an operator to their own list, whatever a shared link says', () => {
    for (const from of [RETURN_TO_ACCREDITATION, RETURN_TO_LEDGER]) {
      expect(noteReturn({ ...ids, isRegulator: false, from })).toStrictEqual({
        path: `${accreditation}/packaging-recycling-notes`,
        textKey: 'prns:view:returnLink'
      })
    }
  })

  it('falls back to the note list for a value it does not know', () => {
    expect(noteReturn({ ...ids, from: 'elsewhere' }).path).toBe(
      `${accreditation}/packaging-recycling-notes`
    )
  })

  it('never lets the parameter reach the path', () => {
    const { path } = noteReturn({
      ...ids,
      from: 'https://example.com/phishing'
    })

    expect(path).toBe(`${accreditation}/packaging-recycling-notes`)
    expect(path).not.toContain('example.com')
  })

  it('reads no destination off a key every object inherits', () => {
    // A plain object would answer `constructor` and `__proto__` as its own.
    for (const from of ['constructor', '__proto__', 'toString']) {
      expect(noteReturn({ ...ids, from }).path).toBe(
        `${accreditation}/packaging-recycling-notes`
      )
    }
  })
})
