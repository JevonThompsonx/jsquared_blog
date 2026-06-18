# Style Guide

Design tokens, component patterns, and conventions for the J² Adventures blog.

> **Source of truth**: `web/src/app/globals.css` for CSS variables, `docs/CODING.md` for file conventions.

---

## Color Palette

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `linear-gradient(180deg, #f4efe5, #e6e5d8, #d7dfd2)` | Page background |
| `--text-primary` | `#273126` | Headings, body text |
| `--text-secondary` | `#5c6758` | Meta text, descriptions |
| `--card-bg` | `#fcf8f1` | Card surfaces |
| `--primary` | `#4e5f40` | Links, accents |
| `--primary-light` | `#93a780` | Hover states |
| `--btn-bg` | `#3d5427` | Primary button background |
| `--btn-text` | `#c8eb75` | Primary button text |
| `--border` | `#d8d0c1` | Borders, dividers |
| `--spinner` | `#6f865b` | Loading indicators |
| `--selection-bg` | `#6f865b` | Text selection |

### Dark Mode (`[data-theme-mode="dark"]`)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#111812` | Page background |
| `--text-primary` | `#e2e8e0` | Headings, body text |
| `--text-secondary` | `#a0ac9c` | Meta text |
| `--card-bg` | `#1a231b` | Card surfaces |
| `--border` | `#2d382e` | Borders, dividers |
| `--input-bg` | `#161e17` | Input backgrounds |

### Status Colors

| Level | Light | Dark |
|-------|-------|------|
| Info | `#0f766e` | `#67e8f9` |
| Warning | `#b45309` | `#fcd34d` |
| Error | `#ef4444` | `#f87171` |
| Success | `#10b981` | `#34d399` |

Each status has `-soft-bg`, `-soft-border`, and `-text` variants.

---

## Typography

### Font Families

- **Body**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Headings**: `var(--font-lora, Georgia, serif)` — Lora (via next/font) with serif fallback
- **Code**: `"Courier New", Courier, monospace`

### Type Scale

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| `h2` (prose) | `1.75rem` | 700 | |
| `h3` (prose) | `1.375rem` | 600 | |
| `h4` (prose) | `1.125rem` | 600 | |
| Landing title (mobile) | `clamp(1.8rem, 7.5vw, 2.6rem)` | 900 | |
| Landing title (sm) | `3.5rem` | 900 | |
| Landing title (lg) | `4rem` | 900 | |
| Landing subtitle | `1rem` → `1.25rem` (sm) → `1.5rem` (lg) | 300 | |
| Card link | `0.74rem` | — | Uppercase, `0.08em` tracking |
| Hero kicker | `0.72rem` | 700 | Uppercase, `0.16em` tracking |

---

## Spacing & Layout

### Breakpoints (TailwindCSS 4 defaults)

| Name | Min-width |
|------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |

### Common Patterns

- **Page padding**: `p-4 sm:p-5 lg:p-6` (cards), `px-4` (containers)
- **Card padding**: `p-4 sm:p-5 lg:p-6`
- **Section spacing**: `mt-2.5rem` (h2), `mt-2rem` (h3)
- **Navbar height**: ~5rem (scroll-padding-top)
- **Content width**: `min(92vw, 58rem)` (hero shell)

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| Small | `0.25rem` | Chips, marks, code blocks |
| Medium | `0.5rem` | Filter options, pre blocks |
| Standard | `0.75rem` | Filter dropdowns, images |
| Large | `1rem` | Cards, hero note, details |
| XL | `1.25rem` | Mobile welcome text |
| XXL | `1.5rem` | Welcome text panel |
| Full | `999px` | Buttons, pills, nav links |

---

## Shadows

| Token | Value |
|-------|-------|
| `--shadow` | `0 18px 42px rgba(74, 71, 58, 0.12)` |
| `--card-shell-shadow` | `0 14px 34px rgba(66, 62, 50, 0.12)` |
| `--card-shell-shadow-hover` | `0 20px 42px rgba(57, 54, 44, 0.18)` |
| `--hero-shadow` | `0 22px 60px rgba(27, 35, 28, 0.26)` |

---

## Component Patterns

### Post Card (Shell variant)

```tsx
<div className="post-card-shell rounded-xl border p-4 sm:p-5 lg:p-6">
  {/* kicker, title, description, chips, date, link */}
</div>
```

- Uses CSS class `post-card-shell` for theming
- Hover: border color shifts, shadow intensifies, slight translate

### Post Card (Overlay variant)

```tsx
<div className="card-overlay rounded-xl overflow-hidden relative">
  <img />
  <div className="card-overlay-content">
    {/* kicker, title, body, meta, footer */}
  </div>
</div>
```

- Density variants: `data-overlay-density="airy"` | `"grounded"` (default)
- Dark overlay panel with backdrop-filter blur

### Button (Primary CTA)

```tsx
<button className="btn-primary rounded-full px-6 py-3 font-bold">
  {label}
</button>
```

- Uses CSS class `btn-primary` for bg/text colors
- Pill shape via `rounded-full`

### Nav Link Pill

```tsx
<a className="nav-link-pill rounded-full">{label}</a>
```

- Min height 2.75rem, pill shape
- Hover: border-color + primary color + translateY(-1px)

### Hero Note

```tsx
<div className="hero-note rounded-xl border bg-white/8 backdrop-blur">
  {content}
</div>
```

### Form Input

```tsx
<input className="search-input rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[var(--ring)]" />
```

- Uses `.search-input` class for theme-aware bg/color/border

### Filter Dropdown

```tsx
<div className="filter-dropdown rounded-xl border bg-[var(--card-bg)]">
  <button className="filter-dropdown-option" data-state="checked" />
</div>
```

- Animated open/close via `data-state`
- Scroll buttons for long lists

### Details / Thoughts Block

```tsx
<details className="rounded-xl border bg-gradient-to-b from-white/22 to-[var(--accent)]/8">
  <summary className="relative pl-10 font-bold cursor-pointer">
    {title}
  </summary>
  <div className="thoughts-block-content">{content}</div>
</details>
```

- Custom arrow via `::before` pseudo-element
- Rotates 90° when open

---

## Animations

- **Card transitions**: `220ms ease` for border, shadow, transform
- **Filter dropdown**: `150ms ease-out` fade + slide
- **Hover lift**: `translateY(-1px)` on pills, links, cards
- **Reduced motion**: All animations → `0.01ms` via `prefers-reduced-motion: reduce`

---

## Dark Mode

- Applied via `data-theme-mode="dark"` on root element
- Map tiles: `invert(0.88) hue-rotate(180deg) saturate(0.75)` filter
- Navbar: `rgba(18, 27, 21, 0.92)` backdrop
- Cards: `#1a231b` background, `#2d382e` borders

---

## Conventions

- All colors use CSS custom properties (never hardcoded hex in components)
- Status colors have soft-bg, soft-border, and text variants for both themes
- Transitions: `180-220ms ease` for interactive elements
- Border radius: consistent per component type (see scale above)
- Shadows: layered (base + hover) for depth perception
