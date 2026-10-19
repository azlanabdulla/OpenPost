# Good First Issues for New Contributors

Welcome to OpenPost! If you are looking to make your first open-source contribution, here are ten realistic, well-scoped issues ready for implementation.

---

### Issue 1: Add "Duplicate Tab" Keyboard Shortcut (`Ctrl+Shift+D` / `Cmd+Shift+D`)
- **Category**: Frontend Ergonomics
- **Files**:
  - `src/App.tsx` (Global keyboard listener)
  - `src/stores/requestStore.ts` (`duplicateTab` action)
- **Description**: Add a global shortcut allowing developers to quickly duplicate their active request tab.
- **Acceptance Criteria**:
  - Pressing `Ctrl+Shift+D` (or `Cmd+Shift+D` on macOS) duplicates the active tab.
  - The duplicated tab receives a unique tab ID and is marked dirty.
  - Add unit test in `tests/requestStore.test.ts`.

---

### Issue 2: Quick Filter by Method in History Panel
- **Category**: UI / UX Enhancement
- **Files**:
  - `src/components/layout/Sidebar.tsx` (History tab section)
  - `src/stores/historyStore.ts`
- **Description**: Allow filtering history entries by HTTP verb (`ALL`, `GET`, `POST`, `PUT`, `DELETE`).
- **Acceptance Criteria**:
  - Displays filter chips above the history list.
  - Clicking a chip filters visible items without re-fetching from SQLite.
  - Add unit test in `tests/historyPanel.test.tsx`.

---

### Issue 3: Auto-Prettify JSON on Paste in Request Body
- **Category**: Editor Ergonomics
- **Files**:
  - `src/components/request/BodyEditor.tsx`
  - `src/components/modals/SettingsModal.tsx`
- **Description**: Provide an optional toggle in Application Settings to automatically run JSON formatting when valid JSON is pasted into the raw body editor.
- **Acceptance Criteria**:
  - Toggle added in Settings -> Network & Request Defaults: "Auto-format JSON on paste".
  - If enabled and pasted content parses as valid JSON, reformat with 2-space indentation.
  - If content has syntax errors, preserve raw text without error popups until user finishes editing.

---

### Issue 4: Dynamic Response Size Formatter (B, KB, MB)
- **Category**: Polish & Formatting
- **Files**:
  - `src/components/response/ResponseViewer.tsx`
- **Description**: Improve the response header metadata pill to display human-readable sizes (e.g. `412 B`, `14.2 KB`, `2.1 MB`) with the exact byte count shown on hover tooltip.
- **Acceptance Criteria**:
  - Formats numbers `< 1024` as `X B`.
  - Formats numbers `< 1024 * 1024` as `X.X KB`.
  - Formats numbers `>= 1024 * 1024` as `X.XX MB`.
  - Native HTML `title` tooltip shows `X bytes`.

---

### Issue 5: Add "Clear All Headers" Action Button
- **Category**: Workspace Efficiency
- **Files**:
  - `src/components/request/RequestBuilder.tsx`
  - `src/stores/requestStore.ts`
- **Description**: When testing endpoints with dozens of headers, clearing them one-by-one is tedious. Add a "Clear All" button with an 8-second undo toast.
- **Acceptance Criteria**:
  - Small text button "Clear" next to Headers count badge.
  - Clicking it clears all non-default user headers.
  - Dispatches an undo toast via `useToastStore` allowing the user to restore previous headers within 8 seconds.

---

### Issue 6: Response Header Search Filter in Headers Table
- **Category**: Inspection & Search
- **Files**:
  - `src/components/response/ResponseViewer.tsx`
- **Description**: When inspecting responses with 30+ HTTP headers (CORS headers, security policies, cache tags), finding a specific header requires manual scrolling. Add an inline text filter in the Headers tab.
- **Acceptance Criteria**:
  - Text search input at the top of the response Headers table.
  - Dynamically filters header rows by case-insensitive name or value match.
  - Displays "No matching headers found" when filter has 0 matches.

---

### Issue 7: Copy as cURL Single-Quote / PowerShell Escaping Option
- **Category**: Developer Productivity
- **Files**:
  - `src/utils/curlParser.ts`
  - `src/components/request/UrlBar.tsx`
- **Description**: Currently "Copy as cURL" formats arguments using standard POSIX single-quotes. On Windows PowerShell, multi-line backticks or standard double quotes are often preferred.
- **Acceptance Criteria**:
  - Dropdown or context menu option on "Copy as cURL": "Copy for Bash / POSIX" vs "Copy for PowerShell".
  - Properly escapes quotes and special characters for PowerShell without breaking POSIX behavior.
  - Add unit test in `tests/curlParser.test.ts`.

---

### Issue 8: Environment Variable Preview Hover Card in URL Bar
- **Category**: Developer Ergonomics
- **Files**:
  - `src/components/request/UrlBar.tsx`
  - `src/stores/environmentStore.ts`
- **Description**: When typing `{{baseUrl}}` or `{{authToken}}` in the URL bar, hovering over the variable token should display a subtle tooltip showing the currently active resolved value or a warning if undefined.
- **Acceptance Criteria**:
  - Shows resolved variable value on hover.
  - If variable is secret, displays `••••••••` with a reveal button.
  - If undefined, highlights in amber with "Undefined variable" hint.

---

### Issue 9: Response Time Color Coding
- **Category**: Visual Polish
- **Files**:
  - `src/components/response/ResponseViewer.tsx`
  - `src/components/layout/Footer.tsx`
- **Description**: Color-code the duration badge in the response viewer and footer according to performance latency thresholds:
  - `< 200 ms`: Green (`emerald-400`)
  - `200 ms - 1000 ms`: Amber (`amber-400`)
  - `> 1000 ms`: Rose / Red (`rose-400`)
- **Acceptance Criteria**:
  - Color updates dynamically based on `response.durationMs`.
  - Accessible in both Dark and Light themes with WCAG AA contrast.

---

### Issue 10: Export History to HAR (HTTP Archive) Format
- **Category**: Interoperability
- **Files**:
  - `src/components/modals/ExportModal.tsx`
  - `src/stores/historyStore.ts`
- **Description**: Allow exporting recent history records to standard HTTP Archive (`.har`) format for import into browser DevTools or performance profiling tools.
- **Acceptance Criteria**:
  - Add "HAR 1.2" format option in the Export Modal.
  - Masks secret tokens and credentials unless user explicitly unchecks "Exclude Secrets".
  - Validated against the official HAR 1.2 JSON schema specification.
