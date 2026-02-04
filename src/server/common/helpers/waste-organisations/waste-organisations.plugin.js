/** @import {Plugin} from '@hapi/hapi' */
/** @import {WasteOrganisation} from './types.js' */

import { config } from '#config/config.js'
import { registerService } from '#server/plugins/register-service.js'

import { createApiWasteOrganisationsService } from './api-adapter.js'
import { createInMemoryWasteOrganisationsService } from './inmemory-adapter.js'

/**
 * @typedef {{
 *   initialOrganisations?: WasteOrganisation[]
 * }} WasteOrganisationsPluginOptions
 */

/**
 * Creates a Hapi plugin that registers the waste organisations service on the request object.
 * @param {WasteOrganisationsPluginOptions} [options]
 * @returns {Plugin<WasteOrganisationsPluginOptions>}
 */
export function createWasteOrganisationsPlugin(options = {}) {
  return {
    name: 'wasteOrganisationsService',
    register: (server) => {
      const useInMemory = config.get('wasteOrganisationsApi.useInMemory')
      const service = useInMemory
        ? createInMemoryWasteOrganisationsService(options.initialOrganisations)
        : createApiWasteOrganisationsService()

      registerService(server, 'wasteOrganisationsService', () => service)
    }
  }
}
