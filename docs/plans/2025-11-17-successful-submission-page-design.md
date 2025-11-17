# Successful Submission Page Design

**Ticket:** PAE-474
**Date:** 2025-11-17
**Status:** Temporary design doc for implementation reference

## Overview

Implement a success confirmation page that displays after a user confirms and submits their validated summary log. This page completes the summary log upload journey.

## User Journey

1. User views "Check before you submit" page (summary log status: `validated`)
2. User clicks "Confirm and submit" button
3. Form POSTs to backend submit endpoint
4. Backend updates summary log status to `submitted`
5. Success page displays confirmation

## Design Decisions

### Submission Flow

**Decision:** Button POSTs to backend submit endpoint, which updates summary log state to `submitted`.

The controller detects the `submitted` status and shows the success page instead of the check page. This follows the existing state-based routing pattern (e.g. `validated` → check page).

### Route Structure

**Decision:** Use dedicated action route for submission.

```
POST /organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/submit
```

This establishes the first internal POST pattern in the codebase. Dedicated action routes are RESTful, explicit, and scale naturally for future actions.

### Data Handling (Race Condition Prevention)

**Decision:** Store POST response data in session, redirect to GET route, use session data to render view.

This prevents race conditions where the GET request might fetch stale data before the backend has updated.

Flow:

1. POST handler calls backend submit endpoint
2. Backend returns updated summary log data (status: `submitted`, accreditation number)
3. POST handler stores this data in session under `freshData` key
4. Redirect to GET route (correct URL in browser)
5. GET handler checks session first:
   - If `freshData` exists → use it to render view, clear from session
   - Otherwise → fetch from backend (normal flow)

### View Routing

**Decision:** GET handler routes based on status.

- `validated` status → shows check page
- `submitted` status → shows success page
- Other statuses → existing progress/error handling

### Error Handling

**Decision:** Let errors bubble up to Hapi's error handling.

If the backend submit call fails, Hapi shows a generic error page. No session-based error storage needed for submission failures.

### Success Page Content

**Decision:** Show only finalised content.

Include:

- Confirmation panel with accreditation number
- Inset text: "To change or add to the information you've provided, submit an updated summary log" (links to upload page)
- "Return to home" link

Exclude:

- Waste balance (calculation not implemented yet per ticket)
- Email confirmation message (not implemented)
- "Submit a report" link (not implemented)
- "Raise a PRN" link (not implemented)

YAGNI: Only implement features that exist and are finalised.

## Implementation Details

### New Files

- `src/server/summary-log/submit-controller.js` - POST handler for submission
- `src/server/summary-log/success.njk` - Success page template
- `src/server/common/helpers/summary-log/submit-summary-log.js` - Backend API call helper

### Modified Files

- `src/server/summary-log/index.js` - Add POST route configuration
- `src/server/summary-log/controller.js` - Add status-based routing to success view
- `src/server/summary-log/en.json` - Add localisation strings

### Backend API Endpoint

```
POST /v1/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/submit
```

Expected response:

```json
{
  "status": "submitted",
  "accreditationNumber": "493021"
}
```

### Localisation Strings

Add to `en.json`:

- `successPageTitle`: "Summary log submitted"
- `successPanelTitle`: "Summary log for accreditation number {{accreditationNumber}} submitted"
- `successInsetText`: Link text for submitting updated summary log
- `returnToHome`: "Return to home"

### Session Management

Session key: `sessionNames.summaryLogs`

Add temporary field:

- `freshData`: Stores POST response data to avoid race condition

The GET handler clears `freshData` after reading it, ensuring subsequent visits fetch fresh data from the backend.

## Testing Strategy

Follow TDD:

1. Write tests for submit helper function
2. Write tests for POST controller
3. Write tests for GET controller status routing
4. Write tests for success view rendering

Test coverage must remain at 100%.

## Future Enhancements

Deferred to later tickets:

- Waste balance calculation and display
- Email confirmation
- "Submit a report" functionality
- "Raise a PRN" functionality
