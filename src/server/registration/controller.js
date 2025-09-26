/**
 * @satisfies {Partial<ServerRoute>}
 */
export const registrationController = {
  handler(_request, h) {
    return h.view('registration/index', {
      pageTitle: 'Registration', // @todo use activity/site/material info
      heading: 'Registration',
      organisationId: '123', // @fixme
      registrationId: '456' // @fixme
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
