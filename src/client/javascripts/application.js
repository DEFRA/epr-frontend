import accessibleAutocomplete from 'accessible-autocomplete'
import {
  Accordion,
  Button,
  CharacterCount,
  Checkboxes,
  createAll,
  ErrorSummary,
  Header,
  Radios,
  SkipLink,
  Tabs
} from 'govuk-frontend'

createAll(Accordion)
createAll(Button)
createAll(CharacterCount)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)
createAll(Tabs)

const recipientSelect = document.querySelector('#recipient')
if (recipientSelect) {
  accessibleAutocomplete.enhanceSelectElement({
    defaultValue: '',
    minLength: 2,
    selectElement: recipientSelect,
    showAllValues: false
  })
}

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
