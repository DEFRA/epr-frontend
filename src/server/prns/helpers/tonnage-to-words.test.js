import { describe, expect, it } from 'vitest'
import { tonnageToWords } from './tonnage-to-words.js'

describe('#tonnageToWords', () => {
  it('should return "Zero" for 0', () => {
    expect(tonnageToWords(0)).toBe('Zero')
  })

  it.each([
    { input: 1, expected: 'One' },
    { input: 5, expected: 'Five' },
    { input: 9, expected: 'Nine' }
  ])(
    'should convert single digit $input to "$expected"',
    ({ input, expected }) => {
      expect(tonnageToWords(input)).toBe(expected)
    }
  )

  it.each([
    { input: 10, expected: 'Ten' },
    { input: 11, expected: 'Eleven' },
    { input: 13, expected: 'Thirteen' },
    { input: 19, expected: 'Nineteen' }
  ])('should convert teen $input to "$expected"', ({ input, expected }) => {
    expect(tonnageToWords(input)).toBe(expected)
  })

  it.each([
    { input: 20, expected: 'Twenty' },
    { input: 21, expected: 'Twenty one' },
    { input: 42, expected: 'Forty two' },
    { input: 99, expected: 'Ninety nine' }
  ])('should convert tens $input to "$expected"', ({ input, expected }) => {
    expect(tonnageToWords(input)).toBe(expected)
  })

  it.each([
    { input: 100, expected: 'One hundred' },
    { input: 101, expected: 'One hundred and one' },
    { input: 150, expected: 'One hundred and fifty' },
    { input: 999, expected: 'Nine hundred and ninety nine' }
  ])('should convert hundreds $input to "$expected"', ({ input, expected }) => {
    expect(tonnageToWords(input)).toBe(expected)
  })

  it.each([
    { input: 1000, expected: 'One thousand' },
    { input: 1001, expected: 'One thousand and one' },
    { input: 10000, expected: 'Ten thousand' },
    {
      input: 12345,
      expected: 'Twelve thousand three hundred and forty five'
    },
    {
      input: 12300,
      expected: 'Twelve thousand three hundred'
    }
  ])(
    'should convert thousands $input to "$expected"',
    ({ input, expected }) => {
      expect(tonnageToWords(input)).toBe(expected)
    }
  )

  it.each([
    { input: 1000000, expected: 'One million' },
    { input: 1000032, expected: 'One million and thirty two' },
    {
      input: 1234567,
      expected:
        'One million two hundred and thirty four thousand five hundred and sixty seven'
    },
    {
      input: 1000567,
      expected: 'One million five hundred and sixty seven'
    },
    {
      input: 10000000,
      expected: 'Ten million'
    }
  ])('should convert millions $input to "$expected"', ({ input, expected }) => {
    expect(tonnageToWords(input)).toBe(expected)
  })

  it.each([
    { input: 1000000000, expected: 'One billion' },
    { input: 1000000032, expected: 'One billion and thirty two' },
    {
      input: 1000001000,
      expected: 'One billion one thousand'
    },
    {
      input: 1000000156,
      expected: 'One billion one hundred and fifty six'
    },
    {
      input: 1000156000,
      expected: 'One billion one hundred and fifty six thousand'
    },
    {
      input: 1156248389,
      expected:
        'One billion one hundred and fifty six million two hundred and forty eight thousand three hundred and eighty nine'
    }
  ])('should convert billions $input to "$expected"', ({ input, expected }) => {
    expect(tonnageToWords(input)).toBe(expected)
  })

  it.each([
    { input: -1, expected: 'Minus one' },
    { input: -42, expected: 'Minus forty two' },
    { input: -150, expected: 'Minus one hundred and fifty' },
    { input: -1001, expected: 'Minus one thousand and one' }
  ])(
    'should convert negative number $input to "$expected"',
    ({ input, expected }) => {
      expect(tonnageToWords(input)).toBe(expected)
    }
  )
})
