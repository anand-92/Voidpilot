## 2024-05-15 - Dark Mode Focus Rings over 3D Backgrounds
**Learning:** Found that standard focus rings can get lost when layered over dark, transparent, or complex 3D backgrounds (like the backdrop-blur modals in this app).
**Action:** Always use a combination of `focus-visible:ring-2` with an explicit offset color (e.g., `focus-visible:ring-offset-slate-900`) to ensure keyboard focus states remain visible against dynamic 3D backgrounds.
