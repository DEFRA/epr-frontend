import { controller } from './controller.js'
import { controller as accreditationController } from './details/accreditations/controller.js'
import { controller as detailsController } from './details/controller.js'
import { controller as registeredOnlyPeriodController } from './details/registered-only-periods/controller.js'
import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationId: string, registrationId: string }} RegistrationParams
 */

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const registrationController = {
  /**
   * @param {HapiRequest & { params: RegistrationParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return readsAsARegulator(request.auth.credentials)
      ? detailsController.handler(request, h)
      : controller.handler(request, h)
  }
}

/**
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string
 * }} AccreditationParams
 */

/**
 * Unlike the registration above it, this address has no operator page to fall
 * through to, so a caller who does not read as a regulator is told there is no
 * such accreditation rather than handed a second controller.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const accreditationRoute = {
  /**
   * @param {HapiRequest & { params: AccreditationParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    if (!readsAsARegulator(request.auth.credentials)) {
      throw notFound(
        'Accreditation not found',
        errorCodes.accreditationNotFound,
        {
          event: {
            action: 'fetch_accreditation',
            reason: 'caller does not read as a regulator'
          }
        }
      )
    }

    return accreditationController.handler(request, h)
  }
}

/**
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   year: number
 * }} RegisteredOnlyPeriodParams
 */

/**
 * Gated the same way as the accreditation above it, and for the same reason:
 * there is no operator page at this address to fall through to.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const registeredOnlyPeriodRoute = {
  options: registeredOnlyPeriodController.options,
  /**
   * @param {HapiRequest & { params: RegisteredOnlyPeriodParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    if (!readsAsARegulator(request.auth.credentials)) {
      throw notFound(
        'Registered-only period not found',
        errorCodes.registrationNotFound,
        {
          event: {
            action: 'fetch_registered_only_period',
            reason: 'caller does not read as a regulator'
          }
        }
      )
    }

    return registeredOnlyPeriodController.handler(request, h)
  }
}

/**
 * Sets up the routes used in the accreditation dashboard page.
 * These routes are registered in src/server/router.js.
 */
export const registrations = {
  plugin: {
    name: 'registrations',
    register(server) {
      server.route([
        {
          ...registrationController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}'
        },
        {
          ...accreditationRoute,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/accreditations/{accreditationId}'
        },
        {
          ...registeredOnlyPeriodRoute,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/registered-only-periods/{year}'
        }
      ])
    }
  }
}
