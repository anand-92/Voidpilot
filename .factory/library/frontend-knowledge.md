## Frontend Tooling and UI Libraries
- **Framer Motion**: Use `motion.div`, `motion.span`, etc. for animated elements. Do NOT use `motion.create()` inside render cycles — it causes 'Cannot create components during render' lint errors.
- **Framer Motion useScroll**: The `useScroll` hook from `motion/react` no longer supports the `layoutEffect` option. Bypass TypeScript errors with `// @ts-expect-error` if necessary.

- **Type Imports**: In Vite + TypeScript 5, use the inline type modifier for type-only imports (e.g., \import { useState, type ReactNode } from 'react'\) rather than separate \import type\ statements.
