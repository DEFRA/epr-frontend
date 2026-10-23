import { fetchRequiredAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { toAccreditationKeys } from './fetch-prn-context.js'
import { prnsPath } from './prn-resource.js'

/**
 * Once the backend rules an accreditation's year closed, its PRNs and PERNs
 * can be read but not raised, issued or cancelled. The one place the frontend
 * applies that: write routes declare where a closed year sends the session,
 * and the gate below sends it there before the handler runs.
 */

/**
 * Response-body `code` of the backend's 409 when its own clock has closed the
 * year between the gate and the write.
 */
const RELEVANT_YEAR_CLOSED_CODE = 'RELEVANT_YEAR_CLOSED'

/**
 * Whether PRNs and PERNs can still be written for the accreditation's year.
 * @param {Accreditation} accreditation
 */
export const isYearOpen = (accreditation) => accreditation.relevantYearOpen

/** @typedef {(params: PrnListParams & { prnId?: string }) => string} ClosedYearTarget */

/** @type {{ list: ClosedYearTarget, note: ClosedYearTarget }} */
export const closedYearSendsTo = {
  list: (params) => prnsPath(toAccreditationKeys(params)),
  note: (params) =>
    `${prnsPath(toAccreditationKeys(params))}/${params.prnId}/view`
}

/**
 * The route with a closed-year gate ahead of its handler.
 * @template {Partial<HapiServerRoute<HapiRequest>>} R
 * @param {R} route
 * @param {ClosedYearTarget} sendTo
 * @returns {R}
 */
export const closedWithTheYear = (route, sendTo) => ({
  ...route,
  options: {
    ...route.options,
    pre: [
      ...(route.options?.pre ?? []),
      {
        /**
         * @param {HapiRequest & { params: PrnListParams & { prnId?: string } }} request
         * @param {ResponseToolkit} h
         */
        method: async (request, h) => {
          const { accreditation } = await fetchRequiredAccreditation(
            toAccreditationKeys(request.params),
            request.auth.credentials.backendToken
          )
          return isYearOpen(accreditation)
            ? h.continue
            : h.redirect(sendTo(request.params)).takeover()
        }
      }
    ]
  }
})

/**
 * Whether a backend refusal is the one for a year that has closed.
 * @param {{ output?: { payload?: { code?: string } } }} error
 */
export const isClosedYearRefusal = (error) =>
  error.output?.payload?.code === RELEVANT_YEAR_CLOSED_CODE

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { Accreditation } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnListParams } from './session-types.js'
 */
