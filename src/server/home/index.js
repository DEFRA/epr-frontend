import { homeController } from '~/src/server/home/controller.js'
import { uploadCompleteController } from './uploader-complete.js'

export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          handler: homeController.handler
        },
        {
          method: 'GET',
          path: '/upload/complete',
          handler: uploadCompleteController.handler
        }
      ])
    }
  }
}
