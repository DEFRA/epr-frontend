import { describe, expect, it } from 'vitest'

import { isReadMethod } from './http-methods.js'

describe(isReadMethod, () => {
  it.each(['get', 'head'])('treats %s as a read', (method) => {
    expect(isReadMethod(method)).toBe(true)
  })

  it.each(['post', 'put', 'patch', 'delete', 'options'])(
    'treats %s as a write',
    (method) => {
      expect(isReadMethod(method)).toBe(false)
    }
  )
})
