import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { SUBMISSION_STATUS } from '../constants.js'
import { buildStatusTagHtml } from './build-status-tag-html.js'

const localise = createMockLocalise({
  'reports:statusDue': 'Due',
  'reports:statusOverdue': 'Overdue',
  'reports:statusInProgress': 'In progress',
  'reports:statusReadyToSubmit': 'Ready to submit',
  'reports:statusSubmitted': 'Submitted',
  'reports:statusRequiresResubmission': 'Requires resubmission',
  'reports:statusResubmitted': 'Resubmitted'
})

const FIRST_SUBMISSION = 1
const SECOND_SUBMISSION = 2

describe(buildStatusTagHtml, () => {
  it('reads a due period as an orange tag', () => {
    expect(
      buildStatusTagHtml(SUBMISSION_STATUS.DUE, localise, FIRST_SUBMISSION)
    ).toBe('<strong class="govuk-tag govuk-tag--orange">Due</strong>')
  })

  it('reads an overdue period as a red tag', () => {
    expect(
      buildStatusTagHtml(SUBMISSION_STATUS.OVERDUE, localise, FIRST_SUBMISSION)
    ).toBe('<strong class="govuk-tag govuk-tag--red">Overdue</strong>')
  })

  it('reads a period in progress as a yellow tag', () => {
    expect(
      buildStatusTagHtml(
        SUBMISSION_STATUS.IN_PROGRESS,
        localise,
        FIRST_SUBMISSION
      )
    ).toBe('<strong class="govuk-tag govuk-tag--yellow">In progress</strong>')
  })

  it('reads a period ready to submit as the default blue tag, which carries no modifier class', () => {
    expect(
      buildStatusTagHtml(
        SUBMISSION_STATUS.READY_TO_SUBMIT,
        localise,
        FIRST_SUBMISSION
      )
    ).toBe('<strong class="govuk-tag ">Ready to submit</strong>')
  })

  it('reads a submitted period as a green tag', () => {
    expect(
      buildStatusTagHtml(
        SUBMISSION_STATUS.SUBMITTED,
        localise,
        FIRST_SUBMISSION
      )
    ).toBe('<strong class="govuk-tag govuk-tag--green">Submitted</strong>')
  })

  it('reads a period requiring resubmission as a purple tag that may run wide', () => {
    expect(
      buildStatusTagHtml(
        SUBMISSION_STATUS.REQUIRES_RESUBMISSION,
        localise,
        FIRST_SUBMISSION
      )
    ).toBe(
      '<strong class="govuk-tag govuk-tag--purple epr-tag--no-max-width">Requires resubmission</strong>'
    )
  })

  it('reads a later submission as resubmitted, staying green', () => {
    expect(
      buildStatusTagHtml(
        SUBMISSION_STATUS.SUBMITTED,
        localise,
        SECOND_SUBMISSION
      )
    ).toBe('<strong class="govuk-tag govuk-tag--green">Resubmitted</strong>')
  })

  it('does not read a later submission of an unsubmitted period as resubmitted', () => {
    expect(
      buildStatusTagHtml(SUBMISSION_STATUS.DUE, localise, SECOND_SUBMISSION)
    ).toBe('<strong class="govuk-tag govuk-tag--orange">Due</strong>')
  })

  it('escapes a label that carries markup', () => {
    const shouty = createMockLocalise({ 'reports:statusDue': '<b>Due</b>' })

    expect(
      buildStatusTagHtml(SUBMISSION_STATUS.DUE, shouty, FIRST_SUBMISSION)
    ).toContain('&lt;b&gt;Due&lt;/b&gt;')
  })
})
