import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { test } from '#vite/fixtures/server.js'

import { fetchWasteRecordYears } from './fetch-waste-record-years.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchWasteRecordYears, () => {
  test('returns the years the backend exports', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/waste-records/years`, () =>
        HttpResponse.json({ years: [{ year: 2027 }, { year: 2026 }] })
      )
    )

    const result = await fetchWasteRecordYears(toBackendToken('test-id-token'))

    expect(result).toStrictEqual([2027, 2026])
  })
})
