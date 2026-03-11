# Voidpilot Frontend — Design System & Visual Language

## Overall Vibe

Dark sci-fi meets modern dev-tool aesthetic. The UI leans heavily into **glass morphism**, **neon accent glows**, and **deep navy/black backgrounds**. It feels like a futuristic command center — minimal, technical, and motion-rich. The app is **dark-only** with no light mode.

---

## Color Palette

### Backgrounds (Darkest → Lightest)

| Token / Value         | Usage                          |
|-----------------------|--------------------------------|
| `#060818`             | Primary app background         |
| `#0a0e1f`             | Header / secondary surfaces    |
| `#080c1c`             | Panel backgrounds              |
| `#0b1120`             | Form field backgrounds         |
| `#0c1229`             | Modal backgrounds              |
| `slate-900`, `950`    | Dark interactive surfaces      |
| `slate-700`           | Hover / active states          |

### Text (Lightest → Faintest)

| Token        | Usage              |
|--------------|--------------------|
| `slate-100`  | Primary text       |
| `slate-200`  | Secondary text     |
| `slate-300`  | Tertiary text      |
| `slate-400`  | Muted text         |
| `slate-500`  | Disabled / faint   |

### Accent Colors by Mode

| Mode        | Primary Colors               | Feel                    |
|-------------|------------------------------|-------------------------|
| Live        | Sky blue (`sky-400`–`600`)   | Calm, focused           |
| Brainstorm  | Amber / Orange (`amber-500`, `orange-600`) | Creative, energetic |
| Walkthrough | Violet (`violet-400`–`500`)  | Mystical, vocal         |

### Semantic Colors

- **Success / Allow**: Emerald (`emerald-300`–`600`)
- **Warning**: Amber (`amber-400`–`500`)
- **Danger / End Session**: Rose (`rose-500`–`600`)

### Signature Gradients

```
Sky → Indigo → Violet:  from-sky-500 via-indigo-500 to-violet-500   (primary CTA)
Sky → Indigo:           from-sky-400 to-indigo-500                   (heading accents)
Emerald:                from-emerald-600 to-emerald-500              (success actions)
Amber → Orange:         from-amber-500 to-orange-600                 (brainstorm mode)
White → Slate:          from-white via-slate-200 to-slate-400        (hero text)
```

---

## Glass Morphism

The defining visual pattern. Surfaces layer semi-transparent whites over dark backgrounds with backdrop blur:

```
border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl
```

White opacity values range from `0.02` (barely visible) to `0.14` (noticeable). This creates depth without hard edges.

---

## Typography

**Primary font**: DM Sans (with system fallbacks: Segoe UI Variable Display, Avenir Next, Helvetica, Arial)

| Scale       | Usage                         |
|-------------|-------------------------------|
| `text-[10px]` | Micro labels, indicators    |
| `text-xs`   | Secondary text, metadata      |
| `text-sm`   | Base body text                |
| `text-lg`   | Medium headings               |
| `text-2xl`  | Section headers               |
| `text-5xl`  | Hero headings                 |
| `text-7xl`  | Landing page hero (desktop)   |

**Key weights**: `font-light` (body), `font-semibold` (labels), `font-bold` (headings), `font-black` (hero)

**Spacing**: `tracking-tight` on headers, `tracking-widest` / `tracking-[0.2em]` on uppercase labels

---

## Borders & Rounding

| Radius        | Usage                              |
|---------------|------------------------------------|
| `rounded-lg`  | Small buttons, icons               |
| `rounded-xl`  | Standard cards, components         |
| `rounded-2xl` | Modals, expanded containers        |
| `rounded-3xl` | Large sections, mobile components  |
| `rounded-full`| Pills, toggles, avatars            |

**Default border**: `border border-white/[0.06]` — ghost outlines that barely register but define surfaces.

---

## Shadows & Glows

Shadows are **colored**, not black. They create a neon-glow effect:

```
Sky glow:    shadow-[0_8px_32px_rgba(56,189,248,0.25)]
Strong glow: shadow-[0_12px_40px_rgba(56,189,248,0.35)]
Modal depth: shadow-[0_32px_80px_rgba(0,0,0,0.6)]
```

Buttons get colored `shadow-sky-500/20` or `shadow-emerald-500/20` for mode-appropriate depth.

---

## Animation Patterns

### Framer Motion (Landing Page & Transitions)

- **Entrance**: Fade up (`opacity: 0, y: 20` → `opacity: 1, y: 0`) with staggered delays
- **Section transitions**: Blur + scale + y-offset (`blur(8px)` → `blur(0px)`)
- **Custom easing**: `[0.22, 1, 0.36, 1]` — snappy with a soft landing
- **Hover**: `scale: 1.05`, Tap: `scale: 0.97`

### CSS Animations

- **Rainbow border** (`.rainbow-border`): Rotating conic gradient (3s loop) used on tool response message bubbles
- **Status pulse**: `animate-ping` on emerald/violet status dots
- **Loading spin**: `animate-spin` with `indigo-300`

### Micro-interactions

- Button hover: Scale + brightness shift
- Input focus: Border brightens to `sky-500/40`, background lightens
- Toggle switches: Smooth color + transform
- Custom cursor (landing): Spring physics (`damping: 25, stiffness: 250`), expands 2.5x on hover

---

## Layout Patterns

### Desktop

- **Live mode**: Fixed sidebar (`w-[380px]`) + flexible main area (`flex-1`)
- **Brainstorm**: Chat panel (`flex-[3]`, ~60%) + Workspace panel (`flex-[2]`, ~40%)

### Mobile

- **Brainstorm**: Tab-based switching (Chat ↔ Workspace), no side-by-side
- **Touch targets**: Minimum `44px` height (`min-h-11`, `min-h-12`)
- **Breakpoints**: `sm:` (640px), `md:` (768px), `lg:` (1024px)

### Spacing

Base unit is `4px` (Tailwind default). Common gaps: `gap-2` (8px), `gap-3` (12px), `gap-4` (16px). Generous padding on panels (`p-4` to `p-6`).

---

## Component Recipes

### Glass Card

```
border border-white/[0.06] bg-white/[0.02] p-3.5 rounded-xl backdrop-blur-xl
```

### Primary CTA Button

```
bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500
px-5 py-3.5 rounded-xl text-sm font-bold text-white
shadow-[0_8px_32px_rgba(56,189,248,0.25)]
hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(56,189,248,0.35)]
```

### Message Bubbles

```
User:   bg-sky-600/20 text-sky-100 rounded-2xl
AI:     border border-white/[0.06] bg-white/[0.04] text-slate-200 rounded-2xl
Tool:   .rainbow-border wrapper + bg-[#0a0e1f] inner content
```

### Section Label

```
text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500
```
