/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler({ t }, h) {
    return h.view('account/index', {
      pageTitle: t('account:pageTitle'),
      heading: t('account:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
