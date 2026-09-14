import { describe, expect, it } from 'vitest'

import { buildNoteBreadcrumbs } from './build-note-breadcrumbs.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 */

const localise = /** @type {TFunction} */ (
  /** @type {unknown} */ ((key) => key)
)

/** @param {string} path */
const localiseUrl = (path) => `/en${path}`

const organisation = /** @type {Organisation} */ (
  /** @type {unknown} */ ({
    id: 'org-1',
    companyDetails: { name: 'Acme Recycling Ltd', tradingName: 'Acme' }
  })
)

const registration = /** @type {Registration} */ (
  /** @type {unknown} */ ({ id: 'reg-1' })
)

const context = {
  organisation,
  registration,
  accreditationId: 'acc-1',
  noteTypePlural: 'PRNs',
  prn: { id: 'prn-1', prnNumber: 'EX123456' },
  localise,
  localiseUrl
}

describe(buildNoteBreadcrumbs, () => {
  it('walks from all organisations down to the note', () => {
    expect(buildNoteBreadcrumbs(context)).toStrictEqual([
      {
        text: 'registrations:details:allOrganisations',
        href: '/en/regulators/home'
      },
      { text: 'Acme', href: '/en/organisations/org-1' },
      {
        text: 'registrations:details:heading',
        href: '/en/organisations/org-1/registrations/reg-1'
      },
      {
        text: 'registrations:details:accreditation:breadcrumb',
        href: '/en/organisations/org-1/registrations/reg-1/accreditations/acc-1'
      },
      {
        text: 'registrations:details:accreditation:prns:listHeading',
        href: '/en/organisations/org-1/registrations/reg-1/accreditations/acc-1/packaging-recycling-notes'
      },
      { text: 'EX123456' }
    ])
  })

  it('links the notes list, so a regulator can reach its own list', () => {
    const crumbs = buildNoteBreadcrumbs(context)

    expect(crumbs.at(-2)?.href).toBe(
      '/en/organisations/org-1/registrations/reg-1/accreditations/acc-1/packaging-recycling-notes'
    )
  })

  it('names the note by its number, unlinked', () => {
    expect(buildNoteBreadcrumbs(context).at(-1)).toStrictEqual({
      text: 'EX123456'
    })
  })

  it('falls back to the note id where it carries no number yet', () => {
    const crumbs = buildNoteBreadcrumbs({
      ...context,
      prn: { id: 'prn-1', prnNumber: null }
    })

    expect(crumbs.at(-1)).toStrictEqual({ text: 'prn-1' })
  })

  it('falls back to the registered name where there is no trading name', () => {
    const crumbs = buildNoteBreadcrumbs({
      ...context,
      organisation: /** @type {Organisation} */ (
        /** @type {unknown} */ ({
          ...organisation,
          companyDetails: { name: 'Acme Recycling Ltd' }
        })
      )
    })

    expect(crumbs[1].text).toBe('Acme Recycling Ltd')
  })
})
