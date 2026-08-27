import { buildEventView } from './helpers/build-preview-views.js'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const localise = (/** @type {string} */ key) => key

const hostile = '<img src=x onerror=alert(1)>'

describe('a ledger event built from hostile values', () => {
  it('states them without letting them become markup', () => {
    const view = buildEventView({
      event: {
        number: 1,
        kind: 'prn-issued',
        createdAt: '2026-03-05T11:30:00.000Z',
        createdBy: { id: hostile, name: hostile, email: hostile },
        prn: { id: hostile, prnNumber: hostile, tonnage: 25 },
        balance: {
          opening: { total: 0, available: 0 },
          closing: { total: 0, available: 0 }
        }
      },
      ledgerPath: '/organisations/o/registrations/r/accreditations/a',
      localise,
      noteType: 'PRN'
    })

    const markup = view.rows.map((row) => row.value.html ?? '').join('')
    const body = new JSDOM(`<div>${markup}</div>`).window.document.body

    // Nothing the backend supplied became an element or an attribute of one.
    expect(body.querySelector('img')).toBeNull()
    expect(
      Array.from(body.querySelectorAll('*')).flatMap((element) =>
        Array.from(element.attributes).map((attribute) => attribute.name)
      )
    ).not.toContain('onerror')

    // It is still stated, as text.
    expect(body.textContent).toContain(hostile)
  })
})
