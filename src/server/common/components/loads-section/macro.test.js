// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/dom'
import { renderComponent } from '#server/common/test-helpers/component-helpers.js'

const renderToBody = (params) => {
  const $ = renderComponent('loads-section', params)
  document.body.innerHTML = $('body').html()
}

describe('loadsSection component', () => {
  const baseParams = {
    heading: 'Loads received',
    addedHeading: '3 new loads have been added',
    addedDescription: 'These are new loads that have been added to section 1 of your summary log.',
    adjustedHeading: '2 existing loads have been adjusted',
    adjustedDescription: 'These are loads in section 1 of your summary log that have been changed since it was last uploaded.',
    adjusted: { count: 2, rowIds: ['001', '002'] },
    tooManyMessage: 'As there are 100 or more adjusted loads, we are not able to list them all here.',
    showAdjustedLoadsText: 'Show 2 loads',
    rowIdExplanation: "These load numbers are in the 'Row ID' column of your summary log."
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should render the section heading', () => {
    renderToBody(baseParams)

    expect(screen.getByRole('heading', { level: 2, name: 'Loads received' })).toBeInTheDocument()
  })

  it('should render the added loads heading and description', () => {
    renderToBody(baseParams)

    expect(screen.getByRole('heading', { level: 3, name: '3 new loads have been added' })).toBeInTheDocument()
    expect(screen.getByText('These are new loads that have been added to section 1 of your summary log.')).toBeInTheDocument()
  })

  it('should render the adjusted loads heading and description', () => {
    renderToBody(baseParams)

    expect(screen.getByRole('heading', { level: 3, name: '2 existing loads have been adjusted' })).toBeInTheDocument()
    expect(screen.getByText('These are loads in section 1 of your summary log that have been changed since it was last uploaded.')).toBeInTheDocument()
  })

  it('should render the row-id-list when adjusted rows exist', () => {
    renderToBody(baseParams)

    expect(screen.getByText('Show 2 loads')).toBeInTheDocument()
  })

  it('should not render the row-id-list when adjusted total is zero', () => {
    renderToBody({ ...baseParams, adjusted: { count: 0, rowIds: [] } })

    expect(screen.queryByText('Show 2 loads')).not.toBeInTheDocument()
  })
})
