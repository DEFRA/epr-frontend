/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

import { languageSelector } from '../common/helpers/i18n.js'

export const homeController = {
  handler(request, h) {
    const { lang = 'en' } = request.params

    return h.view('home/index', {
      pageTitle: languageSelector(lang, 'home.pageTitle'),
      heading: languageSelector(lang, 'home.heading'),
      languageNotice: languageSelector(lang, 'home.languageNotice'),
      lang
    })
  }
}


/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
