import { capitalize } from 'lodash-es'

import { getDetailedMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { hasLedgerReadScope } from '#server/auth/scopes.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { ScopeBearingCredentials } from '#server/auth/scopes.js'
 * @import { AccreditationResource, RegistrationResource, SiteAddress } from './helpers/types.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 * @typedef {{ text: string, classes: string }} StatusTag
 */

/**
 * @typedef {{ href: string, text: string }} RecordLink
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
 *   recordLinks: RecordLink[],
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
 * @param {Localise} localise
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
 * The records this registration keeps, on the terms the operator's own page
 * offers them. The note list needs a live accreditation to hold any notes; the
 * ledger is partitioned by accreditation and falls back to the registration for
 * a period that is registered only; the reports are the registration's whatever
 * it is accredited for.
 * @param {{
 *   registration: RegistrationResource,
 *   registrationPath: string,
 *   accreditationId: string | undefined,
 *   isAccredited: boolean,
 *   credentials: ScopeBearingCredentials,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RecordLink[]}
 */
const toRecordLinks = ({
  registration,
  registrationPath,
  accreditationId,
  isAccredited,
  credentials,
  localise,
  localiseUrl
}) => {
  const { noteTypePlural } = getNoteTypeDisplayNames({
    wasteProcessingType: registration.application.wasteProcessingType
  })
  const accreditationPath = `${registrationPath}/accreditations/${accreditationId}`

  /** @type {RecordLink[]} */
  const links = []

  if (isAccredited) {
    links.push({
      href: localiseUrl(`${accreditationPath}/packaging-recycling-notes`),
      text: localise('registrations:notes.manageReadOnly', { noteTypePlural })
    })
  }

  links.push({
    href: localiseUrl(`${registrationPath}/reports`),
    text: localise('registrations:manageReportsReadOnly')
  })

  if (hasLedgerReadScope(credentials)) {
    links.push({
      href: localiseUrl(
        `${accreditationId ? accreditationPath : registrationPath}/waste-balance-ledger`
      ),
      text: localise('registrations:wasteBalanceLedger')
    })
  }

  return links
}

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
 *   accreditationId: string | undefined,
 *   isAccredited: boolean,
 *   credentials: ScopeBearingCredentials,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegistrationDetailsViewModel}
 */
export const buildViewModel = ({
  organisation,
  registration,
  accreditations,
  accreditationId,
  isAccredited,
  credentials,
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
    recordLinks: toRecordLinks({
      registration,
      registrationPath,
      accreditationId,
      isAccredited,
      credentials,
      localise,
      localiseUrl
    }),
    summaryRows: toSummaryRows(registration, localise)
  }
}
