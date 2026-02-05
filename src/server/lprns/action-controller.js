import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/get-note-type.js'
import { getOrganisationDisplayName } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import { buildAccreditationRows } from './helpers/build-accreditation-rows.js'
import {
  buildPrnAuthorisationRows,
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

    const [
      { organisationData, registration, accreditation },
      prn,
      { organisations }
    ] = await Promise.all([
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
      ),
      request.wasteOrganisationsService.getOrganisations()
    ])

    if (!registration) {
      throw Boom.notFound('Registration not found')
    }

    const recipientDisplayName = getOrganisationDisplayName(
      organisations,
      prn.issuedToOrganisation
    )

    const viewData = buildActionViewData({
      request,
      organisationId,
      registrationId,
      accreditationId,
      prnId,
      organisationData,
      registration,
      accreditation,
      prn,
      localise,
      recipientDisplayName
    })

    return h.view('lprns/action', viewData)
  }
}

/**
 * Builds the complete view data for the action page
 */
function buildActionViewData({
  request,
  organisationId,
  registrationId,
  accreditationId,
  prnId,
  organisationData,
  registration,
  accreditation,
  prn,
  localise,
  recipientDisplayName
}) {
  const isExporter = registration.wasteProcessingType === 'exporter'
  const { noteType } = getNoteTypeDisplayNames(registration)
  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
  const displayMaterial = getLumpyDisplayMaterial(registration)
  const isNotDraft = prn.status !== 'draft'
  const isAwaitingAuthorisation = prn.status === 'awaiting_authorisation'
  const statusConfig = getStatusConfig(prn.status, localise)

  const prnDetailRows = buildActionPrnDetailRows({
    prn,
    organisationData,
    localise,
    noteType,
    statusConfig,
    isNotDraft,
    recipientDisplayName
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
    deleteLink: isAwaitingAuthorisation
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
  organisationData,
  localise,
  noteType,
  statusConfig,
  isNotDraft,
  recipientDisplayName
}) {
  const rows = [
    {
      key: { text: localise('lprns:details:numberLabel', { noteType }) },
      value: { text: '' }
    }
  ]

  if (isNotDraft) {
    rows.push(buildStatusRow(localise, statusConfig))
  }

  rows.push(
    ...buildPrnCoreRows(prn, localise, recipientDisplayName),
    ...buildPrnAuthorisationRows(prn, organisationData, localise, {
      includeIssuerRow: true
    })
  )

  return rows
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
