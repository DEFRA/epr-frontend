import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchWasteBalances } from './fetch-waste-balances.js'

describe(fetchWasteBalances, () => {
  it('should ask for the balances of every accreditation named and resolve to them', async ({
    msw
  }) => {
    const balances = {
      'acc/001': { amount: 1000, availableAmount: 750 },
      'acc&002': { amount: 500, availableAmount: 500 }
    }
    /** @type {{ pathname: string, accreditationIds: string | null }[]} */
    const received = []
    msw.use(
      http.get(/waste-balances$/, ({ request }) => {
        const url = new URL(request.url)
        received.push({
          pathname: url.pathname,
          accreditationIds: url.searchParams.get('accreditationIds')
        })
        return HttpResponse.json(balances)
      })
    )

    const result = await fetchWasteBalances(
      'org/1',
      ['acc/001', 'acc&002'],
      'a-token'
    )

    expect(result).toStrictEqual({
      'acc/001': { amount: 1000, availableAmount: 750 },
      'acc&002': { amount: 500, availableAmount: 500 }
    })
    expect(received).toStrictEqual([
      {
        pathname: '/v1/organisations/org%2F1/waste-balances',
        accreditationIds: 'acc/001,acc&002'
      }
    ])
  })

  it('should resolve to no balances without asking when no accreditation is named', async () => {
    await expect(
      fetchWasteBalances('org-1', [], 'a-token')
    ).resolves.toStrictEqual({})
  })
})
