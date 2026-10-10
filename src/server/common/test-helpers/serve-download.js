import { http, HttpResponse } from 'msw'

/**
 * @import { SetupServerApi } from 'msw/node'
 */

/**
 * Answers a download at `url` and records each request made for it.
 * A status of 400 or above answers with no body, as a refusal would.
 * @param {SetupServerApi} msw
 * @param {string} url
 * @param {{
 *   body?: string,
 *   contentDisposition?: string | null,
 *   contentType?: string | null,
 *   status?: number
 * }} [answer]
 * @returns {{ authorization: string | null, url: string }[]}
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
  /** @type {{ authorization: string | null, url: string }[]} */
  const requests = []

  msw.use(
    http.get(url, ({ request }) => {
      requests.push({
        authorization: request.headers.get('authorization'),
        url: request.url
      })

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
