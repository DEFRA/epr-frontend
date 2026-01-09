import {
  createAll,
  Accordion,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'

createAll(Accordion)
createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

/**
 * Initialises CDP upload form error handling.
 * Intercepts form submission to handle CDP uploader errors gracefully,
 * redirecting to a user-friendly error page instead of displaying raw JSON.
 */
function initCdpUploadHandler() {
  const form = document.querySelector('form[data-success-url][data-error-url]')

  if (!form) {
    return
  }

  const successUrl = form.dataset.successUrl
  const errorUrl = form.dataset.errorUrl

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const formData = new FormData(form)

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      })

      if (response.type === 'opaqueredirect') {
        // CDP returned a redirect (success) - go to success URL
        window.location.href = successUrl
      } else {
        // CDP returned an error response - go to error URL
        window.location.href = errorUrl
      }
    } catch {
      // Network or CORS error - go to error URL
      window.location.href = errorUrl
    }
  })
}

initCdpUploadHandler()
