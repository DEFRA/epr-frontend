import { config } from '#config/config.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import { capitalize } from 'lodash-es'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params

    const session = request.auth.credentials

    const { registration, accreditation } =
      await getRequiredRegistrationWithAccreditation({
        organisationId,
        registrationId,
        idToken: session.idToken,
        logger: request.logger
      })

    const wasteBalance = await getWasteBalance(
      organisationId,
      registration.accreditationId,
      session.idToken,
      request.logger
    )
    const viewModel = buildViewModel({
      request,
      organisationId,
      accreditation,
      registration,
      wasteBalance
    })

    return h.view('registrations/index', viewModel)
  }
}

/**
 * Build view model for accreditation dashboard
 * @param {object} params - Function parameters
 * @param {object} params.request - Hapi request object
 * @param {string} params.organisationId - Organisation ID
 * @param {object | undefined} params.accreditation - Accreditation data
 * @param {object} params.registration - Registration data
 * @param {WasteBalance | null} params.wasteBalance - Waste balance data
 * @returns {object} View model
 */
function buildViewModel({
  request,
  organisationId,
  accreditation,
  registration,
  wasteBalance
}) {
  const { t: localise } = request
  const { isExporter, noteType, noteTypePlural } =
    getNoteTypeDisplayNames(registration)
  const siteName = isExporter
    ? null
    : (registration.site?.address?.line1 ??
      localise('registrations:unknownSite'))
  const material = getDisplayMaterial(registration)

  const registrationStatus = capitalize(registration.status)
  const accreditationStatus = capitalize(accreditation?.status)

  const uploadSummaryLogUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registration.id}/summary-logs/upload`
  )

  const viewModel = {
    pageTitle: localise('registrations:pageTitle', { siteName, material }),
    siteName,
    material,
    isExporter,
    registrationStatus,
    registrationStatusClass: getStatusClass(registrationStatus),
    accreditationStatus,
    accreditationStatusClass: getStatusClass(accreditationStatus),
    registrationNumber: registration.registrationNumber,
    accreditationNumber: accreditation?.accreditationNumber,
    hasRegistrationStatus: !!registrationStatus,
    hasAccreditationStatus: !!accreditationStatus,
    hasRegistrationNumber: !!registration.registrationNumber,
    hasAccreditationNumber: !!accreditation?.accreditationNumber,
    hasSiteName: !!siteName,
    backUrl: isExporter
      ? request.localiseUrl(`/organisations/${organisationId}/exporting`)
      : request.localiseUrl(`/organisations/${organisationId}`),
    uploadSummaryLogUrl,
    contactRegulatorUrl: request.localiseUrl('/contact'),
    prns: getPrnViewData(
      request,
      { noteType, noteTypePlural },
      organisationId,
      registration.id,
      registration.accreditationId
    ),
    wasteBalance: getWasteBalanceViewData(wasteBalance, noteTypePlural)
  }

  return viewModel
}

/**
 * Get PRN/PERN view data based on registration type and feature flag
 * @param {Request} request
 * @param {{noteType: 'PRN' | 'PERN', noteTypePlural: 'PRNs' | 'PERNs'}} noteTypes
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string | undefined} accreditationId
 */
function getPrnViewData(
  request,
  { noteType, noteTypePlural },
  organisationId,
  registrationId,
  accreditationId
) {
  const { t: localise } = request

  const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`
  const manageUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

  return {
    isEnabled: config.get('featureFlags.prns'),
    description: localise('registrations:notes.description', {
      noteTypePlural
    }),
    link: {
      href: request.localiseUrl(createUrl),
      text: localise('registrations:notes.createNew', { noteType })
    },
    manageLink: {
      href: request.localiseUrl(manageUrl),
      text: localise('registrations:notes.manage', { noteTypePlural })
    },
    notAvailable: localise('registrations:notes.notAvailable', { noteType }),
    title: localise('registrations:notes.title', { noteTypePlural })
  }
}

async function getWasteBalance(
  organisationId,
  accreditationId,
  idToken,
  logger
) {
  if (!accreditationId) {
    return null
  }

  try {
    const wasteBalanceMap = await fetchWasteBalances(
      organisationId,
      [accreditationId],
      idToken
    )
    return wasteBalanceMap[accreditationId] ?? null
  } catch (error) {
    logger.error({ error }, 'Failed to fetch waste balance')
    return null
  }
}

/**
 * @param {WasteBalance | null} wasteBalance
 * @param {'PRNs' | 'PERNs'} noteTypePlural
 */
function getWasteBalanceViewData(wasteBalance, noteTypePlural) {
  return {
    availableAmount:
      wasteBalance === null ? null : wasteBalance.availableAmount,
    noteTypePlural
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */
