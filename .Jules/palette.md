## 2025-03-05 - ARIA Labels for Icon-Only Buttons and Inputs
**Learning:** Icon-only buttons (like send, download, or close icons) and bare inputs without adjacent text labels are inaccessible to screen reader users, making critical UI actions undiscoverable. Adding `aria-label` attributes ensures screen readers announce the element's purpose explicitly.
**Action:** Always verify that every `<button>` and `<input>` element has either visible descriptive text or an appropriate `aria-label` attribute in the codebase, especially those relying purely on icons or layout context.
