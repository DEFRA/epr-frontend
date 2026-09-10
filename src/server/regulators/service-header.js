/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * What the header calls the service on a regulator page that renders without a
 * session, and where its link goes. The shared context reads the service from
 * the credentials, so a page holding none falls back to the operator's name,
 * which is the wrong service to put in front of a regulator.
 *
 * The link has to be an address that renders without a session too. A regulator
 * page rendered to a signed out reader whose header points at a scope gated
 * address sends that reader to the operator's signed out page.
 * @param {HapiRequest} request
 * @param {string} serviceUrl
 * @returns {{ serviceName: string, serviceUrl: string }}
 */
export const regulatorServiceHeader = (request, serviceUrl) => ({
  serviceName: request.t('regulators:serviceName'),
  serviceUrl
})
