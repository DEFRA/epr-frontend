import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { backend, path } from '#server/common/helpers/backend-client.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 */

/**
 * Where one overseas reprocessing site is, as
 * `/v1/organisations/{id}/registrations/{id}/overseas-sites` answers it. Every
 * field is null where no stored site carries the id the registration names.
 *
 * The resource serves where a site is, not whether it is approved, so there is
 * no approval date here to render.
 * @typedef {{
 *   name: string | null,
 *   country: string | null,
 *   address: {
 *     line1: string,
 *     line2?: string | null,
 *     townOrCity: string,
 *     stateOrRegion?: string | null,
 *     postcode?: string | null
 *   } | null,
 *   coordinates: string | null
 * }} OverseasSiteDetail
 */

/**
 * @typedef {Record<string, OverseasSiteDetail>} OverseasSitesById
 * @typedef {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   sites: OverseasSitesById
 * }} OverseasSitesDetails
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string
 * }} OverseasSitesRequest
 */

/**
 * A registration this organisation does not hold is a 404 from the organisation
 * read and from the sites route alike, and the two race. Either is re-thrown as
 * the same failure, so the log line names what was asked for whichever read
 * lost.
 * @param {Omit<OverseasSitesRequest, 'backendToken'>} params
 * @returns {(error: unknown) => never}
 */
const asMissingRegistration =
  ({ organisationId, registrationId }) =>
  (error) => {
    if (!Boom.isBoom(error, statusCodes.notFound)) {
      throw error
    }

    throw notFound('Registration not found', errorCodes.registrationNotFound, {
      event: {
        action: 'fetch_overseas_sites',
        reason: `organisationId=${organisationId} registrationId=${registrationId}`
      }
    })
  }

/**
 * @param {OverseasSitesRequest} params
 * @returns {Promise<OverseasSitesById>}
 */
const fetchSites = (params) =>
  backend(params.backendToken).get(
    path`/v1/organisations/${params.organisationId}/registrations/${params.registrationId}/overseas-sites`,
    { onError: asMissingRegistration(params) }
  )

/**
 * The sites the registration names, resolved to where each one is.
 *
 * The registration comes off the organisation document rather than its own
 * address, as the accreditation page's does: what this page wants from it is
 * the number for the caption and the material for the packaging waste category
 * column, and the stored record carries both.
 * @param {OverseasSitesRequest} params
 * @returns {Promise<OverseasSitesDetails>}
 */
export const fetchOverseasSites = async (params) => {
  const [linked, sites] = await Promise.all([
    fetchRegistrationAndAccreditation(
      params.organisationId,
      params.registrationId,
      params.backendToken
    ).catch(asMissingRegistration(params)),
    fetchSites(params)
  ])

  return {
    organisation: linked.organisationData,
    registration: linked.registration,
    sites
  }
}
