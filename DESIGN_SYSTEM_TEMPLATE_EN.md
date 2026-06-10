# [PROJECT NAME] — Design System & Code Guide

> **Single source of truth for design and development.**
> This file should be placed in the project root and used by AI agents (Claude Code/Antigravity) as a reference when creating any new components and pages.

---

## 1. Brand Identity

**Name:** [Company/Website Name]
**Tagline:** [Main Tagline]
**Positioning:** [Brief description of niche, audience, and price segment]
**Language:** [Interface languages, e.g.: en, ru]
**Currency:** [Currency symbol, e.g.: $, €, ₽]

**Brand Tone:** [Describe the mood. Examples:
- "Understated luxury, silence, gallery aesthetics"
- "Bright, dynamic, tech-forward"
- "Minimalist, Scandinavian, eco-friendly"
- "Professional, corporate, reliable"]

---

## 2. Color Palette

### Primary Colors

⚠️ **RULE:** Never use Tailwind default colors (blue-500, red-400, indigo-600). Only custom colors from this table.

| Token        | HEX      | Tailwind Class    | Usage                            |
|--------------|----------|-------------------|----------------------------------|
| `background` | `#[HEX]` | `bg-background`   | Main page background             |
| `primary`    | `#[HEX]` | `text-primary`    | Primary text, headings           |
| `secondary`  | `#[HEX]` | `text-secondary`  | Secondary text                   |
| `accent`     | `#[HEX]` | `text-accent`     | Accents, hovers, buttons         |
| `surface`    | `#[HEX]` | `bg-surface`      | Cards, sections, modals          |

**Palette Examples:**
- Minimalist: `#F7F5F2`, `#333333`, `#C4A265` (beige + dark gray + gold)
- Tech/SaaS: `#0A0E27`, `#F8FAFC`, `#3B82F6` (dark blue + white + blue accent)
- Eco/Natural: `#FEFEFE`, `#1A1A1A`, `#7C9473` (white + black + green)

### CSS Variables (index.css)

```css
:root {
  /* ⚠️ IMPORTANT: RAW RGB format required for Tailwind opacity modifiers
     (e.g., bg-primary/50) */
  --color-background: [R] [G] [B];  /* Example: 247 245 242 */
  --color-primary: [R] [G] [B];
  --color-secondary: [R] [G] [B];
  --color-accent: [R] [G] [B];
  --color-surface: [R] [G] [B];
}

/* Dark Mode (optional) */
html.dark {
  --color-background: [R] [G] [B];
  --color-primary: [R] [G] [B];
  /* ... other colors for dark theme */
}
```

### Opacity Variants Rules

| Pattern              | Application                          |
|----------------------|--------------------------------------|
| `text-primary/80`    | Quotes, lead paragraphs              |
| `text-primary/60`    | Inactive elements, placeholders      |
| `text-primary/40`    | Subheadings, meta information        |
| `border-primary/20`  | Button borders, dividers             |
| `border-primary/10`  | Thin separator lines                 |
| `border-primary/5`   | Barely visible section borders       |

### Forbidden ❌

- Tailwind default colors: `blue-500`, `indigo-600`, `red-400`
- Pure black `#000000` as text color (too harsh)
- Bright saturated colors without brand justification

---

## 3. Typography

### Font Stack

| Role      | Family              | Tailwind        | Weights        |
|-----------|---------------------|-----------------|----------------|
| Headings  | [Heading Font]      | `font-[name]`   | [Weights, e.g.: 300, 400, 600] |
| Body      | [Body Font]         | `font-[name]`   | [Weights, e.g.: 400, 500] |

**Font Selection Recommendations:**
- **Premium/Classic:** Serif for headings (Cormorant Garamond, Playfair Display) + Sans for body (Outfit, Inter)
- **Tech/SaaS:** Sans for everything (Inter, Geist, DM Sans)
- **Creative/Agency:** Display fonts (Bebas Neue, Montserrat) + Sans for body

### Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=[Font1]:wght@[weights]&family=[Font2]:wght@[weights]&display=swap" rel="stylesheet">
```

**Example:**
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
```

### Heading Hierarchy

| Level            | Size                        | Weight           | Tracking           | Use Case             |
|------------------|-----------------------------|------------------|-------------------|----------------------|
| Hero Mega        | `text-[10vw]` – `text-[13vw]` | `font-thin` (300) | `tracking-tighter` | Hero section         |
| Page Heading     | `text-5xl md:text-7xl`      | `font-light` (300) | `tracking-tight`  | Page titles          |
| Section Heading  | `text-4xl md:text-5xl`      | `font-normal` (400) | default          | Section titles       |
| Card Title       | `text-xl md:text-2xl`       | serif default     | default           | Product cards        |
| Subtitle/Label   | `text-xs` – `text-sm`       | `font-sans`       | `tracking-[0.2em]` – `tracking-widest` | Labels, badges |

### Body Text

| Context        | Size        | Weight | Line Height       |
|----------------|------------|--------|-------------------|
| Body default   | `text-base` or `text-sm` | 400 | `leading-relaxed` (1.7) |
| Fine print     | `text-xs`   | 400    | `leading-normal`  |
| Nav links      | `text-xs` – `text-sm` | 400 | default    |

### Typography Rules ✅

1. **Headings — ALWAYS `font-serif`** (if serif chosen for headings), weight `300` or `400`
2. **Body/UI — ALWAYS `font-sans`**
3. **Uppercase** — only for navigation, labels, buttons. NEVER for headings
4. **Italic** — only for accent words within quotes (with `text-accent`)
5. **Heading weight:** NEVER `font-bold` or `font-semibold` for large headings
6. **Precise tracking:**
   - `tracking-tightest` or `tracking-tight` for large headings
   - `tracking-widest` for uppercase
   - `leading-[0.9]` or `leading-none` for Mega headings (removes top spacing)

---

## 4. Spacing System & Layout

### Page Constraints

**No rigid `max-w-7xl`!** Content should breathe.

| Context               | Spacing                |
|-----------------------|------------------------|
| Horizontal padding    | `px-6 md:px-20`        |
| Section vertical      | `py-32` – `py-40`      |
| Grid gap              | `gap-8` – `gap-16`     |
| Card internal         | `space-y-4` – `space-y-6` |

### Vertical Rhythm

- **Between sections:** `py-32` minimum, `py-40` for breathing sections
- **Between elements within section:** `gap-8` – `gap-16`
- **Fine spacing (inside cards):** `pt-4`, `mb-2`, `gap-2`

### Grid System

| Context          | Grid                              |
|------------------|-----------------------------------|
| Product grid     | `grid-cols-1 md:grid-cols-3`      |
| Blog/News grid   | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| Footer layout    | `grid-cols-1 md:grid-cols-12`     |

### Aspect Ratios

| Context         | Ratio               |
|-----------------|---------------------|
| Product cards   | `aspect-[4/5]` or `aspect-square` |
| Hero image      | `h-screen` or `aspect-video` |
| Blog thumbnails | `aspect-video`      |

---

## 5. Animation & Motion (The Premium Feel)

⚠️ **RULE:** Never use `transition-all` on large blocks. Animate **only** `transform` and `opacity` for performance (GPU acceleration).

### Tech Stack

| Library          | Usage                                      |
|------------------|--------------------------------------------|
| GSAP + ScrollTrigger | Scroll animations (reveals, parallax)     |
| Lenis 1.3+       | Smooth page scroll (Desktop)               |
| CSS Transitions  | Hovers and micro-interactions              |
| Framer Motion (optional) | Component-level animations        |

### GSAP Patterns

**Hero Word Entrance (Stagger Reveal):**
```js
gsap.from('.hero-word', {
  y: 150,
  opacity: 0,
  duration: 1.5,
  stagger: 0.1,
  ease: 'power4.out',
  delay: 0.2
});
```

**Parallax Image:**
```js
gsap.to(imageRef.current, {
  yPercent: 30,
  ease: 'none',
  scrollTrigger: {
    trigger: '.container',
    start: 'top top',
    end: 'bottom top',
    scrub: true
  }
});
```

**Batch Reveal (Grid Cards):**
```js
ScrollTrigger.batch('.card', {
  onEnter: batch => gsap.to(batch, {
    opacity: 1,
    y: 0,
    stagger: 0.1,
    overwrite: true
  }),
  start: "top 85%"
});
```

### CSS Hover Pattern (Spring-like)

Add custom easing to `tailwind.config.js`:

```js
transitionTimingFunction: {
  'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
}
```

**Usage:**
```jsx
className="transition-transform duration-700 ease-spring group-hover:scale-105"
```

### CSS Transitions Rules

| Property             | Pattern                                          |
|---------------------|--------------------------------------------------|
| Image hover zoom    | `transition-transform duration-700 ease-out`      |
| Color/opacity hover | `transition-colors duration-300`                  |
| Button hover        | `transition-all duration-300` (buttons only!)     |
| Underline expand    | `transition-all duration-300 ease-out`            |

### Animation Rules ✅

1. Animate **only** `transform` and `opacity`
2. Easing: `power3.out`, `power4.out` for entrance animations
3. Stagger: `0.1s` for grid elements
4. Parallax: `yPercent: 30` maximum
5. Initial state for reveals: `opacity: 0, y: 10–150`
6. **NEVER** `transition-all` on cards/sections

---

## 6. Image Treatment

### Rules ✅

1. **All images:** `object-cover` + container with `overflow-hidden`
2. **Product/Card images:** Fixed aspect ratio container
3. **Placeholder background:** `bg-gray-100` or `bg-neutral-200`
4. **Hover:** `scale-105` via `group-hover`

### Overlay Pattern

**Gradient Overlay (for text readability over photos):**
```jsx
<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
```

**Mix Blend Mode (for creative effects):**
```jsx
<div className="mix-blend-multiply opacity-70" />
```

### Photo Aesthetics

✅ **Use:**
- Unsplash: architecture, minimal interior, nature
- High quality (minimum 1920px width)
- Natural, non-staged shots
- Consistent color grading

❌ **Avoid:**
- Stock people looking at camera
- Clipart, low-quality illustrations
- Bright unnatural filters

---

## 7. Shadows & Depth

### Shadow System

❌ **DON'T use** standard flat shadows (`shadow-md`, `shadow-lg`)

✅ **USE** layered shadows with low opacity:

| Level      | Shadow CSS                                        | Usage            |
|-----------|---------------------------------------------------|------------------|
| Base      | none                                              | Background       |
| Elevated  | `0 10px 30px -5px rgba(0,0,0,0.03)`              | Cards, Header    |
| Floating  | `0 20px 50px -10px rgba(0,0,0,0.08)`             | Modals, Popups   |
| Hover Glow | `0 0 25px rgba([accent-color], 0.5)`             | Buttons on hover |

### Tailwind Config (Custom Shadows)

```js
// tailwind.config.js
boxShadow: {
  'elevated': '0 10px 30px -5px rgba(0,0,0,0.03)',
  'floating': '0 20px 50px -10px rgba(0,0,0,0.08)',
  'glow-accent': '0 0 25px rgba(196, 162, 101, 0.5)', // Replace RGB with your accent
}
```

### Backdrop Blur

For Header/Navbar with transparency:
```jsx
className="bg-background/90 backdrop-blur-md"
```

---

## 8. Interactive States

### Hover Effects

| Element          | Hover Effect                                     |
|------------------|-------------------------------------------------|
| Product image    | `scale-105` (700ms ease-out)                     |
| Card title       | `text-accent`                                    |
| Nav link         | `opacity-100` + underline expands                |
| CTA button       | `bg-primary text-white` or glow shadow           |
| Footer link      | `text-accent` + `border-accent`                  |

### Active State (Current Page)

- Nav: `opacity-100` + underline `w-full`
- Border bottom: `border-b-2 border-accent`

### Focus-Visible (A11y)

All interactive elements must have:
```jsx
className="focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
```

---

## 9. Component Patterns

### CTA Button (Primary)

```jsx
<button className="px-6 py-3 border border-primary/20 bg-transparent text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-300">
  Get Started
</button>
```

### Product Card

```jsx
<div className="group cursor-pointer">
  {/* Image */}
  <div className="aspect-[4/5] overflow-hidden mb-6 bg-gray-100 relative">
    <img
      src="..."
      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      alt="..."
    />
    {/* Hover Overlay */}
    <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
      <span className="text-xs uppercase tracking-widest">View Details</span>
    </div>
  </div>

  {/* Info */}
  <div className="flex justify-between items-start border-t border-primary/10 pt-4">
    <div>
      <h3 className="text-xl font-serif group-hover:text-accent transition-colors mb-1">
        Product Name
      </h3>
      <p className="text-xs uppercase tracking-widest opacity-40">Category</p>
    </div>
    <span className="text-sm font-serif opacity-70">$145</span>
  </div>
</div>
```

### Navigation Link with Underline

```jsx
<a className="text-xs uppercase tracking-[0.2em] relative group py-2 text-primary/60 hover:text-primary">
  Link
  <span className="absolute bottom-0 left-0 h-[1px] bg-accent w-0 group-hover:w-full transition-all duration-300" />
</a>
```

### Section Header Pattern

```jsx
<div className="px-6 md:px-20 mb-16 flex flex-col md:flex-row justify-between items-end gap-8">
  <h2 className="text-5xl md:text-6xl font-serif font-light text-primary">
    Section Title
  </h2>
  <Link className="flex items-center gap-4 group">
    <span className="text-xs uppercase tracking-[0.2em]">View All</span>
    <div className="w-12 h-12 border border-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
      →
    </div>
  </Link>
</div>
```

---

## 10. Development Rules (For AI Agents)

### Critical Rules for Claude Code / Antigravity:

1. **Don't break the design:**
   When asked to add functionality, integrate it **WITHIN** the current design. Preserve padding, font types, hover effects.

2. **Write clean Tailwind:**
   Don't create custom classes in `index.css`, except for global `body`, `@layer utilities`, and animation utilities.

3. **Mobile-First always:**
   Always write default classes for mobile, apply desktop via `md:` or `lg:`.

4. **Accessibility (A11y):**
   - All buttons without text (icons only) must have `aria-label`
   - Use `focus-visible:ring-2` for keyboard navigation
   - Semantic HTML tags (`<nav>`, `<main>`, `<article>`)

5. **Check contrast:**
   Don't write white text on very light background or `text-primary/20` if it blends into an unreadable blur. Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).

6. **Consistency above all:**
   If a product card uses `aspect-[4/5]`, ALL cards must use the same aspect ratio.

---

## 11. Do's & Don'ts

### ✅ DO

- Serif headings (weight 300–400) + Sans body
- Warm/muted palette or clear brand palette
- GSAP for scroll-triggered reveals
- CSS transitions for hover micro-interactions
- `overflow-hidden` on all image containers
- `object-cover` on all images
- Generous whitespace (`py-32+`)
- Subtle opacity transitions (`/60` → `1.0`)

### ❌ DON'T

- Bold headings (`font-bold`, `font-semibold`) for large titles
- Default Tailwind colors (`blue-500`, `indigo-600`)
- `transition-all` on large blocks
- Flat `shadow-md` shadows
- Pure black text (`#000`)
- Cluttered layouts (little breathing room)
- Generic AI design patterns (centered hero with gradient blob)
- Decorative SVG backgrounds without design justification

---

## 12. Tech Stack Summary (optional)

| Technology       | Version | Purpose                            |
|------------------|---------|------------------------------------|
| React            | 19+     | UI framework                       |
| React Router     | 7+      | Client-side routing                |
| Vite             | 7+      | Build tool & dev server            |
| Tailwind CSS     | 3.4+    | Utility-first styling              |
| GSAP             | 3.14+   | Scroll & entrance animations       |
| Lenis            | 1.3+    | Smooth scrolling                   |
| Framer Motion    | 12+     | Component animations (opt.)        |

---

## 13. Tailwind Config Reference

```js
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['"[Your Serif Font]"', 'serif'],
        sans: ['"[Your Sans Font]"', 'sans-serif'],
      },
      letterSpacing: {
        'tightest': '-0.05em',
        'widest-xl': '0.3em',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      boxShadow: {
        'elevated': '0 10px 30px -5px rgba(0,0,0,0.03)',
        'floating': '0 20px 50px -10px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}
```

---

**This document is updated with every significant design change.**

*Last updated: [Date]*
