import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getDisplayName } from '#server/common/helpers/waste-organisations/get-display-name.js'
import { buildAccreditationRows } from './helpers/build-accreditation-rows.js'
import {
  buildPrnIssuerRows,
  buildPrnCoreRows,
  buildStatusRow
} from './helpers/build-prn-detail-rows.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { getLumpyDisplayMaterial } from './helpers/get-lumpy-display-material.js'
import { getStatusConfig } from './helpers/get-status-config.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const actionController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    const [{ organisationData, registration, accreditation }, prn] =
      await Promise.all([
        fetchRegistrationAndAccreditation(
          organisationId,
          registrationId,
          session.idToken
        ),
        fetchPackagingRecyclingNote(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          session.idToken
        )
      ])

    if (!registration) {
      throw Boom.notFound('Registration not found')
    }

    const recipientDisplayName = getDisplayName(prn.issuedToOrganisation)

    const viewData = buildActionViewData({
      accreditation,
      accreditationId,
      localise,
      organisationData,
      organisationId,
      prn,
      prnId,
      recipientDisplayName,
      registration,
      registrationId,
      request
    })

    return h.view('lprns/action', viewData)
  }
}

/**
 * Builds the complete view data for the action page
 * @param {{
 *   accreditation: RegistrationWithAccreditation['accreditation'],
 *   accreditationId: string,
 *   localise: (key: string, params?: object) => string,
 *   organisationData: RegistrationWithAccreditation['organisationData'],
 *   organisationId: string,
 *   prn: PackagingRecyclingNote,
 *   prnId: string,
 *   recipientDisplayName: string,
 *   registration: RegistrationWithAccreditation['registration'],
 *   registrationId: string,
 *   request: Request
 * }} params
 */
function buildActionViewData({
  accreditation,
  accreditationId,
  localise,
  organisationData,
  organisationId,
  prn,
  prnId,
  recipientDisplayName,
  registration,
  registrationId,
  request
}) {
  const { isExporter, noteType } = getNoteTypeDisplayNames(registration)
  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
  const displayMaterial = getLumpyDisplayMaterial(registration)
  const isNotDraft = prn.status !== 'draft'
  const isAwaitingAuthorisation = prn.status === 'awaiting_authorisation'
  const statusConfig = getStatusConfig(prn.status, localise)

  const prnDetailRows = buildActionPrnDetailRows({
    prn,
    localise,
    noteType,
    statusConfig,
    isNotDraft,
    recipientDisplayName,
    organisationData
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise,
    isExporter
  })

  const viewData = {
    pageTitle: `${noteType} ${prn.id}`,
    heading: noteType,
    insetText: localise('lprns:action:insetText', { noteType }),
    viewLink: {
      text: localise('lprns:action:viewLink', { noteType }),
      href: request.localiseUrl(`${basePath}/${prnId}/view`)
    },
    prnDetailsHeading: localise('lprns:details:heading', { noteType }),
    prnDetailRows,
    accreditationDetailsHeading: localise('lprns:accreditationDetailsHeading'),
    accreditationRows,
    backUrl: request.localiseUrl(basePath),
    issueButton: isAwaitingAuthorisation
      ? {
          text: localise('lprns:action:issueButton', { noteType }),
          action: request.localiseUrl(`${basePath}/${prnId}/issue`)
        }
      : null,
    deleteButton: isAwaitingAuthorisation
      ? {
          text: localise('lprns:action:deleteLink', { noteType }),
          href: request.localiseUrl(`${basePath}/${prnId}/delete`)
        }
      : null,
    returnLink: {
      href: request.localiseUrl(basePath),
      text: localise('lprns:action:returnLink', { noteType })
    }
  }

  addErrorSummaryIfNeeded(viewData, request.query.error, localise)

  return viewData
}

/**
 * Adds error summary to view data if an error query param is present
 */
function addErrorSummaryIfNeeded(viewData, errorType, localise) {
  const errorMessageKey = {
    insufficient_balance: 'lprns:insufficientBalanceError',
    issue_failed: 'lprns:issueFailedError'
  }[errorType]

  if (errorMessageKey) {
    viewData.errors = {}
    viewData.errorSummary = {
      title: localise('lprns:errorSummaryTitle'),
      list: [{ text: localise(errorMessageKey) }]
    }
  }
}

/**
 * Builds the PRN/PERN details rows for the action page
 */
function buildActionPrnDetailRows({
  prn,
  localise,
  noteType,
  statusConfig,
  isNotDraft,
  recipientDisplayName,
  organisationData
}) {
  const rows = [
    {
      key: { text: localise('lprns:details:numberLabel', { noteType }) },
      value: { text: prn.prnNumber || '' }
    }
  ]

  if (isNotDraft) {
    rows.push(buildStatusRow(localise, statusConfig))
  }

  rows.push(
    ...buildPrnCoreRows(prn, localise, recipientDisplayName),
    ...buildPrnIssuerRows(prn, localise, {
      issuerName: organisationData.companyDetails?.name || ''
    })
  )

  return rows
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 * @import { PackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
 */
