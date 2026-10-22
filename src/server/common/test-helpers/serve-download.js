import { http, HttpResponse } from 'msw'

/**
 * @import { SetupServer } from 'msw/node'
 */

/**
 * Answers a download at `url` and records the URL of each request made for it.
 * A status of 400 or above answers with no body, as a refusal would.
 * @param {SetupServer} msw
 * @param {string} url
 * @param {{
 *   body?: string,
 *   contentDisposition?: string | null,
 *   contentType?: string | null,
 *   status?: number
 * }} [answer]
 * @returns {string[]}
 */
export const serveDownload = (
  msw,
  url,
  {
    body = '',
    contentDisposition = null,
    contentType = null,
    status = 200
  } = {}
) => {
  /** @type {string[]} */
  const requests = []

  msw.use(
    http.get(url, ({ request }) => {
      requests.push(request.url)

      if (status >= 400) {
        return new HttpResponse(null, { status })
      }

      return new HttpResponse(new Blob([body]), {
        status,
        headers: {
          ...(contentType && { 'content-type': contentType }),
          ...(contentDisposition && {
            'content-disposition': contentDisposition
          })
        }
      })
    })
  )

  return requests
}
