# Good First Issues for New Contributors

Welcome to OpenPost! If you are looking to make your first open-source contribution, here are five realistic, well-scoped issues ready for implementation.

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
