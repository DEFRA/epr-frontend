import { describe, expect, it } from 'vitest'

import {
  getActionLabel,
  getStatusLabel,
  getStatusTagClass
} from './format-submission-status.js'

/**
 * @import { SubmissionStatusValue } from '../constants.js'
 */

/**
 * @param {string} key
 * @returns {string}
 */
const localise = (key) => key

describe('#format-submission-status', () => {
  describe('#getStatusTagClass', () => {
    it.each(
      /** @type {Array<{ status: SubmissionStatusValue, expected: string }>} */ ([
        { status: 'due', expected: 'govuk-tag--orange' },
        { status: 'in_progress', expected: 'govuk-tag--yellow' },
        { status: 'ready_to_submit', expected: '' },
        { status: 'submitted', expected: 'govuk-tag--green' }
      ])
    )(
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

    it('returns "Create draft" action for "due" status', () => {
      expect(getActionLabel('due', localise)).toBe('reports:actionCreateDraft')
    })

    it('returns "Review and submit" action for "ready_to_submit" status', () => {
      expect(getActionLabel('ready_to_submit', localise)).toBe(
        'reports:actionReviewAndSubmit'
      )
    })
  })
})
