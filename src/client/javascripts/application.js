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
 * Prevents stale uploadId errors when user navigates back to upload page.
 * When browser restores the page from bfcache (back-forward cache), the form
 * contains the old uploadId which CDP will reject. Force a reload to get a
 * fresh uploadId from the server.
 */
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload()
  }
})
