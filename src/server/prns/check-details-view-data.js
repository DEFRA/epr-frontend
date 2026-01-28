import { getNoteType } from './helpers/get-note-type.js'

/**
 * Build view data for the check PRN/PERN details page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {object} options.accreditation
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {object} options.prnData
 * @returns {object}
 */
export function buildCheckDetailsViewData(
  request,
  { registration, accreditation, organisationId, registrationId, prnData = {} }
) {
  const { t: localise } = request
  const noteType = getNoteType(registration)

  const pageTitle = localise(`prns:checkDetails:${noteType}:pageTitle`)

  return {
    pageTitle,
    heading: pageTitle,
    leadParagraph: localise(`prns:checkDetails:${noteType}:leadParagraph`),
    insetText: localise('prns:checkDetails:insetText'),
    prnDetailsHeading: localise(`prns:checkDetails:${noteType}:detailsHeading`),
    prnDetails: [
      {
        key: {
          text: localise('prns:checkDetails:recipient'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.recipient ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:tonnage'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.tonnage ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:tonnageInWords'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.tonnageInWords ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:processToBeUsed'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.processToBeUsed ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:decemberWaste'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.decemberWaste ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:issuedDate'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.issuedDate ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:issuedBy'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.issuedBy ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:authorisedBy'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.authorisedBy ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:position'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: prnData.position ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:issuerNotes'),
          classes: 'govuk-!-width-one-half'
        },
        value: {
          text: prnData.issuerNotes || localise('prns:checkDetails:notProvided')
        }
      }
    ],
    accreditationDetailsHeading: localise(
      'prns:checkDetails:accreditationDetailsHeading'
    ),
    accreditationDetails: [
      {
        key: {
          text: localise('prns:checkDetails:material'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: accreditation?.material ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:accreditationNumber'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: accreditation?.accreditationNumber ?? '' }
      },
      {
        key: {
          text: localise('prns:checkDetails:accreditationAddress'),
          classes: 'govuk-!-width-one-half'
        },
        value: { text: accreditation?.address ?? '' }
      }
    ],
    createButtonText: localise(`prns:checkDetails:${noteType}:createButton`),
    cancelButtonText: localise('prns:checkDetails:cancelButton'),
    createUrl: `/organisations/${organisationId}/registrations/${registrationId}/create-prn/check-details`,
    cancelUrl: `/organisations/${organisationId}/registrations/${registrationId}`,
    backUrl: `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
