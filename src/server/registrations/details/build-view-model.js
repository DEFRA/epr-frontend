import { capitalize } from 'lodash-es'

import { WASTE_PROCESSING_TYPE } from '#domain/organisations/model.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath as toRegistrationPath
} from '#server/reports/helpers/report-paths.js'

import { organisationViewName, toCaption } from './helpers/caption.js'
import { toDateRange } from './helpers/date-range.js'
import {
  accreditedDateRange,
  registeredYears
} from './helpers/timeline-dates.js'

/**
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { SiteAddress } from '#server/common/helpers/organisations/registration-resource.js'
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { Localise } from './helpers/types.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ href: string, text: string }} SummaryLink
 * @typedef {{ key: string, value: string } | { key: string, status: StatusTag } | { key: string, link: SummaryLink }} SummaryRow
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
 * @param {RegistrationView} registration
 * @returns {string}
 */
const toProcessingType = (registration) =>
  registration.wasteProcessingType === WASTE_PROCESSING_TYPE.EXPORTER
    ? capitalize(registration.wasteProcessingType)
    : `${capitalize(registration.wasteProcessingType)} (${registration.reprocessingType})`

/**
 * A reprocessor's site, or the overseas sites an exporter sends to.
 * @param {{
 *   registration: RegistrationView,
 *   registrationPath: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {SummaryRow}
 */
const toSitesRow = ({
  registration,
  registrationPath,
  localise,
  localiseUrl
}) =>
  registration.wasteProcessingType === WASTE_PROCESSING_TYPE.EXPORTER
    ? {
        key: localise('registrations:details:summary:overseasSites'),
        link: {
          href: localiseUrl(`${registrationPath}/overseas-sites`),
          text: localise('registrations:details:summary:overseasSitesView')
        }
      }
    : {
        key: localise('registrations:details:summary:site'),
        value: toSiteLine(registration.site.address)
      }

/**
 * @param {{
 *   registration: RegistrationView,
 *   registrationPath: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {SummaryRow[]}
 */
const toSummaryRows = (params) => {
  const { registration, localise } = params

  return [
    {
      key: localise('registrations:details:summary:status'),
      status: toStatusTag(registration.status.current)
    },
    {
      key: localise('registrations:details:summary:processingType'),
      value: toProcessingType(registration)
    },
    {
      key: localise('registrations:details:summary:material'),
      value: getMaterialDisplayName(registration.material)
    },
    toSitesRow(params)
  ]
}

/**
 * One row per accreditation year, newest first.
 * @param {{
 *   keys: RegistrationKeys,
 *   registration: RegistrationView,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {AccreditedPeriod[]}
 */
const toAccreditedPeriods = ({ keys, registration, localise, localiseUrl }) =>
  Object.entries(registration.accreditations)
    .sort(([year], [other]) => other.localeCompare(year))
    .map(([year, accreditation]) => ({
      number: accreditation.accreditationNumber,
      dateRange: toDateRange(
        accreditedDateRange(accreditation, year),
        localise
      ),
      status: toStatusTag(accreditation.status.current),
      href: localiseUrl(accreditationPath({ ...keys, year }))
    }))

/**
 * One row per year the registration was approved in, most recent first.
 * @param {{
 *   registration: RegistrationView,
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
  registeredYears(registration).map((year) => ({
    year: String(year),
    href: localiseUrl(`${registrationPath}/registered-only-periods/${year}`)
  }))

/**
 * @param {{
 *   keys: RegistrationKeys,
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegistrationDetailsViewModel}
 */
export const buildViewModel = ({
  keys,
  organisation,
  registration,
  localise,
  localiseUrl
}) => {
  const name = organisationViewName(organisation)
  const path = toRegistrationPath(keys)
  const heading = localise('registrations:details:heading')

  return {
    accreditedPeriods: toAccreditedPeriods({
      keys,
      registration,
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
        href: localiseUrl(organisationPath(keys))
      },
      { text: heading }
    ],
    caption: toCaption([name, keys.registrationNumber]),
    pageTitle: `${keys.registrationNumber}: ${heading}`,
    registeredOnlyPeriods: toRegisteredOnlyPeriods({
      registration,
      registrationPath: path,
      localiseUrl
    }),
    summaryRows: toSummaryRows({
      registration,
      registrationPath: path,
      localise,
      localiseUrl
    })
  }
}
