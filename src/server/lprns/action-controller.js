import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { getLumpyDisplayMaterial } from './helpers/get-lumpy-display-material.js'
import { buildAccreditationRows } from './helpers/build-accreditation-rows.js'
import { getStatusConfig } from './helpers/get-status-config.js'
import {
  buildStatusRow,
  buildPrnCoreRows,
  buildPrnAuthorisationRows
} from './helpers/build-prn-detail-rows.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'

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
      localise
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
  localise
}) {
  const isExporter = registration.wasteProcessingType === 'exporter'
  const noteType = isExporter ? 'perns' : 'prns'
  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
  const displayMaterial = getLumpyDisplayMaterial(registration)
  const isNotDraft = prn.status !== 'draft'
  const isAwaitingAuthorisation = prn.status === 'awaiting_authorisation'
  const statusConfig = getStatusConfig(prn.status, localise)

  const prnDetailRows = buildActionPrnDetailRows({
    prn,
    organisationData,
    localise,
    isExporter,
    statusConfig,
    isNotDraft
  })

  const accreditationRows = buildAccreditationRows({
    registration,
    accreditation,
    displayMaterial,
    localise,
    isExporter
  })

  const viewData = {
    pageTitle: `${isExporter ? 'PERN' : 'PRN'} ${prn.id}`,
    heading: isExporter ? 'PERN' : 'PRN',
    insetText: localise(`lprns:action:${noteType}:insetText`),
    viewLink: {
      text: localise(`lprns:action:${noteType}:viewLink`),
      href: request.localiseUrl(`${basePath}/${prnId}/view`)
    },
    prnDetailsHeading: localise(
      isExporter ? 'lprns:pernDetailsHeading' : 'lprns:prnDetailsHeading'
    ),
    prnDetailRows,
    accreditationDetailsHeading: localise('lprns:accreditationDetailsHeading'),
    accreditationRows,
    backUrl: request.localiseUrl(basePath),
    issueButton: isAwaitingAuthorisation
      ? {
          text: localise(`lprns:action:${noteType}:issueButton`),
          action: request.localiseUrl(`${basePath}/${prnId}/issue`)
        }
      : null,
    deleteLink: isAwaitingAuthorisation
      ? {
          text: localise(`lprns:action:${noteType}:deleteLink`),
          href: request.localiseUrl(`${basePath}/${prnId}/delete`)
        }
      : null,
    returnLink: {
      href: request.localiseUrl(basePath),
      text: localise(`lprns:action:${noteType}:returnLink`)
    }
  }

  if (request.query.error === 'insufficient_balance') {
    viewData.errors = {}
    viewData.errorSummary = {
      title: localise('lprns:errorSummaryTitle'),
      list: [{ text: localise('lprns:insufficientBalanceError') }]
    }
  }

  return viewData
}

/**
 * Builds the PRN/PERN details rows for the action page
 */
function buildActionPrnDetailRows({
  prn,
  organisationData,
  localise,
  isExporter,
  statusConfig,
  isNotDraft
}) {
  const numberLabel = isExporter
    ? 'lprns:pernNumberLabel'
    : 'lprns:prnNumberLabel'
  const rows = [{ key: { text: localise(numberLabel) }, value: { text: '' } }]

  if (isNotDraft) {
    rows.push(buildStatusRow(localise, statusConfig))
  }

  rows.push(
    ...buildPrnCoreRows(prn, localise),
    ...buildPrnAuthorisationRows(prn, organisationData, localise, {
      includeIssuerRow: true
    })
  )

  return rows
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
