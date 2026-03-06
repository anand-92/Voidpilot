
## $(date +%Y-%m-%d) - Focus Visible and Disabled States in Chat Components
**Learning:** Adding `focus-visible` styles to chat input/buttons, and automatically disabling the Send button when input is empty (with visual feedback via `opacity-50` and `cursor-not-allowed`) are high-value, low-effort UX wins that greatly improve keyboard accessibility and prevent user frustration with empty submissions.
**Action:** Always check form inputs for associated `disabled` states on their submission buttons based on input validity, and ensure all interactive elements have clear `focus-visible` indicators.
