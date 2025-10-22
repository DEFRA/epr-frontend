import inert from '@hapi/inert'

import { auth } from '~/src/server/auth/index.js'
import { serveStaticFiles } from '~/src/server/common/helpers/serve-static-files.js'
import { config } from '#config/config.js'
import { health } from '~/src/server/health/index.js'
import { home } from '~/src/server/home/index.js'
import { login } from '~/src/server/login/index.js'
import { logout } from '~/src/server/logout/index.js'
import { registration } from '~/src/server/registration/index.js'
import { summaryLogUploadProgress } from '~/src/server/summary-log-upload-progress/index.js'
import { summaryLogUpload } from '~/src/server/summary-log-upload/index.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Authentication routes
      if (config.get('featureFlags.defraId')) {
        await server.register([login, auth, logout])
      }

      // Application specific routes, add your own routes here
      await server.register([
        home,
        registration,
        summaryLogUpload,
        summaryLogUploadProgress
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
