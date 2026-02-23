import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'
import { getIssuingOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issuing-org-display-name.js'
import { buildAccreditationRows } from './helpers/build-accreditation-rows.js'
import {
  buildPrnCoreRows,
  buildPrnIssuerRows,
  buildStatusRow
} from './helpers/build-prn-detail-rows.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { getStatusConfig } from './helpers/get-status-config.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const actionController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    const [{ organisationData, registration, accreditation }, prn] =
      await Promise.all([
        getRequiredRegistrationWithAccreditation({
          organisationId,
          registrationId,
          idToken: session.idToken,
          logger: request.logger,
          accreditationId
        }),
        fetchPackagingRecyclingNote(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          session.idToken
        )
      ])

    const recipientDisplayName = getIssuedToOrgDisplayName(
      prn.issuedToOrganisation
    )

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

    return h.view('prns/action', viewData)
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
  const { isExporter, noteType, noteTypeFull } =
    getNoteTypeDisplayNames(registration)
  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
  const displayMaterial = getDisplayMaterial(registration)
  const isNotDraft = prn.status !== 'draft'
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
    pageTitle: `${noteType} ${prn.prnNumber ?? prn.id}`,
    heading: noteTypeFull,
    insetText: localise('prns:action:insetText', { noteType }),
    viewLink: {
      text: localise('prns:action:viewLink', { noteType }),
      href: request.localiseUrl(`${basePath}/${prnId}/view`)
    },
    prnDetailsHeading: localise('prns:details:heading', { noteType }),
    prnDetailRows,
    accreditationDetailsHeading: localise('prns:accreditationDetailsHeading'),
    accreditationRows,
    backUrl: request.localiseUrl(basePath),
    ...buildActionButtons({
      prn,
      localise,
      noteType,
      request,
      basePath,
      prnId
    }),
    returnLink: {
      href: request.localiseUrl(basePath),
      text: localise('prns:action:returnLink', { noteType })
    }
  }

  addErrorSummaryIfNeeded(viewData, request.query.error, localise)

  return viewData
}

/**
 * Builds the action buttons based on PRN status
 */
function buildActionButtons({
  prn,
  localise,
  noteType,
  request,
  basePath,
  prnId
}) {
  const isAwaitingAuthorisation = prn.status === 'awaiting_authorisation'
  const isAwaitingCancellation = prn.status === 'awaiting_cancellation'

  return {
    issueButton: isAwaitingAuthorisation
      ? {
          text: localise('prns:action:issueButton', { noteType }),
          action: request.localiseUrl(`${basePath}/${prnId}/issue`)
        }
      : null,
    deleteButton: isAwaitingAuthorisation
      ? {
          text: localise('prns:action:deleteLink', { noteType }),
          href: request.localiseUrl(`${basePath}/${prnId}/delete`)
        }
      : null,
    cancelButton: isAwaitingCancellation
      ? {
          text: localise('prns:action:cancelButton', { noteType }),
          href: request.localiseUrl(`${basePath}/${prnId}/cancel`)
        }
      : null
  }
}

/**
 * Adds error summary to view data if an error query param is present
 */
function addErrorSummaryIfNeeded(viewData, errorType, localise) {
  const errorMessageKey = {
    issue_failed: 'prns:issueFailedError'
  }[errorType]

  if (errorMessageKey) {
    viewData.errors = {}
    viewData.errorSummary = {
      title: localise('prns:errorSummaryTitle'),
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
      key: { text: localise('prns:details:numberLabel', { noteType }) },
      value: { text: prn.prnNumber || '' }
    }
  ]

  if (isNotDraft) {
    rows.push(buildStatusRow(localise, statusConfig))
  }

  rows.push(
    ...buildPrnCoreRows(prn, localise, recipientDisplayName),
    ...buildPrnIssuerRows(prn, localise, {
      issuerName: organisationData.companyDetails
        ? getIssuingOrgDisplayName(organisationData.companyDetails)
        : ''
    })
  )

  return rows
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 * @import { PackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
 */
