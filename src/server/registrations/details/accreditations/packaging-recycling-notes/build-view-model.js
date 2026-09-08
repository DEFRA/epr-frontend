import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'
import { paths } from '#server/paths.js'
import { buildActionLinkHtml } from '#server/reports/helpers/build-action-link-html.js'

import { organisationName, toCaption } from '../../helpers/caption.js'
import { toPrnGroups } from '../helpers/prn-groups.js'
import { buildPrnStatusTagHtml } from '../helpers/prn-status-tag-html.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { AccreditationResource, Localise } from '../../helpers/types.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ text: string, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{ head: TableRow, rows: TableRow[], heading: string, testId: string }} NotesTable
 * @typedef {{
 *   backUrl: string,
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   heading: string,
 *   isEmpty: boolean,
 *   noneText: string,
 *   pageTitle: string,
 *   tabs: { awaitingAction: string, issued: string, cancelled: string },
 *   awaitingAction: NotesTable[],
 *   issued: NotesTable,
 *   cancelled: NotesTable
 * }} PrnListViewModel
 */

const KEY = 'registrations:details:accreditation:prns'

/**
 * A note awaiting action carries neither a number nor an issue date, so its
 * tables carry neither column. The other two tables carry both.
 * @param {{ localise: Localise, numbered: boolean }} params
 * @returns {TableRow}
 */
const toHead = ({ localise, numbered }) => [
  ...(numbered ? [{ text: localise(`${KEY}:noteNumber`) }] : []),
  { text: localise(`${KEY}:recipient`) },
  { text: localise(numbered ? `${KEY}:dateIssued` : `${KEY}:dateCreated`) },
  { text: localise(`${KEY}:tonnage`) },
  { text: localise(`${KEY}:status`) },
  {
    text: localise(`${KEY}:actions`),
    classes: cssClasses.textAlign.right
  }
]

/**
 * The total row every table with rows ends on: the tonnage of the notes in
 * that table alone, bold, with every other cell empty. A table holding no
 * notes has no total to draw and shows its empty line instead.
 * @param {{ localise: Localise, notes: PackagingRecyclingNote[], width: number }} params
 * @returns {TableRow}
 */
const toTotalRow = ({ localise, notes, width }) => {
  const total = notes.reduce((sum, note) => sum + note.tonnage, 0)
  const tonnageColumn = width - 3

  return Array.from({ length: width }, (_, column) => {
    if (column === 0) {
      return {
        text: localise(`${KEY}:total`),
        classes: cssClasses.fontWeight.bold
      }
    }

    return column === tonnageColumn
      ? { text: formatTonnage(total), classes: cssClasses.fontWeight.bold }
      : { text: '' }
  })
}

/**
 * One table of notes. Every row's action opens the note read-only, whatever
 * its status — a regulator has no other action to take on one. Each link
 * carries the note's number, or its date where it has none, so a column of
 * identical links stays distinguishable.
 * @param {{
 *   heading: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   notes: PackagingRecyclingNote[],
 *   notesPath: string,
 *   numbered: boolean,
 *   testId: string
 * }} params
 * @returns {NotesTable}
 */
const toTable = ({
  heading,
  localise,
  localiseUrl,
  notes,
  notesPath,
  numbered,
  testId
}) => {
  const head = toHead({ localise, numbered })

  const rows = notes.map((note) => {
    const date = formatDateShort(
      numbered ? (note.issuedAt ?? note.createdAt) : note.createdAt
    )

    return [
      ...(numbered ? [{ text: note.prnNumber ?? '' }] : []),
      { text: getIssuedToOrgDisplayName(note.issuedToOrganisation) },
      { text: date },
      { text: formatTonnage(note.tonnage) },
      { html: buildPrnStatusTagHtml(note.status, localise) },
      {
        html: buildActionLinkHtml(
          localise(`${KEY}:view`),
          localiseUrl(`${notesPath}/${note.id}/view`),
          note.prnNumber ?? date
        ),
        classes: cssClasses.textAlign.right
      }
    ]
  })

  return {
    head,
    heading,
    testId,
    rows:
      rows.length === 0
        ? []
        : [...rows, toTotalRow({ localise, notes, width: head.length })]
  }
}

/**
 * The notes an accreditation has issued, under the three tabs the design
 * draws, read-only.
 *
 * An accreditation that has issued nothing a regulator may see renders no tabs
 * at all — a page of three empty tabs says less than one sentence does. A tab
 * that is empty while another is not keeps its place and says so itself.
 * @param {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   packagingRecyclingNotes: PackagingRecyclingNote[],
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {PrnListViewModel}
 */
export const buildViewModel = ({
  organisation,
  registration,
  accreditation,
  packagingRecyclingNotes,
  localise,
  localiseUrl
}) => {
  const groups = toPrnGroups(packagingRecyclingNotes)
  const name = organisationName(organisation)
  const { noteTypePlural } = getNoteTypeDisplayNames(registration)
  const accreditationPath = `/organisations/${organisation.id}/registrations/${registration.id}/accreditations/${accreditation.id}`
  const notesPath = `${accreditationPath}/packaging-recycling-notes`
  const heading = localise(`${KEY}:listHeading`, { noteTypePlural })

  const table = (
    /** @type {{ notes: PackagingRecyclingNote[], key: string, numbered: boolean, testId: string }} */ {
      notes,
      key,
      numbered,
      testId
    }
  ) =>
    toTable({
      heading: localise(key, { noteTypePlural }),
      localise,
      localiseUrl,
      notes,
      notesPath,
      numbered,
      testId
    })

  return {
    awaitingAction: [
      table({
        notes: groups.awaitingAuthorisation,
        key: `${KEY}:awaitingAuthorisationHeading`,
        numbered: false,
        testId: 'prns-awaiting-authorisation-table'
      }),
      table({
        notes: groups.awaitingCancellation,
        key: `${KEY}:awaitingCancellationHeading`,
        numbered: false,
        testId: 'prns-awaiting-cancellation-table'
      })
    ],
    backUrl: localiseUrl(accreditationPath),
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
      {
        text: localise('registrations:details:accreditation:breadcrumb'),
        href: localiseUrl(accreditationPath)
      },
      { text: heading }
    ],
    cancelled: table({
      notes: groups.cancelled,
      key: `${KEY}:cancelledHeading`,
      numbered: true,
      testId: 'prns-cancelled-table'
    }),
    caption: toCaption([
      name,
      registration.registrationNumber,
      accreditation.accreditationNumber
    ]),
    heading,
    isEmpty: groups.isEmpty,
    issued: table({
      notes: groups.issued,
      key: `${KEY}:issuedHeading`,
      numbered: true,
      testId: 'prns-issued-table'
    }),
    noneText: localise(`${KEY}:none`),
    pageTitle: accreditation.accreditationNumber
      ? `${accreditation.accreditationNumber}: ${heading}`
      : heading,
    tabs: {
      awaitingAction: localise(`${KEY}:tabs:awaitingAction`),
      cancelled: localise(`${KEY}:tabs:cancelled`),
      issued: localise(`${KEY}:tabs:issued`)
    }
  }
}
