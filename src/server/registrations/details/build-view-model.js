import { capitalize } from 'lodash-es'

import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'

import { toDateRange } from './helpers/date-range.js'
import { registrationYears } from './helpers/registered-only.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 * @import { AccreditationResource, Localise } from './helpers/types.js'
 * @import { RegistrationResource, SiteAddress } from '#server/common/helpers/organisations/registration-resource.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ key: string, value: string } | { key: string, status: StatusTag }} SummaryRow
 * @typedef {{
 *   number: string,
 *   dateRange: string,
 *   status: StatusTag,
 *   href: string
 * }} AccreditedPeriod
 * @typedef {{
 *   year: string,
 *   href: string
 * }} RegisteredOnlyPeriod
 * @typedef {{
 *   accreditedPeriods: AccreditedPeriod[],
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   pageTitle: string,
 *   registeredOnlyPeriods: RegisteredOnlyPeriod[],
 *   summaryRows: SummaryRow[]
 * }} RegistrationDetailsViewModel
 */

/**
 * The reprocessing type is recorded when a registration is approved, so an
 * application that holds none reads as the processing type alone.
 * @param {RegistrationResource} registration
 * @returns {string}
 */
const toProcessingType = ({ reprocessingType, application }) =>
  reprocessingType
    ? `${capitalize(application.wasteProcessingType)} (${reprocessingType})`
    : capitalize(application.wasteProcessingType)

/**
 * A registration that has resolved to no material of its own has only what the
 * applicant applied for to show, which is the coarse answer they gave.
 * @param {RegistrationResource} registration
 * @returns {string}
 */
const toMaterial = ({ material, application }) =>
  getMaterialDisplayName(material ?? application.material)

/**
 * @param {SiteAddress} address
 * @returns {string}
 */
const toSiteLine = ({ line1, line2, town, county, postcode, fullAddress }) =>
  fullAddress?.trim() ||
  [line1, line2, town, county, postcode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')

/**
 * An exporter reprocesses nowhere this service records, so a registration with
 * no site shows no site row rather than an empty one.
 * @param {RegistrationResource} registration
 * @param {Localise} localise
 * @returns {SummaryRow[]}
 */
const toSummaryRows = (registration, localise) => {
  const { application } = registration

  /** @type {SummaryRow[]} */
  const rows = [
    {
      key: localise('registrations:details:summary:status'),
      status: toStatusTag(registration.status)
    },
    {
      key: localise('registrations:details:summary:processingType'),
      value: toProcessingType(registration)
    },
    {
      key: localise('registrations:details:summary:material'),
      value: toMaterial(registration)
    }
  ]

  if (application.site) {
    rows.push({
      key: localise('registrations:details:summary:site'),
      value: toSiteLine(application.site.address)
    })
  }

  return rows
}

/**
 * An accreditation earns a number when it is granted, so one holding no number
 * never became an accreditation and names no period.
 * @param {{
 *   accreditations: AccreditationResource[],
 *   registrationPath: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {AccreditedPeriod[]}
 */
const toAccreditedPeriods = ({
  accreditations,
  registrationPath,
  localise,
  localiseUrl
}) =>
  [...accreditations].sort(byMostRecentStart).flatMap((accreditation) =>
    accreditation.accreditationNumber
      ? [
          {
            number: accreditation.accreditationNumber,
            dateRange: toDateRange(accreditation.dateRange, localise),
            status: toStatusTag(accreditation.status),
            href: localiseUrl(
              `${registrationPath}/accreditations/${accreditation.id}`
            )
          }
        ]
      : []
  )

/**
 * @param {AccreditationResource} a
 * @param {AccreditationResource} b
 * @returns {number}
 */
const byMostRecentStart = (a, b) =>
  (b.dateRange.validFrom ?? '').localeCompare(a.dateRange.validFrom ?? '')

/**
 * One row per year the registration has existed over, whether or not it held an
 * accreditation for all of it. A year fully covered by an accreditation still
 * gets a row: the page it opens is what says so, rather than the row's absence
 * leaving a regulator to infer it.
 *
 * `registrationYears` answers most recent first, so nothing is sorted here.
 * @param {{
 *   registration: RegistrationResource,
 *   registrationPath: string,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegisteredOnlyPeriod[]}
 */
const toRegisteredOnlyPeriods = ({
  registration,
  registrationPath,
  localiseUrl
}) =>
  registrationYears({ dateRange: registration.dateRange }).map((year) => ({
    year: String(year),
    href: localiseUrl(`${registrationPath}/registered-only-periods/${year}`)
  }))

/**
 * An organisation trading under another name is known by it, so that is the
 * name the regulator is shown.
 * @param {Organisation} organisation
 * @returns {string}
 */
const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * @param {{
 *   organisation: Organisation,
 *   registration: RegistrationResource,
 *   accreditations: AccreditationResource[],
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegistrationDetailsViewModel}
 */
export const buildViewModel = ({
  organisation,
  registration,
  accreditations,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const registrationPath = `/organisations/${registration.organisation.id}/registrations/${registration.id}`
  const heading = localise('registrations:details:heading')

  return {
    accreditedPeriods: toAccreditedPeriods({
      accreditations,
      registrationPath,
      localise,
      localiseUrl
    }),
    breadcrumbs: [
      {
        text: localise('registrations:details:allOrganisations'),
        href: localiseUrl(paths.regulators.home)
      },
      {
        text: name,
        href: localiseUrl(`/organisations/${registration.organisation.id}`)
      },
      { text: heading }
    ],
    caption: registration.registrationNumber
      ? `${name} - ${registration.registrationNumber}`
      : name,
    pageTitle: registration.registrationNumber
      ? `${registration.registrationNumber}: ${heading}`
      : heading,
    registeredOnlyPeriods: toRegisteredOnlyPeriods({
      registration,
      registrationPath,
      localiseUrl
    }),
    summaryRows: toSummaryRows(registration, localise)
  }
}
