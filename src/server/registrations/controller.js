import { config } from '#config/config.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import { capitalize } from 'lodash-es'

/**
 * @typedef {{ organisationId: string, registrationId: string }} RegistrationParams
 */

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: RegistrationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId } = request.params

    const session = request.auth.credentials

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    const wasteBalance = registration.accreditationId
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

/** @typedef {{ href: string; text: string }} Link */

/**
 * Reference text may be absent for a `RegistrationOther` (created / rejected
 * / archived) whose `registrationNumber` is optional in the domain model.
 * The template renders it verbatim, so `undefined` renders as empty — which
 * is fine. Callers pass the optional value through untouched.
 * @typedef {{
 *   reference: string | undefined;
 *   status: string;
 *   class: string;
 * }} TaggedReference
 */

/**
 * @typedef {(
 *   { exists: true } & TaggedReference
 *   | { exists: false }
 * )} MaybeTaggedReference
 */

/**
 * @typedef {{
 *   accreditation: MaybeTaggedReference;
 *   backUrl: string;
 *   contactRegulatorUrl: string;
 *   hasSiteName: boolean;
 *   isExporter: boolean;
 *   material: string;
 *   pageTitle: string;
 *   prns: { description: string; link: Link; manageLink: Link; title: string };
 *   registration: TaggedReference;
 *   reports: { isEnabled: boolean; link: Link };
 *   siteName: string | null;
 *   uploadSummaryLogUrl: string;
 *   wasteBalance: { availableAmount: number | null; noteTypePlural: 'PRNs' | 'PERNs' };
 * }} RegistrationViewModel
 */

/**
 * @param {{ reference: string | undefined; status: string }} params
 * @returns {TaggedReference}
 */
const buildTaggedReference = ({ reference, status }) => ({
  reference,
  status: capitalize(status),
  class: getStatusClass(status)
})

/**
 * @param {{ reference?: string; status?: string }} params
 * @returns {MaybeTaggedReference}
 */
const buildMaybeTaggedReference = ({ reference, status }) => {
  if (!reference || !status) {
    return { exists: false }
  }

  return {
    ...buildTaggedReference({ reference, status }),
    exists: true
  }
}

/**
 * Build view model for accreditation dashboard
 * @param {{
 *   request: HapiRequest;
 *   organisationId: string;
 *   registration: Registration;
 *   accreditation: Accreditation | undefined;
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
    accreditation: buildMaybeTaggedReference({
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
    registration: buildTaggedReference({
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
 * @param {HapiRequest} request
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
 * @param {HapiRequest} request
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
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */
