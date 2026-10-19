import { describe, expect, it } from 'vitest'

import { buildOrganisationView } from '#server/common/test-helpers/organisation-view-fixtures.js'

import { buildNoteBreadcrumbs } from './build-note-breadcrumbs.js'

/**
 * @import { TFunction } from 'i18next'
 */

const localise = /** @type {TFunction} */ (
  /** @type {unknown} */ ((key) => key)
)

/** @param {string} path */
const localiseUrl = (path) => `/en${path}`

const organisation = buildOrganisationView({
  name: 'Acme Recycling Ltd',
  displayName: 'Acme'
})

const context = {
  organisation,
  keys: {
    organisationNumber: '500123',
    registrationNumber: 'R26EN0000000001PL',
    year: '2026'
  },
  noteTypePlural: 'PRNs',
  prn: { id: 'prn-1', prnNumber: 'EX123456' },
  localise,
  localiseUrl
}

const registration = '/en/organisations/500123/registrations/R26EN0000000001PL'

describe(buildNoteBreadcrumbs, () => {
  it('walks from all organisations down to the note by natural keys', () => {
    expect(buildNoteBreadcrumbs(context)).toStrictEqual([
      {
        text: 'registrations:details:allOrganisations',
        href: '/en/regulators/home'
      },
      { text: 'Acme', href: '/en/organisations/500123' },
      {
        text: 'registrations:details:heading',
        href: registration
      },
      {
        text: 'registrations:details:accreditation:breadcrumb',
        href: `${registration}/accreditations/2026`
      },
      {
        text: 'registrations:details:accreditation:prns:listHeading',
        href: `${registration}/accreditations/2026/packaging-recycling-notes`
      },
      { text: 'EX123456' }
    ])
  })

  it('falls back to the note id where it carries no number yet', () => {
    const crumbs = buildNoteBreadcrumbs({
      ...context,
      prn: { id: 'prn-1', prnNumber: null }
    })

    expect(crumbs.at(-1)).toStrictEqual({ text: 'prn-1' })
  })
})
