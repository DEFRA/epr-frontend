import { STEPS } from './journey.js'
import { createStepRoutes } from './step-factory.js'
import {
  startController,
  baseRedirectController,
  checkGetController,
  checkPostController,
  confirmationController
} from './controllers.js'

/**
 * Prototype journey for entering a "received load for reprocessing" through a
 * series of GOV.UK forms, as an alternative to the spreadsheet upload.
 *
 * The journey runs without authentication or a backend: answers are held in
 * the session and the final step records nothing, it just confirms completion.
 */
export const receivedLoads = {
  plugin: {
    name: 'received-loads',
    register(server) {
      server.route([
        baseRedirectController,
        startController,
        ...STEPS.flatMap(createStepRoutes),
        checkGetController,
        checkPostController,
        confirmationController
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
