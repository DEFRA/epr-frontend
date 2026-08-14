/**
 * How many organisations one page of results holds. The backend returns every
 * organisation unpaginated when it is given no page, so a page size always
 * goes with the request.
 */
export const PAGE_SIZE = 50

/**
 * Where one page of the results lives, carrying the search through so paging
 * narrows to the same organisations the page is already showing.
 *
 * The caller gives the path, already localised, so paging keeps the language
 * the regulator is reading in rather than sending them back to the English
 * route.
 * @param {{ basePath: string, page: number, search?: string }} target
 * @returns {string}
 */
export const organisationsPageHref = ({ basePath, page, search }) => {
  const params = new URLSearchParams()

  if (search) {
    params.set('search', search)
  }

  params.set('page', String(page))

  return `${basePath}?${params}`
}

/**
 * The last page the results actually reach. A search matching nothing still
 * has a page to show the regulator, so the count never falls below one.
 * @param {number} totalPages
 * @returns {number}
 */
export const lastPageOf = (totalPages) => Math.max(totalPages, 1)

/**
 * Builds the previous and next links for the results table.
 * @param {{
 *   basePath: string,
 *   page: number,
 *   totalPages: number,
 *   search?: string
 * }} results
 * @returns {{ previous?: { href: string }, next?: { href: string } }}
 */
export const buildPaginationLinks = ({
  basePath,
  page,
  totalPages,
  search
}) => {
  if (totalPages <= 1) {
    return {}
  }

  /**
   * @param {number} pageNumber
   * @returns {{ href: string }}
   */
  const linkTo = (pageNumber) => ({
    href: organisationsPageHref({ basePath, page: pageNumber, search })
  })

  return {
    ...(page > 1 && { previous: linkTo(page - 1) }),
    ...(page < totalPages && { next: linkTo(page + 1) })
  }
}
