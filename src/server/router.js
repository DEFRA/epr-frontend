import { isDefraIdEnabled } from '#config/config.js'
import { account } from '#server/account/index.js'
import { auth } from '#server/auth/index.js'
import { serveStaticFiles } from '#server/common/helpers/serve-static-files.js'
import { health } from '#server/health/index.js'
import { home } from '#server/home/index.js'
import { login } from '#server/login/index.js'
import { logout } from '#server/logout/index.js'
import { registration } from '#server/registration/index.js'
import { summaryLogUploadProgress } from '#server/summary-log-upload-progress/index.js'
import { summaryLogUpload } from '#server/summary-log-upload/index.js'
import inert from '@hapi/inert'

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
      if (isDefraIdEnabled()) {
        await server.register([login, auth, logout])
      }

      // Application specific routes, add your own routes here
      await server.register([
        account,
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
