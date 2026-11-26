import { toYear } from '#server/common/helpers/year.js'
import { describe, expect, it } from 'vitest'

import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { buildOrganisationView } from '#server/common/test-helpers/organisation-view-fixtures.js'

import { buildNoteBreadcrumbs } from './build-note-breadcrumbs.js'

/**
 * @import { Localise } from '../../common/hapi-types.js'
 */

const localise = /** @type {Localise} */ (/** @type {unknown} */ ((key) => key))

/** @param {string} path */
const localiseUrl = (path) => `/en${path}`

const organisation = buildOrganisationView({
  name: 'Acme Recycling Ltd',
  displayName: 'Acme'
})

const context = {
  organisation,
  keys: {
    organisationNumber: toOrganisationNumber('500123'),
    registrationNumber: toRegistrationNumber('R26EN0000000001PL'),
    year: toYear(2026)
  },
  noteTypePlural: 'PRNs',
  prn: { id: 'prn-1', prnNumber: 'EX123456' },
  localise,
  localiseUrl
}

const registration = '/en/organisations/500123/registrations/R26EN0000000001PL'

describe(buildNoteBreadcrumbs, () => {
  it('walks from all organisations down to the note by natural keys', () => {
    expect(
      buildNoteBreadcrumbs(context).map((crumb) =>
        'href' in crumb ? crumb.href : undefined
      )
    ).toStrictEqual([
      '/en/regulators/home',
      '/en/organisations/500123',
      registration,
      `${registration}/accreditations/2026`,
      `${registration}/accreditations/2026/packaging-recycling-notes`,
      undefined
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
