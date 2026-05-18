import { describe, it, expect } from 'vitest'

import {
  getActionLabel,
  getStatusLabel,
  getStatusTagClass
} from './format-submission-status.js'

const localise = (key) => key

describe('#getStatusTagClass', () => {
  it.each([
    { status: 'due', expected: 'govuk-tag--orange' },
    { status: 'in_progress', expected: 'govuk-tag--yellow' },
    { status: 'ready_to_submit', expected: '' },
    { status: 'submitted', expected: 'govuk-tag--green' }
  ])(
    'returns "$expected" modifier class for "$status" status',
    ({ status, expected }) => {
      expect(getStatusTagClass(status)).toBe(expected)
    }
  )
})

describe('#getStatusLabel', () => {
  it('returns localised label for "due" status', () => {
    expect(getStatusLabel('due', localise)).toBe('reports:statusDue')
  })

  it('returns localised label for "in_progress" status', () => {
    expect(getStatusLabel('in_progress', localise)).toBe(
      'reports:statusInProgress'
    )
  })

  it('returns localised label for "ready_to_submit" status', () => {
    expect(getStatusLabel('ready_to_submit', localise)).toBe(
      'reports:statusReadyToSubmit'
    )
  })

  it('returns localised label for "submitted" status', () => {
    expect(getStatusLabel('submitted', localise)).toBe(
      'reports:statusSubmitted'
    )
  })
})

describe('#getActionLabel', () => {
  it('returns "Continue" action for "in_progress" status', () => {
    expect(getActionLabel('in_progress', localise)).toBe(
      'reports:actionContinue'
    )
  })

  it('returns "Select" action for "due" status', () => {
    expect(getActionLabel('due', localise)).toBe('reports:actionSelect')
  })

  it('returns "Review and submit" action for "ready_to_submit" status', () => {
    expect(getActionLabel('ready_to_submit', localise)).toBe(
      'reports:actionReviewAndSubmit'
    )
  })

  it('returns "Select" action for null status', () => {
    expect(getActionLabel(null, localise)).toBe('reports:actionSelect')
  })
})
