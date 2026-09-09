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
 * @import { PrnGroups } from '../helpers/prn-groups.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ text: string, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{ head: TableRow, rows: TableRow[], heading: string, testId: string }} NotesTable
 * @typedef {{
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   noteTypePlural: string,
 *   notesPath: string
 * }} TableContext
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
 * A note awaiting action has neither a number nor an issue date.
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

/** The recipient and the date, drawn ahead of the tonnage in every table. */
const COLUMNS_BEFORE_TONNAGE = 2

/**
 * @param {boolean} numbered
 * @returns {number}
 */
const tonnageColumnOf = (numbered) =>
  numbered ? COLUMNS_BEFORE_TONNAGE + 1 : COLUMNS_BEFORE_TONNAGE

/**
 * The bold total row a table with rows ends on, summing that table alone.
 * @param {{
 *   localise: Localise,
 *   notes: PackagingRecyclingNote[],
 *   numbered: boolean,
 *   width: number
 * }} params
 * @returns {TableRow}
 */
const toTotalRow = ({ localise, notes, numbered, width }) => {
  const total = notes.reduce((sum, note) => sum + note.tonnage, 0)
  const bold = cssClasses.fontWeight.bold
  const tonnageColumn = tonnageColumnOf(numbered)

  return Array.from({ length: width }, (_, column) => {
    if (column === 0) {
      return { text: localise(`${KEY}:total`), classes: bold }
    }

    return column === tonnageColumn
      ? { text: formatTonnage(total), classes: bold }
      : { text: '' }
  })
}

/**
 * One table of notes. Every row opens its note read-only, named by its number
 * or, where it has none, its date.
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
        : [
            ...rows,
            toTotalRow({ localise, notes, numbered, width: head.length })
          ]
  }
}

/**
 * One of the four tables, by heading copy key and testid.
 * @param {{
 *   context: TableContext,
 *   key: string,
 *   notes: PackagingRecyclingNote[],
 *   numbered: boolean,
 *   testId: string
 * }} params
 * @returns {NotesTable}
 */
const toNamedTable = ({ context, key, notes, numbered, testId }) =>
  toTable({
    heading: context.localise(key, {
      noteTypePlural: context.noteTypePlural
    }),
    localise: context.localise,
    localiseUrl: context.localiseUrl,
    notes,
    notesPath: context.notesPath,
    numbered,
    testId
  })

/**
 * The awaiting-action tab holds two tables: authorisation, then cancellation.
 * @param {{ context: TableContext, groups: PrnGroups }} params
 * @returns {NotesTable[]}
 */
const toAwaitingAction = ({ context, groups }) => [
  toNamedTable({
    context,
    notes: groups.awaitingAuthorisation,
    key: `${KEY}:awaitingAuthorisationHeading`,
    numbered: false,
    testId: 'prns-awaiting-authorisation-table'
  }),
  toNamedTable({
    context,
    notes: groups.awaitingCancellation,
    key: `${KEY}:awaitingCancellationHeading`,
    numbered: false,
    testId: 'prns-awaiting-cancellation-table'
  })
]

/**
 * @param {Localise} localise
 * @returns {{ awaitingAction: string, issued: string, cancelled: string }}
 */
const toTabs = (localise) => ({
  awaitingAction: localise(`${KEY}:tabs:awaitingAction`),
  cancelled: localise(`${KEY}:tabs:cancelled`),
  issued: localise(`${KEY}:tabs:issued`)
})

/**
 * Continues the accreditation page's trail, ending on this page unlinked.
 * @param {{
 *   accreditationPath: string,
 *   heading: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   name: string,
 *   organisation: Organisation,
 *   registration: Registration
 * }} params
 * @returns {Crumb[]}
 */
const toBreadcrumbs = ({
  accreditationPath,
  heading,
  localise,
  localiseUrl,
  name,
  organisation,
  registration
}) => [
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
]

/**
 * An accreditation's notes under three read-only tabs. `isEmpty` drops the
 * tabs entirely; a single empty tab keeps its place and says so.
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

  /** @type {TableContext} */
  const context = { localise, localiseUrl, noteTypePlural, notesPath }

  return {
    awaitingAction: toAwaitingAction({ context, groups }),
    backUrl: localiseUrl(accreditationPath),
    breadcrumbs: toBreadcrumbs({
      accreditationPath,
      heading,
      localise,
      localiseUrl,
      name,
      organisation,
      registration
    }),
    cancelled: toNamedTable({
      context,
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
    issued: toNamedTable({
      context,
      notes: groups.issued,
      key: `${KEY}:issuedHeading`,
      numbered: true,
      testId: 'prns-issued-table'
    }),
    noneText: localise(`${KEY}:none`),
    pageTitle: accreditation.accreditationNumber
      ? `${accreditation.accreditationNumber}: ${heading}`
      : heading,
    tabs: toTabs(localise)
  }
}
