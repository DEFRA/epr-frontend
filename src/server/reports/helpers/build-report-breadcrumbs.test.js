import { describe, expect, it } from 'vitest'

import {
  buildOrganisationView,
  buildRegistrationView
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { CADENCE } from '../constants.js'
import { buildReportBreadcrumbs } from './build-report-breadcrumbs.js'

/**
 * @import { TFunction } from 'i18next'
 */

const localise = /** @type {TFunction} */ (
  /** @type {unknown} */ (
    (key, options) => (options?.year ? `${key}:${options.year}` : key)
  )
)

/** @param {string} path */
const localiseUrl = (path) => `/en${path}`

const organisation = buildOrganisationView({
  name: 'Acme Recycling Ltd',
  displayName: 'Acme'
})

const context = {
  organisation,
  registration: buildRegistrationView(),
  keys: {
    organisationNumber: '500123',
    registrationNumber: 'R26EN0000000001PL'
  },
  pageName: 'Reports',
  localise,
  localiseUrl
}

describe(buildReportBreadcrumbs, () => {
  it('opens the trail at the regulator home', () => {
    const [first] = buildReportBreadcrumbs(context)

    expect(first).toStrictEqual({
      text: 'registrations:details:allOrganisations',
      href: '/en/regulators/home'
    })
  })

  it('names the organisation by its display name', () => {
    const [, organisationCrumb] = buildReportBreadcrumbs(context)

    expect(organisationCrumb).toStrictEqual({
      text: 'Acme',
      href: '/en/organisations/500123'
    })
  })

  it('links the registration above the page', () => {
    const [, , registrationCrumb] = buildReportBreadcrumbs(context)

    expect(registrationCrumb).toStrictEqual({
      text: 'registrations:details:heading',
      href: '/en/organisations/500123/registrations/R26EN0000000001PL'
    })
  })

  it('ends on the page, unlinked', () => {
    const crumbs = buildReportBreadcrumbs(context)

    expect(crumbs.at(-1)).toStrictEqual({ text: 'Reports' })
  })

  it('hangs a monthly report off the accreditation for its year', () => {
    const crumbs = buildReportBreadcrumbs({
      ...context,
      cadence: CADENCE.MONTHLY,
      year: 2026,
      pageName: 'Report for January 2026'
    })

    expect(crumbs.at(-2)).toStrictEqual({
      text: 'registrations:details:accreditation:breadcrumb',
      href: '/en/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026'
    })
  })

  it('hangs a quarterly report off the registered-only year that listed it', () => {
    const crumbs = buildReportBreadcrumbs({
      ...context,
      cadence: CADENCE.QUARTERLY,
      year: 2026,
      pageName: 'Report for Q1 2026'
    })

    expect(crumbs.at(-2)).toStrictEqual({
      text: 'registrations:details:registeredOnlyPeriod:breadcrumb:2026',
      href: '/en/organisations/500123/registrations/R26EN0000000001PL/registered-only-periods/2026'
    })
  })

  it('stops at the registration for a monthly report with no accreditation that year', () => {
    const crumbs = buildReportBreadcrumbs({
      ...context,
      registration: buildRegistrationView({ accreditations: {} }),
      cadence: CADENCE.MONTHLY,
      year: 2026,
      pageName: 'Report for January 2026'
    })

    expect(crumbs).toHaveLength(4)
    expect(crumbs.at(-2)?.href).toBe(
      '/en/organisations/500123/registrations/R26EN0000000001PL'
    )
  })

  it('carries no period crumb on the reports list, which names no period', () => {
    const crumbs = buildReportBreadcrumbs(context)

    expect(crumbs).toHaveLength(4)
  })
})
