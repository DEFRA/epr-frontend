import { getRegistrationMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { paths } from '#server/paths.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { Localise } from '../helpers/types.js'
 * @import { OverseasSitesById } from './helpers/fetch-overseas-sites.js'
 */

/**
 * @typedef {{ text: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{ head: TableRow, rows: TableRow[] }} SitesTable
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   heading: string,
 *   pageTitle: string,
 *   sites: SitesTable
 * }} OverseasSitesViewModel
 */

/**
 * A site the stored record could not be found for carries nulls rather than
 * being left out, so every column has a value to fall back to.
 */
const NO_VALUE = '-'

/**
 * The column headings, in the order the admin service already lists them. Its
 * eleventh column is the approval date, which belongs to an accreditation
 * rather than to a registration's site list and so has no place here.
 */
const COLUMNS = Object.freeze([
  'orsId',
  'material',
  'country',
  'name',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'stateOrRegion',
  'postcode',
  'coordinates'
])

/**
 * An organisation trading under another name is known by it, so that is the
 * name the regulator is shown. Matches the two pages above.
 * @param {Organisation} organisation
 * @returns {string}
 */
const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * The records the page sits under, in the order the breadcrumbs walk them. A
 * record holding no number has nothing to name it by, so it is left out rather
 * than shown as an empty gap between two dashes.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
const toCaption = (parts) => parts.filter(Boolean).join(' - ')

/**
 * @param {string | null | undefined} value
 * @returns {TableCell}
 */
const toCell = (value) => ({ text: value?.trim() || NO_VALUE })

/**
 * One row per site the registration names, in ORS id order so a page reread
 * later lists them the same way. The packaging waste category is the
 * registration's own material rather than anything the site carries: a
 * registration covers one material, and every site under it reprocesses that.
 *
 * Glass is named by the process it is recycled through, as every other page
 * reading a stored registration names it, so a glass exporter is not told
 * "Glass remelt" on the registration and "Glass" on the page beneath it.
 * @param {{
 *   registration: Registration,
 *   sites: OverseasSitesById
 * }} params
 * @returns {TableRow[]}
 */
const toSiteRows = ({ registration, sites }) => {
  const material = getRegistrationMaterialDisplayName(registration)

  return Object.entries(sites)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([orsId, { name, country, address, coordinates }]) => [
      toCell(orsId),
      toCell(material),
      toCell(country),
      toCell(name),
      toCell(address?.line1),
      toCell(address?.line2),
      toCell(address?.townOrCity),
      toCell(address?.stateOrRegion),
      toCell(address?.postcode),
      toCell(coordinates)
    ])
}

/**
 * @param {Localise} localise
 * @returns {TableRow}
 */
const toSitesHead = (localise) =>
  COLUMNS.map((column) => ({
    text: localise(`registrations:details:overseasSites:columns:${column}`)
  }))

/**
 * @param {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   sites: OverseasSitesById,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {OverseasSitesViewModel}
 */
export const buildViewModel = ({
  organisation,
  registration,
  sites,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const pageName = localise('registrations:details:overseasSites:heading')

  return {
    breadcrumbs: [
      {
        text: localise('registrations:details:allOrganisations'),
        href: localiseUrl(paths.regulators.home)
      },
      { text: name, href: localiseUrl(`/organisations/${organisation.id}`) },
      {
        text: localise('registrations:details:heading'),
        href: localiseUrl(
          `/organisations/${organisation.id}/registrations/${registration.id}`
        )
      },
      { text: pageName }
    ],
    caption: toCaption([name, registration.registrationNumber]),
    heading: pageName,
    pageTitle: registration.registrationNumber
      ? `${registration.registrationNumber}: ${pageName}`
      : pageName,
    sites: {
      head: toSitesHead(localise),
      rows: toSiteRows({ registration, sites })
    }
  }
}
