import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { getRequiredRegistrationWithAccreditationByNumber } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { mapToSelectOptions } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import { fetchDecemberPrnEligibility } from './helpers/fetch-december-prn-eligibility.js'
import { toAccreditationKeys } from './helpers/fetch-prn-context.js'
import { fetchPrnWasteBalance } from './helpers/fetch-prn-waste-balance.js'
import { prnsPath } from './helpers/prn-resource.js'
import { resolveDecemberWasteControl } from './helpers/resolve-december-waste-choice.js'
import { resolveInsufficientBalanceMessageKey } from './helpers/insufficient-balance-error.js'
import { buildCreatePrnViewData } from './view-data.js'

/**
 * Build error data for insufficient balance redirect. `pool` is `'december'`
 * when the discarded draft over-spent its December pool - see
 * discardDraftOverBalance in view-controller.js, the only writer of the
 * `pool` query param.
 * @param {(key: string) => string} localise
 * @param {string} decemberWasteControlMode
 * @param {string} [pool]
 * @returns {{errors: object, errorSummary: {title: string, list: Array}}}
 */
function buildInsufficientBalanceError(
  localise,
  decemberWasteControlMode,
  pool
) {
  const messageKey = resolveInsufficientBalanceMessageKey(
    decemberWasteControlMode,
    pool === 'december'
  )
  const message = localise(messageKey)
  return {
    errors: {},
    errorSummary: {
      title: localise('prns:errorSummaryTitle'),
      list: [{ text: message, href: '#tonnage' }]
    }
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest & { params: PrnListParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const keys = toAccreditationKeys(request.params)
    const credentials = request.auth.credentials
    const { backendToken } = credentials

    const { registration, accreditation } =
      await getRequiredRegistrationWithAccreditationByNumber(keys, credentials)

    const [{ organisations }, wasteBalance, decemberPrnEligibility] =
      await Promise.all([
        request.wasteOrganisationsService.getOrganisations(),
        fetchPrnWasteBalance({
          keys,
          accreditationNumber: accreditation.accreditationNumber,
          backendToken,
          logger: request.logger
        }),
        fetchDecemberPrnEligibility(keys, backendToken)
      ])

    const { noteTypePlural } = getNoteTypeDisplayNames(registration)
    const decemberWasteControl = resolveDecemberWasteControl(
      decemberPrnEligibility,
      request.t,
      noteTypePlural,
      wasteBalance
    )

    const viewData = buildCreatePrnViewData(request, {
      keys,
      recipients: mapToSelectOptions(organisations),
      registration,
      wasteBalance,
      decemberWasteControl
    })

    await metrics.journey.start(request, JOURNEY.createPrn, prnsPath(keys))

    // Check for insufficient balance error from redirect

    const { t: localise } = request
    const errorParam = request.query.error

    if (errorParam === 'insufficient_balance') {
      const { errors, errorSummary } = buildInsufficientBalanceError(
        localise,
        decemberWasteControl.mode,
        /** @type {string | undefined} */ (request.query.pool)
      )
      return h.view('prns/create', { ...viewData, errors, errorSummary })
    }

    return h.view('prns/create', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnListParams } from './helpers/session-types.js'
 */
