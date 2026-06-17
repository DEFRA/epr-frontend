import { http, HttpResponse } from 'msw'

/**
 * MSW handler that authorises on `Authorization: Bearer <token>`: returns the
 * `onAuthorised` response when the header matches, otherwise a 401. Collapses
 * the bearer-check boilerplate duplicated across backend-call tests.
 * @param {'get' | 'put' | 'post' | 'delete' | 'patch'} method
 * @param {string} url
 * @param {string} token
 * @param {() => Response} onAuthorised
 */
export const bearerAuthHandler = (method, url, token, onAuthorised) =>
  http[method](url, ({ request }) => {
    if (request.headers.get('Authorization') === `Bearer ${token}`) {
      return onAuthorised()
    }

    return HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
  })
