# OpenPost Pre-Release QA Checklist

This manual QA checklist should be executed before publishing any official release.

---

## 1. Startup & Window Management
- [ ] **Launch**: App launches quickly with no console errors or rust panics.
- [ ] **Initial State**: Shows default request tab ("Get Todo") and placeholder response view ("No Response Yet").
- [ ] **Window Controls**: Minimize, maximize, restore, and resize window work smoothly; minimum dimensions (800x600) enforced.
- [ ] **Theme Toggle**: Switching between Dark and Light mode transitions smoothly with proper contrast.

---

## 2. URL Bar & Method Selector
- [ ] **Empty URL**: Clearing URL disables the Send button; tooltip shows "Please enter a URL to send a request". Pressing Enter does not trigger request.
- [ ] **Missing Protocol**: Entering a bare domain (e.g. `api.example.com`) displays the `+https://` auto-suggest button. Clicking it prepends `https://`.
- [ ] **Method Badges**: Switching methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`) updates the color tag in the URL bar and tab.
- [ ] **Keyboard Shortcut**: `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (macOS) triggers Send.

---

## 3. Two-Way URL & Query Params Sync
- [ ] **URL to Table**: Typing `?page=1&limit=25` into the URL bar immediately populates the Params table with 2 active rows.
- [ ] **Table to URL**: Changing param value in the table immediately updates the URL query string.
- [ ] **Disable Param**: Unchecking the checkbox next to a param strips it from the URL query string while keeping it in the table.
- [ ] **Add / Delete Row**: Clicking "Add Row" creates a blank row; clicking the trash icon removes the row.

---

## 4. Headers & Body
- [ ] **Header Presets**: Clicking `+Accept`, `+Content-Type`, `+User-Agent` adds or enables headers in the table.
- [ ] **JSON Body**:
  - [ ] Entering valid JSON renders without errors; clicking "Prettify" reformats JSON.
  - [ ] Entering invalid JSON displays the `OP-BODY-001` badge with exact line and column number.
- [ ] **x-www-form-urlencoded**: Key-value rows correctly serialize to form payload.
- [ ] **multipart form-data**: Supports text and file rows.

---

## 5. Auth Helpers & Security
- [ ] **Bearer Token**: Token value is masked with dots; clicking the eye icon toggles plain text visibility.
- [ ] **Basic Auth**: Username and password fields work with eye toggle for password.
- [ ] **API Key**: Key and value can be added to Header or Query params.
- [ ] **Secret Protection**: Verify Authorization, Cookie, and API keys are never printed in plain text in logs or error dialogs.

---

## 6. Execution & Response Viewer
- [ ] **Successful Request**: `200 OK` displays green status badge, elapsed time in ms, and response size.
- [ ] **JSON Syntax Highlighting**: Formatted JSON displays in CodeMirror with line numbers and folding.
- [ ] **Raw & Headers View**: Switching between Pretty, Raw, and Headers tabs displays accurate content.
- [ ] **Copy & Save**: Clicking "Copy" shows "Copied to Clipboard" toast; clicking "Save" downloads the response file.
- [ ] **Status Code Hints**: Verify that 401, 403, 404, 429, and 500 responses show helpful contextual guidance cards.
- [ ] **Request Cancellation**: Clicking Cancel while in-flight terminates request and renders neutral cancellation card with "Send Again" button.
- [ ] **Large Payload**: Requesting payload >2MB displays truncation safety banner with "Show Full" and "Save" options.

---

## 7. Tab Management & Unsaved Changes
- [ ] **New Tab**: Clicking `+` or pressing `Ctrl+T` opens a new tab.
- [ ] **Dirty Indicator**: Editing any tab shows the amber dirty dot `●`.
- [ ] **Unsaved Close Modal**: Clicking `✕` on a dirty tab opens the "Unsaved Changes" modal. Clicking "Cancel" keeps tab open; clicking "Discard & Close" closes it.
- [ ] **Close Shortcut**: Pressing `Ctrl+W` triggers tab close on active tab.
- [ ] **Persistence**: Refreshing the window (`Ctrl+R`) restores active tabs and drafts from local storage.

---

## 8. Error Handling & Recovery
- [ ] **DNS Error**: Requesting an invalid domain shows `OP-NET-001` DNS failure card.
- [ ] **Connection Refused**: Requesting a closed port (e.g. `http://localhost:59999`) shows `OP-NET-002`.
- [ ] **Timeout**: Setting timeout to 100ms on a slow endpoint triggers `OP-NET-003`.
- [ ] **SSL Error**: Self-signed SSL endpoint shows `OP-SSL-001` with one-click "Disable SSL Verification & Retry" button.
- [ ] **ErrorBoundary**: If a render exception is thrown, app displays `OP-SYS-001` crash screen with "Reload" and "Copy Sanitized Diagnostics".

---

## 9. Accessibility (a11y)
- [ ] **Screen Readers**: All icon-only buttons (`+`, `✕`, Theme, Close, Copy) have descriptive `aria-label`s.
- [ ] **Focus Rings**: Tab navigation displays distinct `focus-visible:ring-2` focus rings across interactive inputs.
- [ ] **Toasts**: Announcements use `role="status"` and `aria-live="polite"`.
- [ ] **Modals**: Focus is trapped inside open modal; pressing `Escape` dismisses the modal.

---

## 10. Automated Tests & Build Verification
- [ ] `npm run typecheck` passes with **0 errors**.
- [ ] `npm test` passes **all test suites** (35+ tests).
- [ ] `npm run build` generates production bundle without errors.
