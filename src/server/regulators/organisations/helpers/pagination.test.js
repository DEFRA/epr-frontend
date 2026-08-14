import { describe, expect, it } from 'vitest'

import { buildPaginationLinks } from './pagination.js'

const basePath = '/regulators/organisations'

describe(buildPaginationLinks, () => {
  it('offers no links when the results fit on one page', () => {
    expect(
      buildPaginationLinks({ basePath, page: 1, totalPages: 1 })
    ).toStrictEqual({})
  })

  it('offers only a next link on the first page of several', () => {
    expect(
      buildPaginationLinks({ basePath, page: 1, totalPages: 3 })
    ).toStrictEqual({
      next: { href: '/regulators/organisations?page=2' }
    })
  })

  it('offers both links in the middle of the results', () => {
    expect(
      buildPaginationLinks({ basePath, page: 2, totalPages: 3 })
    ).toStrictEqual({
      previous: { href: '/regulators/organisations?page=1' },
      next: { href: '/regulators/organisations?page=3' }
    })
  })

  it('offers only a previous link on the last page', () => {
    expect(
      buildPaginationLinks({ basePath, page: 3, totalPages: 3 })
    ).toStrictEqual({
      previous: { href: '/regulators/organisations?page=2' }
    })
  })

  it('carries the search through so paging never widens it', () => {
    expect(
      buildPaginationLinks({
        basePath,
        page: 1,
        totalPages: 2,
        search: 'Acme Waste'
      })
    ).toStrictEqual({
      next: { href: '/regulators/organisations?search=Acme+Waste&page=2' }
    })
  })

  it('omits an empty search rather than paging on a blank criterion', () => {
    expect(
      buildPaginationLinks({ basePath, page: 1, totalPages: 2, search: '' })
    ).toStrictEqual({
      next: { href: '/regulators/organisations?page=2' }
    })
  })

  it('keeps the language the regulator is reading in', () => {
    expect(
      buildPaginationLinks({
        basePath: '/cy/regulators/organisations',
        page: 1,
        totalPages: 2
      })
    ).toStrictEqual({
      next: { href: '/cy/regulators/organisations?page=2' }
    })
  })
})
