import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { paths } from '#server/paths.js'
import {
  organisationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'

/**
 * @import { Localise } from '../helpers/types.js'
 * @import { OrganisationView, RegistrationView } from './helpers/fetch-overseas-sites.js'
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
 * @param {OrganisationView} organisation
 * @returns {string}
 */
const organisationName = ({ name, tradingName }) => tradingName?.trim() || name

/**
 * @param {string | undefined} value
 * @returns {TableCell}
 */
const toCell = (value) => ({ text: value?.trim() || NO_VALUE })

/**
 * One row per site the registration names, in ORS id order so a page reread
 * later lists them the same way. The packaging waste category is the
 * registration's own material rather than anything the site carries: a
 * registration covers one material, and every site under it reprocesses that.
 * @param {RegistrationView} registration
 * @returns {TableRow[]}
 */
const toSiteRows = ({ material, overseasSites = {} }) => {
  const category = getMaterialDisplayName(material)

  return Object.entries(overseasSites)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([orsId, { name, address, coordinates }]) => [
      toCell(orsId),
      toCell(category),
      toCell(address.country),
      toCell(name),
      toCell(address.line1),
      toCell(address.line2),
      toCell(address.townOrCity),
      toCell(address.stateOrRegion),
      toCell(address.postcode),
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
 *   organisation: OrganisationView,
 *   registrationNumber: string,
 *   registration: RegistrationView,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {OverseasSitesViewModel}
 */
export const buildViewModel = ({
  organisation,
  registrationNumber,
  registration,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const pageName = localise('registrations:details:overseasSites:heading')
  const organisationNumber = String(organisation.organisationNumber)

  return {
    breadcrumbs: [
      {
        text: localise('registrations:details:allOrganisations'),
        href: localiseUrl(paths.regulators.home)
      },
      {
        text: name,
        href: localiseUrl(organisationPath({ organisationNumber }))
      },
      {
        text: localise('registrations:details:heading'),
        href: localiseUrl(
          registrationPath({ organisationNumber, registrationNumber })
        )
      },
      { text: pageName }
    ],
    caption: `${name} - ${registrationNumber}`,
    heading: pageName,
    pageTitle: `${registrationNumber}: ${pageName}`,
    sites: {
      head: toSitesHead(localise),
      rows: toSiteRows(registration)
    }
  }
}
