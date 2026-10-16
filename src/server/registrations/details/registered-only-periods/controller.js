import { hasLedgerReadScope } from '#server/auth/scopes.js'

import { buildViewModel } from './build-view-model.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

import { fetchRegisteredOnlyPeriod } from './helpers/fetch-registered-only-period.js'
import { registeredYears } from '../helpers/timeline-dates.js'
import {
  paramsOrNotFound,
  yearParamsSchema
} from '../helpers/params-validation.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{
 *   organisationNumber: string,
 *   registrationNumber: string,
 *   year: number
 * }} RegisteredOnlyPeriodParams
 */

const periodNotFound = {
  message: 'Registered-only period not found',
  code: errorCodes.registrationNotFound,
  action: 'fetch_registered_only_period'
}

/**
 * @param {string} reason
 * @returns {never}
 */
const noSuchPeriod = (reason) => {
  const { message, code, action } = periodNotFound
  throw notFound(message, code, { event: { action, reason } })
}

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  options: {
    validate: paramsOrNotFound(yearParamsSchema, {
      ...periodNotFound,
      reason: 'the address holds no such period'
    })
  },
  /**
   * @param {HapiRequest & { params: RegisteredOnlyPeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber, registrationNumber, year } = request.params
    const { backendToken } = request.auth.credentials

    const {
      organisation,
      registration,
      cadence,
      reportingPeriods,
      ledgerEvents
    } = await fetchRegisteredOnlyPeriod({
      organisationNumber,
      registrationNumber,
      year,
      backendToken,
      canReadLedger: hasLedgerReadScope(request.auth.credentials),
      logger: request.logger
    })

    // A year with no approved registration day is not found, as the backend's ledger answers.
    if (!registeredYears(registration).includes(year)) {
      noSuchPeriod(
        `organisationNumber=${organisationNumber} registrationNumber=${registrationNumber} year=${year}`
      )
    }

    return h.view(
      'registrations/details/registered-only-periods/index',
      buildViewModel({
        organisation,
        registration,
        keys: { organisationNumber, registrationNumber },
        cadence,
        reportingPeriods,
        ledgerEvents,
        year,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
