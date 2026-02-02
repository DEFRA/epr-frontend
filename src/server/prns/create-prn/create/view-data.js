/**
 * @typedef {object} CreateViewDataOptions
 * @property {{wasteProcessingType: string}} registration
 * @property {Array<{value: string, text: string}>} recipients
 * @property {string} organisationId
 * @property {string} registrationId
 * @property {Record<string, {text: string}>} [errors]
 * @property {{tonnage?: string, recipient?: string, notes?: string}} [values]
 */

/**
 * Build view data for the create PRN/PERN page
 * @param {Request} request
 * @param {CreateViewDataOptions} options
 * @returns {object}
 */
export function buildCreateViewData(
  request,
  { errors, organisationId, recipients, registration, registrationId, values }
) {
  const { t: localise } = request
  const noteType =
    registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

  const pageTitle = localise(`prns:create:${noteType}:pageTitle`)

  const recipientItems = [
    { value: '', text: localise('prns:selectOption') },
    ...recipients
  ].map((item) => ({
    ...item,
    selected: values?.recipient === item.value
  }))

  const backUrl = `/organisations/${organisationId}/registrations/${registrationId}`

  const viewData = {
    backUrl,
    pageTitle,
    heading: pageTitle,
    tonnage: {
      label: localise(`prns:create:${noteType}:tonnageLabel`),
      hint: localise('prns:create:tonnageHint'),
      suffix: localise('prns:create:tonnageSuffix'),
      value: values?.tonnage ?? '',
      errorMessage: errors?.tonnage
    },
    recipient: {
      label: localise(`prns:create:${noteType}:recipientLabel`),
      hint: localise('prns:create:recipientHint'),
      items: recipientItems,
      errorMessage: errors?.recipient
    },
    help: {
      summary: localise('prns:create:helpSummary'),
      intro: localise(`prns:create:${noteType}:help:intro`),
      listIntro: localise(`prns:create:${noteType}:help:listIntro`),
      listItems: [
        localise(`prns:create:${noteType}:help:listItemOne`),
        localise(`prns:create:${noteType}:help:listItemTwo`)
      ]
    },
    notes: {
      label: localise('prns:create:notesLabel'),
      hint: localise(`prns:create:${noteType}:notesHint`),
      value: values?.notes ?? '',
      errorMessage: errors?.notes
    }
  }

  if (errors) {
    viewData.errorSummary = Object.entries(errors).map(
      ([fieldName, error]) => ({
        text: error.text,
        href: `#${fieldName}`
      })
    )
  }

  return viewData
}

/**
 * @import { Request } from '@hapi/hapi'
 */
