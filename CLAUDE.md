# CLAUDE.md — AI Agent Instructions

> **Master control file for Claude Code**
> This file is read BEFORE every interaction. It orchestrates all other documentation files.

---

## 📚 Project Documentation Structure

This project uses a **dual-guide system**:

| File                    | Purpose                               | When to Read         |
|-------------------------|---------------------------------------|----------------------|
| **DESIGN_SYSTEM_TEMPLATE_EN.md**    | UI/UX standards, visual design rules  | Frontend tasks       |
| **ENGINEERING_GUIDE.md** | Code quality, architecture, tests    | Backend/Logic tasks  |
| **DEPLOY.md**           | VPS deploy instructions, SSH, PM2     | Any deploy task      |
| **CLAUDE.md (this)**    | Workflow orchestration                | Always (first)       |

> ⚠️ **Деплой: только на VPS (185.202.172.59), НЕ на Netlify.**
> Перед любым деплоем читать **DEPLOY.md**.

### 🎯 Decision Tree:

```
User Request
    │
    ├─ Is it UI/Visual?
    │   └─> Read DESIGN_SYSTEM_TEMPLATE_EN.md
    │
    ├─ Is it Logic/Architecture?
    │   └─> Read ENGINEERING_GUIDE.md
    │
    └─ Is it Both? (e.g. "Build login form with validation")
        └─> Read BOTH files
```

---

## 🔄 Workflow: Plan → Review → Implement

### Step 1: Understand Request

Ask clarifying questions:
- What is the **main goal**?
- Is this **BIG** (multi-file, complex) or **SMALL** (one component, quick fix)?
- Are there any **constraints** (time, performance, compatibility)?

### Step 2: Read Relevant Docs

**Always read:**
- This file (CLAUDE.md)

**Conditionally read:**
- **Frontend task?** → Read `DESIGN_SYSTEM_TEMPLATE_EN.md`
- **Backend/Logic task?** → Read `ENGINEERING_GUIDE.md`
- **Full-stack feature?** → Read **BOTH**

### Step 3: Plan (Before Coding)

**For BIG changes:**
1. Outline approach
2. Identify affected files
3. List potential issues
4. Present plan to user
5. **Wait for approval**

**For SMALL changes:**
1. Quick sanity check
2. Proceed if obvious

### Step 4: Implement

- Write code following all guidelines
- Run tests after each change
- Commit with clear messages

### Step 5: Review

- Check against DESIGN_SYSTEM_TEMPLATE_EN.md (if frontend)
- Check against ENGINEERING_GUIDE.md (if backend)
- Run full test suite
- Fix any issues

---

## 🎨 Frontend Tasks (DESIGN_SYSTEM_TEMPLATE_EN.md)

**Trigger words:** UI, component, page, design, layout, style, animation

**What to check in DESIGN_SYSTEM_TEMPLATE_EN.md:**
1. Color palette (never use default Tailwind colors)
2. Typography (headings, body text, tracking)
3. Spacing system (padding, gaps, vertical rhythm)
4. Component patterns (buttons, cards, navigation)
5. Animation rules (GSAP patterns, CSS transitions)
6. Image treatment (aspect ratios, overlays)

**Example:**
```
User: "Create a product card"

You:
1. Read DESIGN_SYSTEM_TEMPLATE_EN.md
2. Find "Component Patterns → Product Card"
3. Use exact structure (aspect-[4/5], hover scale-105, etc.)
4. Follow color tokens from palette
5. Implement
```

---

## 🔧 Backend/Logic Tasks (ENGINEERING_GUIDE.md)

**Trigger words:** API, database, optimization, refactor, test, architecture

**What to check in ENGINEERING_GUIDE.md:**
1. Architecture patterns
2. DRY violations
3. Error handling requirements
4. Test coverage expectations
5. Performance budgets

**Example:**
```
User: "Optimize the user query"

You:
1. Read ENGINEERING_GUIDE.md → Performance Review section
2. Check for N+1 queries
3. Review caching opportunities
4. Present 2-3 options with tradeoffs
5. Wait for approval
6. Implement chosen option
```

---

## 🚀 Full-Stack Tasks (BOTH Files)

**Examples:**
- Build login form with validation
- Create checkout flow with animations
- Implement comment system with real-time updates

**Process:**
1. Read DESIGN_SYSTEM_TEMPLATE_EN.md for UI patterns
2. Read ENGINEERING_GUIDE.md for logic/validation patterns
3. Combine both approaches
4. Present integrated plan

---

## ⚙️ Global Rules (Always Apply)

### Code Quality

1. **DRY (Don't Repeat Yourself)**
   - Extract shared logic
   - Use utilities/hooks for common patterns
   - One source of truth for constants

2. **Mobile-First**
   - Default classes for mobile
   - Use `md:` and `lg:` for desktop

3. **Semantic HTML**
   - Use `<nav>`, `<main>`, `<article>`, `<section>`
   - Proper heading hierarchy (`<h1>` → `<h6>`)

4. **Accessibility (A11y)**
   - All images have `alt` text
   - Buttons have `aria-label` if no visible text
   - Use `focus-visible:ring-2` for keyboard navigation

5. **Error Handling**
   - Always handle errors (try/catch, `.catch()`)
   - User-friendly error messages
   - Log errors for debugging

### Performance

1. **Animations**
   - Only animate `transform` and `opacity`
   - Never use `transition-all` on large blocks
   - Use GPU-accelerated properties

2. **Images**
   - Always use `object-cover`
   - Container must have `overflow-hidden`
   - Lazy load below the fold

3. **Bundle Size**
   - Code split routes
   - Lazy import heavy libraries
   - Tree-shake unused code

### Testing

1. **Before Merging**
   - All new features have tests
   - Run full test suite
   - No failing tests allowed

2. **Test Levels**
   - Unit tests for utilities
   - Integration tests for APIs
   - E2E tests for critical flows

---

## 🛠️ Screenshot Workflow (Puppeteer — CONFIGURED)

> Tooling: [Puppeteer](https://pptr.dev/) via `screenshot.mjs`.
> Captures **desktop (1440×900)** and **mobile (390×844)** full-page shots into `screenshots/`.

**RULE — ALWAYS screenshot after creating/changing a DESIGN.**
Every time a static UI is built or modified (page, component, layout, style),
run a screenshot to verify the result.

**RULE — NEVER screenshot ANIMATIONS.**
A still frame cannot capture motion. For GSAP reveals, Lenis scroll, parallax,
or hover transitions → verify in the live browser, do NOT rely on screenshots.

**Process:**
1. Start local dev server (`npm run dev`)
2. Screenshot: `node screenshot.mjs <url> <name>` (or `npm run shot -- <url> <name>`)
   - both viewports by default; `--desktop-only` / `--mobile-only` to restrict
3. Read the PNG(s) in `screenshots/`, compare against DESIGN_SYSTEM + reference
4. Identify mismatches → fix → re-screenshot
5. Repeat until match or user approves

**When to SKIP screenshot:**
- Animated components (motion can't be captured — see rule above)
- User explicitly says "no screenshot loop"
- Quick prototype/test with no visual surface

---

## 📋 Response Format

### For Planning Phase:

```markdown
## 🎯 Plan for [Task Name]

**Scope:** BIG / SMALL

**Files to modify:**
- [file1.jsx]
- [file2.js]

**Approach:**
1. [Step 1]
2. [Step 2]

**Potential issues:**
- [Issue 1]: [How we'll handle it]

**Estimated effort:** [Low/Med/High]

Proceed? [Y/N]
```

### For Implementation Phase:

```markdown
✅ Implemented [Feature]

**Changes:**
- [file]: [what changed]

**Tests added:**
- [test description]

**Next steps:**
- [if any]
```

### For Review Phase:

```markdown
🔍 Review Complete

**Design compliance:** ✅ / ⚠️
- [Check 1]: [Status]

**Code quality:** ✅ / ⚠️
- [Check 1]: [Status]

**Issues found:** [count]
1. [Issue]: [Recommendation]

Action needed: [Yes/No]
```

---

## 🚫 Never Do (Hard Rules)

1. **Don't break existing design**
   - Follow DESIGN_SYSTEM_TEMPLATE_EN.md patterns
   - Don't introduce new colors without approval
   - Don't change typography arbitrarily

2. **Don't skip tests**
   - Every new feature needs tests
   - No "I'll add tests later"

3. **Don't use default Tailwind colors**
   - blue-500, indigo-600, etc. are FORBIDDEN
   - Use custom palette from DESIGN_SYSTEM_TEMPLATE_EN.md

4. **Don't assume**
   - When in doubt, ask
   - Present options, not assumptions
   - Get approval for breaking changes

5. **Don't over-engineer**
   - YAGNI (You Aren't Gonna Need It)
   - Solve current problem, not hypothetical future ones
   - Balance pragmatism with quality

---

## 🎯 Start Each Session

When user starts a new task, respond with:

```
📋 Task received: [Task summary]

Before I proceed:
1. Is this a **BIG** or **SMALL** change?
2. Any specific constraints?

I'll read:
- ✅ CLAUDE.md (this file)
- [ ] DESIGN_SYSTEM_TEMPLATE_EN.md (if frontend)
- [ ] ENGINEERING_GUIDE.md (if backend/logic)

Ready to plan once you confirm scope.
```

---

## 🔄 Update Process

**When to update this file:**
- New major design pattern established
- New engineering principle adopted
- Workflow changes
- New tools/libraries added to stack

**How to update:**
```
Update CLAUDE.md to reflect [change description].
Document the new rule under [section].
```

---

**This file is the single source of truth for Claude Code behavior.**

*Last updated: [Date]*
