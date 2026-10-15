import Joi from 'joi'

import { hasLedgerReadScope } from '#server/auth/scopes.js'

import { buildViewModel } from './build-view-model.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import {
  MAX_YEAR,
  MIN_YEAR
} from '#server/reports/helpers/period-params-schema.js'

import { fetchRegisteredOnlyPeriod } from './helpers/fetch-registered-only-period.js'
import { registrationYears } from '../helpers/registered-only.js'
import { registrationDateRange } from '../helpers/timeline-dates.js'

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

/**
 * The year is bound by the same range every other `{year}` address uses, so a
 * year one accepts is not one another rejects.
 */
const paramsSchema = Joi.object({
  organisationNumber: Joi.string().required(),
  registrationNumber: Joi.string().required(),
  year: Joi.number().integer().min(MIN_YEAR).max(MAX_YEAR).required()
})

/**
 * @param {string} reason
 * @returns {never}
 */
const noSuchPeriod = (reason) => {
  throw notFound(
    'Registered-only period not found',
    errorCodes.registrationNotFound,
    {
      event: { action: 'fetch_registered_only_period', reason }
    }
  )
}

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  options: {
    validate: {
      params: paramsSchema,
      // A year the address cannot hold is not a bad request, it is an address
      // that does not exist - and answering 400 would tell a caller the route
      // is there while a well-formed year answers 404 for them.
      failAction: () => noSuchPeriod('the year is not one this address holds')
    }
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

    // A well-formed year the registration never ran over is a page about
    // nothing, so it is not found rather than rendered empty.
    if (
      !registrationYears({
        dateRange: registrationDateRange(registration)
      }).includes(year)
    ) {
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
