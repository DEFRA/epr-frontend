import { config } from '#config/config.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'
import Boom from '@hapi/boom'
import { capitalize } from 'lodash-es'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params

    const session = request.auth.credentials

    const organisationData = await fetchOrganisationById(
      organisationId,
      session.idToken
    )

    const registration = organisationData.registrations?.find(
      ({ id }) => id === registrationId
    )

    if (!registration) {
      const message = 'Registration not found'
      request.logger.warn({ registrationId }, message)
      throw Boom.notFound(message)
    }

    const accreditation = organisationData.accreditations?.find(
      ({ id }) => id === registration.accreditationId
    )

    const wasteBalance = config.get('featureFlags.wasteBalance')
      ? await getWasteBalance(
          organisationId,
          registration.accreditationId,
          session.idToken,
          request.logger
        )
      : null

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
  const isExporter = registration.wasteProcessingType === 'exporter'
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
    prns: getPrnViewData(request, isExporter)
  }

  if (config.get('featureFlags.wasteBalance')) {
    viewModel.wasteBalance = getWasteBalanceViewData(
      wasteBalance,
      localise,
      isExporter
    )
  }

  return viewModel
}

/**
 * Get PRN/PERN view data based on registration type and feature flag
 * @param {Request} request
 * @param {boolean} isExporter
 */
function getPrnViewData(request, isExporter) {
  const { t: localise } = request
  const key = isExporter ? 'perns' : 'prns'

  return {
    isEnabled: config.get('featureFlags.prns'),
    description: localise(`registrations:${key}.description`),
    link: {
      href: request.localiseUrl(paths.prns.create),
      text: localise(`registrations:${key}.createNew`)
    },
    notAvailable: localise(`registrations:${key}.notAvailable`),
    title: localise(`registrations:${key}.title`)
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

function getWasteBalanceViewData(wasteBalance, localise, isExporter) {
  return {
    availableAmount:
      wasteBalance === null ? null : wasteBalance.availableAmount,
    noteType: isExporter ? 'perns' : 'prns'
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */
