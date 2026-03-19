import { config, isRegisteredOnlyEnabled } from '#config/config.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import Boom from '@hapi/boom'
import { capitalize } from 'lodash-es'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params

    const session = request.auth.credentials

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    if (!isRegisteredOnlyEnabled() && !accreditation) {
      throw Boom.notFound('Registered-only not enabled')
    }

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

/** @typedef {{ href: string; text: string }} Link */

/**
 * @typedef {{
 *   reference: string;
 *   status: string;
 *   class: string;
 * }} Status
 */

/**
 * @typedef {{ exists: true } & Status | { exists: false }} MaybeStatus
 */

/**
 * @typedef {{
 *   accreditation: MaybeStatus;
 *   backUrl: string;
 *   contactRegulatorUrl: string;
 *   hasSiteName: boolean;
 *   isExporter: boolean;
 *   material: string;
 *   pageTitle: string;
 *   prns: { description: string; link: Link; manageLink: Link; title: string };
 *   registration: Status;
 *   reports: { isEnabled: boolean; link: Link };
 *   siteName: string | null;
 *   uploadSummaryLogUrl: string;
 *   wasteBalance: { availableAmount: number | null; noteTypePlural: 'PRNs' | 'PERNs' };
 * }} RegistrationViewModel
 */

/**
 * @param {{ reference: string; status: string }} params
 * @returns {Status}
 */
const buildStatus = ({ reference, status }) => ({
  reference,
  status: capitalize(status),
  class: getStatusClass(status)
})

/**
 * @param {{ reference?: string; status?: string }} params
 * @returns {MaybeStatus}
 */
const buildMaybeStatus = ({ reference, status }) => {
  if (!reference || !status) {
    return { exists: false }
  }

  return {
    ...buildStatus({ reference, status }),
    exists: true
  }
}

/**
 * Build view model for accreditation dashboard
 * @param {{
 *   request: Request;
 *   organisationId: string;
 *   registration: Registration;
 *   accreditation?: Accreditation;
 *   wasteBalance: WasteBalance | null;
 * }} params
 * @returns {RegistrationViewModel}
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

  const uploadSummaryLogUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registration.id}/summary-logs/upload`
  )

  /** @type {RegistrationViewModel} */
  const viewModel = {
    accreditation: buildMaybeStatus({
      reference: accreditation?.accreditationNumber,
      status: accreditation?.status
    }),
    backUrl: isExporter
      ? request.localiseUrl(`/organisations/${organisationId}/exporting`)
      : request.localiseUrl(`/organisations/${organisationId}`),
    contactRegulatorUrl: request.localiseUrl('/contact'),
    hasSiteName: !!siteName,
    isExporter,
    material,
    pageTitle: localise('registrations:pageTitle', { siteName, material }),
    prns: getPrnViewData(
      request,
      { noteType, noteTypePlural },
      organisationId,
      registration.id,
      registration.accreditationId
    ),
    reports: getReportsViewData(request, organisationId, registration.id),
    registration: buildStatus({
      reference: registration.registrationNumber,
      status: registration.status
    }),
    siteName,
    uploadSummaryLogUrl,
    wasteBalance: getWasteBalanceViewData(wasteBalance, noteTypePlural)
  }

  return viewModel
}

/**
 * Get reports view data for the dashboard tile
 * @param {Request} request
 * @param {string} organisationId
 * @param {string} registrationId
 */
function getReportsViewData(request, organisationId, registrationId) {
  const { t: localise } = request
  const isEnabled = config.get('featureFlags.reports')
  const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

  return {
    isEnabled,
    link: {
      href: request.localiseUrl(reportsUrl),
      text: localise('registrations:manageReports')
    }
  }
}

/**
 * Get PRN/PERN view data based on registration type
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
    title: localise('registrations:notes.title', { noteTypePlural })
  }
}

async function getWasteBalance(organisationId, accreditationId, idToken) {
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
  } catch {
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
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */
