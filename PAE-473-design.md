# PAE-473: Check Before You Submit Page - Design

## Summary

Add a "check before you submit" page to the summary log journey. Users see this page when their uploaded summary log passes validation.

## Scope

Implement static page content only. Future tickets will add:

- Dynamic load counts and validation concerns
- Form submission handling
- Waste balance section with actual data

## Route Changes

### Current Structure

- `/summary-logs/upload` - Upload page
- `/summary-logs/{summaryLogId}/progress` - Progress polling page

### New Structure

- `/summary-logs/upload` - Upload page (unchanged)
- `/summary-logs/{summaryLogId}` - Status page (renamed from `/progress`)

The status page renders different views based on backend summary log status.

## Module Refactoring

Rename `summary-log-upload-progress` to `summary-log`:

- Directory: `src/server/summary-log-upload-progress/` → `src/server/summary-log/`
- Plugin name: `summary-log-upload-progress` → `summary-log`
- Translation namespace: `summary-log-upload-progress` → `summary-log`

## Status-Based Rendering

The controller fetches status from backend and renders accordingly:

| Status          | View           | Behaviour                                       |
| --------------- | -------------- | ----------------------------------------------- |
| `preprocessing` | `progress.njk` | Show processing message, poll every 3 seconds   |
| `validating`    | `progress.njk` | Show processing message, poll every 3 seconds   |
| `validated`     | `check.njk`    | Show check page (PAE-473), no polling           |
| `submitted`     | `check.njk`    | Show check page (same as validated), no polling |
| `rejected`      | Redirect       | Redirect to upload page with error in session   |
| `invalid`       | `progress.njk` | Show error message, no polling                  |

## Template Structure

### progress.njk

Existing template (rename from `index.njk`):

- Shows processing states with polling
- Shows error states without polling

### check.njk (new)

Static content for validated submissions:

- Page heading: "Check before you submit"
- Introduction text about validation
- Compliance section with regulatory warning
- Declaration section with confirmation bullet points
- Two buttons:
  - Primary: "Confirm and submit" (non-functional button element)
  - Secondary: "Re-upload summary log" (link to upload page)

## Translation Keys

File: `src/server/summary-log/en.json`

Rename existing keys from `summary-log-upload-progress:*` to `summary-log:*`.

Add new keys for check page:

- `checkPageTitle` - Page title
- `checkHeading` - Main heading
- `checkIntro` - Introduction text
- `complianceHeading` - "Compliance" heading
- `complianceSubheading` - Regulatory warning subheading
- `complianceBody` - Body text explaining requirements
- `declarationHeading` - "Declaration" heading
- `declarationIntro` - Text before bullet points
- `declarationBullet1` - First confirmation point
- `declarationBullet2` - Second confirmation point
- `confirmButton` - "Confirm and submit"
- `reuploadButton` - "Re-upload summary log"

## Controller Changes

File: `src/server/summary-log/controller.js`

1. Update `VIEW_NAME` constant to `summary-log/progress`
2. Add new constant: `CHECK_VIEW_NAME = 'summary-log/check'`
3. Update `pollUrl` to remove `/progress` suffix
4. When status is `validated` or `submitted`, render `check.njk`:

   ```javascript
   if (
     status === backendSummaryLogStatuses.validated ||
     status === backendSummaryLogStatuses.submitted
   ) {
     return h.view(CHECK_VIEW_NAME, {
       pageTitle: localise('summary-log:checkPageTitle'),
       heading: localise('summary-log:checkHeading')
     })
   }
   ```

## Files to Update

### Create

- `src/server/summary-log/check.njk` - New check page template

### Rename

- `src/server/summary-log-upload-progress/` → `src/server/summary-log/`
- `src/server/summary-log/index.njk` → `src/server/summary-log/progress.njk`

### Modify

- `src/server/summary-log/index.js` - Update route path and plugin name
- `src/server/summary-log/controller.js` - Add check page rendering
- `src/server/summary-log/en.json` - Update namespace and add keys
- `src/server/summary-log/controller.test.js` - Update tests for new behaviour
- `src/server/router.js` - Update plugin registration
- `src/server/summary-log-upload/controller.js` - Update redirect URL

## Test Strategy

Update existing tests in `controller.test.js`:

1. Change test URLs to remove `/progress` suffix
2. Update `validated` status tests to expect check page content
3. Update `submitted` status tests to expect check page content
4. Verify check page contains:
   - "Check before you submit" heading
   - Compliance section
   - Declaration section
   - Both buttons
5. Verify check page does not poll (no refresh meta tag)
6. Update URL references in other tests (upload controller)

All tests must pass with 100% coverage (enforced by pre-commit hook).

## Acceptance Criteria

**AC1**: When summary log status is `validated`, display check page.

**AC2**: Direct URL access when status is not `validated` shows appropriate view (progress, error, or redirect).

## Implementation Notes

- Use British English in all content (e.g. "recognise" not "recognize")
- Follow existing GOV.UK component patterns
- No emojis in code or templates
- Button element for "Confirm and submit" (no POST handler yet)
- Link element for "Re-upload summary log"
