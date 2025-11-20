import { describe, expect, it } from 'vitest'
import { getDisplayName } from './display.js'

describe('display', () => {
  it.each([
    {
      firstName: undefined,
      lastName: undefined,
      expected: ''
    },
    {
      firstName: 'John',
      lastName: undefined,
      expected: 'John'
    },
    {
      firstName: undefined,
      lastName: 'Doe',
      expected: 'Doe'
    },
    {
      firstName: 'John',
      lastName: 'Doe',
      expected: 'John Doe'
    }
  ])(
    'should get $expected from $firstName and $lastName',
    ({ firstName, lastName, expected }) => {
      const actual = getDisplayName({ firstName, lastName })

      expect(actual).toStrictEqual(expected)
    }
  )
})
