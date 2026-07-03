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
        { status: 'overdue', expected: 'govuk-tag--red' },
        { status: 'in_progress', expected: 'govuk-tag--yellow' },
        { status: 'ready_to_submit', expected: '' },
        { status: 'submitted', expected: 'govuk-tag--green' },
        { status: 'requires_resubmission', expected: 'govuk-tag--purple' }
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

    it('returns localised label for "overdue" status', () => {
      expect(getStatusLabel('overdue', localise)).toBe('reports:statusOverdue')
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

    it('returns localised label for "requires_resubmission" status', () => {
      expect(getStatusLabel('requires_resubmission', localise)).toBe(
        'reports:statusRequiresResubmission'
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

    it('returns "Create draft" action for "overdue" status', () => {
      expect(getActionLabel('overdue', localise)).toBe(
        'reports:actionCreateDraft'
      )
    })

    it('returns "Review and submit" action for "ready_to_submit" status', () => {
      expect(getActionLabel('ready_to_submit', localise)).toBe(
        'reports:actionReviewAndSubmit'
      )
    })

    it('returns "Review and create draft" action for "requires_resubmission" status', () => {
      expect(getActionLabel('requires_resubmission', localise)).toBe(
        'reports:actionReviewAndCreateDraft'
      )
    })
  })
})
