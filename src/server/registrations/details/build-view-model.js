import { capitalize } from 'lodash-es'

import { getDetailedMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource, RegistrationResource, SiteAddress } from './helpers/types.js'
 */

/**
 * @typedef {{ text: string, classes: string }} StatusTag
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
 *   accreditedPeriods: AccreditedPeriod[],
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   pageTitle: string,
 *   summaryRows: SummaryRow[]
 * }} RegistrationDetailsViewModel
 */

/**
 * The backend can add a status without this repo hearing about it, and
 * `getStatusClass` answers grey for one it does not know, so an unfamiliar
 * status still names itself to the reader.
 * @param {string} status
 * @returns {StatusTag}
 */
const toStatusTag = (status) => ({
  text: capitalize(status),
  classes: `govuk-tag--${getStatusClass(status)}`
})

/**
 * @param {{ validFrom: string | null, validTo: string | null }} dateRange
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const toDateRange = ({ validFrom, validTo }, localise) => {
  if (!validFrom) {
    return ''
  }

  const from = formatDate(validFrom)
  const to = validTo
    ? formatDate(validTo)
    : localise('registrations:details:current')

  return `${from} - ${to}`
}

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
 * @param {(key: string) => string} localise
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
      value: getDetailedMaterialDisplayName(application.material)
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
 *   localise: (key: string) => string,
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
 *   localise: (key: string) => string,
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
  const registrationPath = `/organisations/${registration.organisationId}/registrations/${registration.id}`
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
        href: localiseUrl(`/organisations/${registration.organisationId}`)
      },
      { text: heading }
    ],
    caption: registration.registrationNumber
      ? `${name} - ${registration.registrationNumber}`
      : name,
    pageTitle: registration.registrationNumber
      ? `${registration.registrationNumber}: ${heading}`
      : heading,
    summaryRows: toSummaryRows(registration, localise)
  }
}
