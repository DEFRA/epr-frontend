import { describe, expect, it } from 'vitest'

import { CADENCE } from '../constants.js'
import { buildReportBreadcrumbs } from './build-report-breadcrumbs.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 */

const localise = /** @type {TFunction} */ (
  /** @type {unknown} */ (
    (key, options) => (options?.year ? `${key}:${options.year}` : key)
  )
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
  /** @type {unknown} */ ({ id: 'reg-1', accreditationId: 'acc-1' })
)

const context = {
  organisation,
  registration,
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

  it('names the organisation by its trading name', () => {
    const [, organisationCrumb] = buildReportBreadcrumbs(context)

    expect(organisationCrumb).toStrictEqual({
      text: 'Acme',
      href: '/en/organisations/org-1'
    })
  })

  it('falls back to the registered name where there is no trading name', () => {
    const [, organisationCrumb] = buildReportBreadcrumbs({
      ...context,
      organisation: /** @type {Organisation} */ (
        /** @type {unknown} */ ({
          ...organisation,
          companyDetails: { name: 'Acme Recycling Ltd' }
        })
      )
    })

    expect(organisationCrumb.text).toBe('Acme Recycling Ltd')
  })

  it('links the registration above the page', () => {
    const [, , registrationCrumb] = buildReportBreadcrumbs(context)

    expect(registrationCrumb).toStrictEqual({
      text: 'registrations:details:heading',
      href: '/en/organisations/org-1/registrations/reg-1'
    })
  })

  it('ends on the page, unlinked', () => {
    const crumbs = buildReportBreadcrumbs(context)

    expect(crumbs.at(-1)).toStrictEqual({ text: 'Reports' })
  })

  it('hangs a monthly report off the accreditation that listed it', () => {
    const crumbs = buildReportBreadcrumbs({
      ...context,
      cadence: CADENCE.MONTHLY,
      year: 2026,
      pageName: 'Report for January 2026'
    })

    expect(crumbs.at(-2)).toStrictEqual({
      text: 'registrations:details:accreditation:breadcrumb',
      href: '/en/organisations/org-1/registrations/reg-1/accreditations/acc-1'
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
      href: '/en/organisations/org-1/registrations/reg-1/registered-only-periods/2026'
    })
  })

  it('stops at the registration for a monthly report with no accreditation', () => {
    const crumbs = buildReportBreadcrumbs({
      ...context,
      registration: /** @type {Registration} */ (
        /** @type {unknown} */ ({ id: 'reg-1' })
      ),
      cadence: CADENCE.MONTHLY,
      year: 2026,
      pageName: 'Report for January 2026'
    })

    expect(crumbs).toHaveLength(4)
    expect(crumbs.at(-2)?.href).toBe(
      '/en/organisations/org-1/registrations/reg-1'
    )
  })

  it('carries no period crumb on the reports list, which names no period', () => {
    const crumbs = buildReportBreadcrumbs(context)

    expect(crumbs).toHaveLength(4)
  })
})
