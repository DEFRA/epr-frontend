import { describe, it, expect } from 'vitest'

import { getStatusLabel, getActionLabel } from './format-submission-status.js'

const localise = (key) => key

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

  it('returns null for null status', () => {
    expect(getStatusLabel(null, localise)).toBeNull()
  })

  it('returns null for unrecognised status', () => {
    expect(getStatusLabel('unknown', localise)).toBeNull()
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

  it('returns "Select" action for "ready_to_submit" status', () => {
    expect(getActionLabel('ready_to_submit', localise)).toBe(
      'reports:actionSelect'
    )
  })

  it('returns "Select" action for null status', () => {
    expect(getActionLabel(null, localise)).toBe('reports:actionSelect')
  })
})
