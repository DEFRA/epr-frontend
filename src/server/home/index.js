import { homeController } from '~/src/server/home/controller.js'
import { uploadController } from '~/src/server/home/uploader.js'

export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        { method: 'GET', path: '/', ...homeController },
        { method: 'POST', path: '/upload', ...uploadController }
      ])
    }
  }
}
