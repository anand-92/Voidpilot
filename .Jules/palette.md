## 2025-03-05 - ARIA Labels for Icon-Only Buttons and Inputs
**Learning:** Icon-only buttons (like send, download, or close icons) and bare inputs without adjacent text labels are inaccessible to screen reader users, making critical UI actions undiscoverable. Adding `aria-label` attributes ensures screen readers announce the element's purpose explicitly.
**Action:** Always verify that every `<button>` and `<input>` element has either visible descriptive text or an appropriate `aria-label` attribute in the codebase, especially those relying purely on icons or layout context.

## 2025-03-10 - Keyboard Navigation for Hover-Only Actions
**Learning:** Actions that are revealed on hover (using `opacity-0` and `group-hover:opacity-100`) are invisible to keyboard users who navigate via <kbd>Tab</kbd>. Furthermore, custom interactive elements (like `div[role="button"]`) with `tabIndex={0}` often miss default browser focus outlines.
**Action:** Always add `focus-visible:opacity-100` and `focus-visible:ring-2` to hover-revealed buttons, and ensure any custom `tabIndex={0}` element has clear `focus-visible` styles. Also, provide specific `aria-label` descriptions (e.g., "Download [filename]") rather than generic ones.
