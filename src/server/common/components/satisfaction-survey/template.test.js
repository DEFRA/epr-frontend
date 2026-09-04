import { describe, expect, it } from 'vitest'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { renderComponentDom } from '#server/common/test-helpers/component-helpers.js'

describe('satisfaction survey component', () => {
  const title = 'Help us improve this service'
  const body = 'Tell us about your experience using this service.'
  const linkText = 'Give us your feedback (opens in a new tab)'

  /**
   * @param {string} href
   */
  const render = (href) =>
    renderComponentDom('satisfaction-survey', { href, title, body, linkText })

  it('should invite the user to help improve the service', () => {
    const dom = render('https://survey.example/report')

    expect(getByRole(dom, 'heading', { level: 2, name: title })).toBeDefined()
  })

  it('should say what the feedback is for alongside the link', () => {
    const dom = render('https://survey.example/report')

    expect(getByText(dom, /Tell us about your experience/)).toBeDefined()
  })

  it('should set the body as govuk body text, which the html param does not do for us', () => {
    const dom = render('https://survey.example/report')
    const paragraph = getByText(dom, /Tell us about your experience/)

    expect({
      tag: paragraph.tagName,
      className: paragraph.className
    }).toStrictEqual({ tag: 'P', className: 'govuk-body' })
  })

  it('should put the link on its own line, so it cannot wrap mid-sentence', () => {
    const dom = render('https://survey.example/report')
    const bodyParagraph = getByText(dom, /Tell us about your experience/)
    const linkParagraph = getByRole(dom, 'link', {
      name: linkText
    }).parentElement

    expect({
      linkIsInItsOwnParagraph: linkParagraph !== bodyParagraph,
      linkParagraphClass: linkParagraph.className,
      bodyParagraphHoldsNoLink: bodyParagraph.querySelector('a') === null
    }).toStrictEqual({
      linkIsInItsOwnParagraph: true,
      linkParagraphClass: 'govuk-body',
      bodyParagraphHoldsNoLink: true
    })
  })

  it('should carry the service class that spaces it off the footer', () => {
    const dom = render('https://survey.example/report')
    const panel = getByRole(dom, 'heading', { level: 2, name: title })
      .parentElement.parentElement.parentElement

    expect(panel.classList.contains('app-satisfaction-survey')).toBe(true)
  })

  it('should send the user to the survey in a new tab without handing it the referrer', () => {
    const link = getByRole(render('https://survey.example/report'), 'link', {
      name: linkText
    })

    expect({
      href: link.getAttribute('href'),
      rel: link.getAttribute('rel'),
      target: link.getAttribute('target')
    }).toStrictEqual({
      href: 'https://survey.example/report',
      rel: 'noopener noreferrer',
      target: '_blank'
    })
  })

  it('should ask nothing when there is no survey to send the user to', () => {
    expect(queryByText(render(''), title)).toBeNull()
  })
})
