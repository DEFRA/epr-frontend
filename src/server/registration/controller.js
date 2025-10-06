/**
 * @satisfies {Partial<ServerRoute>}
 */
export const registrationController = {
  handler(request, h) {
    const { organisationId, registrationId } = request.params

    return h.view('registration/index', {
      pageTitle: 'Registration', // @todo use activity/site/material info
      heading: 'Registration',
      organisationId,
      registrationId
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
