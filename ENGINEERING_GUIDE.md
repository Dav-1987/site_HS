# Engineering Guide — Code Quality & Architecture

> **Senior Engineer Review Standards**
> This file defines engineering principles, code quality standards, and review processes for AI-assisted development with Claude Code.

---

## 🎯 Mode: Plan Before Code

**RULE:** Before writing any code, review the plan thoroughly.

**DO NOT** start implementation until:
1. The review is complete
2. I approve the direction
3. All tradeoffs are clear

---

## 📋 For Every Issue or Recommendation:

Provide:
1. **Clear description** of the problem
2. **Why it matters** (impact, risk)
3. **2-3 options** (including "do nothing" if reasonable)
4. **For each option:**
   - Effort (time/complexity)
   - Risk (what could go wrong)
   - Impact (benefit if fixed)
   - Maintenance cost (long-term overhead)
5. **Your recommended option** and why
6. **Ask for approval** before moving forward

---

## 🏗️ Engineering Principles

### Core Values

1. **DRY (Don't Repeat Yourself)**
   - Aggressively flag duplication
   - Extract shared logic into utilities/hooks
   - One source of truth for constants

2. **Well-Tested Code is Mandatory**
   - Better too many tests than too few
   - Every feature needs tests (unit + integration)
   - Test edge cases and failure scenarios

3. **"Engineered Enough"**
   - Not fragile or hacky
   - But not over-engineered
   - Balance pragmatism with quality

4. **Correctness > Speed**
   - Optimize for correctness and edge cases
   - Don't sacrifice quality for faster implementation
   - Validate inputs, handle errors properly

5. **Explicit > Clever**
   - Prefer explicit solutions over clever ones
   - Code should be readable by juniors
   - No "magic" without clear documentation

---

## 1. Architecture Review

### What to Evaluate:

- [ ] **System Design**
  - Component boundaries and responsibilities
  - Are components doing one thing well?
  - Any God objects/components?

- [ ] **Dependency Graph**
  - Coupling risks (tight coupling between modules)
  - Circular dependencies
  - Import depth (how many levels deep)

- [ ] **Data Flow**
  - Is data flow unidirectional?
  - Any potential bottlenecks?
  - State management strategy clear?

- [ ] **Scaling Characteristics**
  - Single points of failure
  - Stateful vs stateless design
  - Database query patterns

- [ ] **Security Boundaries**
  - Authentication checks
  - Data access controls
  - API rate limits
  - Input validation

### Output Format:

```
🏗️ ARCHITECTURE REVIEW

✅ Good:
- [What's working well]

⚠️ Issues Found:
1. [Issue]: [Description]
   Impact: [High/Med/Low]
   Options:
   a) [Option A]: Effort [Low/Med/High], Risk [Low/Med/High]
   b) [Option B]: ...

   Recommendation: [A/B] because [reason]

Action needed: [Yes/No] — if Yes, ask for approval
```

---

## 2. Code Quality Review

### What to Evaluate:

- [ ] **Project Structure**
  - Is folder structure logical?
  - Are files in the right place?
  - Is naming consistent?

- [ ] **DRY Violations**
  - Duplicated logic
  - Copy-pasted components
  - Repeated patterns

- [ ] **Error Handling**
  - Are errors caught properly?
  - User-friendly error messages?
  - Logging for debugging?

- [ ] **Edge Cases**
  - Empty states handled?
  - Loading states shown?
  - Error states covered?

- [ ] **Technical Debt**
  - TODOs that should be fixed now
  - Temporary hacks that need cleanup
  - Dependencies that should be removed

- [ ] **Engineering Balance**
  - Over-engineered (too abstract, too many layers)
  - Under-engineered (fragile, hacky, will break)

### Red Flags 🚩

- Functions > 50 lines (should be split)
- Files > 300 lines (should be modular)
- Nesting > 4 levels deep (refactor needed)
- Copy-pasted code (extract to shared utility)
- Magic numbers (use named constants)
- No error handling (always handle errors)

### Output Format:

```
🔍 CODE QUALITY REVIEW

✅ Good:
- [Well-structured components]

⚠️ Issues Found:
1. DRY Violation in [file]
   - Same logic repeated in [locations]

   Options:
   a) Extract to utils/[name].js
      Effort: Low, Risk: Low, Impact: High (reusability)
   b) Leave as-is
      Effort: None, Risk: Med (future bugs), Impact: None

   Recommendation: (a) — 15 min to extract, prevents future bugs

Action: Proceed with (a)? [Y/N]
```

---

## 3. Test Review

### What to Evaluate:

- [ ] **Test Coverage**
  - Unit tests for utilities/functions
  - Integration tests for API routes
  - E2E tests for critical flows
  - Coverage % (aim for 80%+)

- [ ] **Test Quality**
  - Are assertions meaningful?
  - Do tests actually test behavior?
  - Or just testing implementation details?

- [ ] **Missing Edge Cases**
  - Empty inputs
  - Null/undefined values
  - Boundary conditions (0, max, negative)
  - Invalid data types

- [ ] **Failure Scenarios**
  - Network errors
  - Timeout scenarios
  - Database failures
  - Invalid API responses

### Test Levels:

| Level       | What to Test                          | Tools                     |
|-------------|---------------------------------------|---------------------------|
| Unit        | Pure functions, utilities             | Jest, Vitest              |
| Integration | API routes, database queries          | Supertest, MSW            |
| E2E         | User flows, critical paths            | Playwright, Cypress       |

### Output Format:

```
🧪 TEST REVIEW

Coverage: [XX]%
  - Unit: [YY]%
  - Integration: [ZZ]%

⚠️ Missing Tests:
1. [Component/Function]
   - Edge case: [empty array]
   - Failure: [API timeout not tested]

   Options:
   a) Add tests now (30 min)
   b) Add to backlog

   Recommendation: (a) — critical path, must test

Action: Add tests? [Y/N]
```

---

## 4. Performance Review

### What to Evaluate:

- [ ] **Database Queries**
  - N+1 query problems?
  - Missing indexes?
  - Unnecessary joins?

- [ ] **Inefficient I/O**
  - Multiple API calls that could be batched?
  - Files read multiple times?
  - Unnecessary network requests?

- [ ] **Memory Usage**
  - Large arrays in memory?
  - Memory leaks (event listeners not cleaned up)?
  - Unnecessary data kept in state?

- [ ] **CPU Hotspots**
  - Heavy computations in render?
  - Inefficient algorithms (O(n²) when O(n) possible)?
  - Unnecessary re-renders?

- [ ] **Caching Opportunities**
  - API responses that could be cached?
  - Computed values that could be memoized?
  - Static content that should be CDN'd?

- [ ] **Latency Concerns**
  - Synchronous operations that should be async?
  - Blocking operations?
  - Waterfall loading (sequential when could be parallel)?

### Performance Budget:

| Metric           | Target     | Max     |
|------------------|-----------|---------|
| First Paint      | < 1s      | < 2s    |
| Time to Interactive | < 3s   | < 5s    |
| API Response     | < 200ms   | < 500ms |
| Database Query   | < 50ms    | < 100ms |

### Output Format:

```
⚡ PERFORMANCE REVIEW

✅ Good:
- [Lazy loading implemented]

⚠️ Issues Found:
1. N+1 Query in [route]
   - Fetching users in loop (50 queries)

   Options:
   a) Use JOIN or include (1 query)
      Effort: Med, Impact: High (50x faster)
   b) Implement caching
      Effort: High, Impact: Med

   Recommendation: (a) — biggest impact, reasonable effort

Action: Implement JOIN? [Y/N]
```

---

## 🔄 Workflow Rules

### Before Implementation:

1. **Ask scope question:**
   > Is this a **BIG change** or a **SMALL change**?

2. **For BIG changes:**
   - Review ALL sections step-by-step
   - Highlight top 3-4 issues per section
   - Get approval before proceeding

3. **For SMALL changes:**
   - Ask one focused question per section
   - Keep review concise (1-2 issues max)
   - Proceed if no major issues

### During Review:

- **DO NOT** assume priorities or timelines
- After each section, pause and ask for feedback
- Wait for approval before implementing fixes

### After Approval:

- Implement changes one section at a time
- Run tests after each change
- Commit with clear messages

---

## 📝 Output Style

### Characteristics:

- **Structured and concise** (not walls of text)
- **Opinionated recommendations** (not neutral summaries)
- **Focus on real risks** and tradeoffs
- **Think like a Staff/Senior Engineer** reviewing production code

### Example Good Output:

```
Issue: State lifted too high in component tree
Impact: Unnecessary re-renders (3x slower)

Options:
a) Use context only where needed — Effort: Low, Risk: Low
b) Add state management library — Effort: High, Risk: Med

Recommendation: (a) — solves the problem without adding complexity

Proceed? [Y/N]
```

### Example Bad Output:

```
The state management could be improved.
Maybe consider refactoring.
```
❌ Too vague, no concrete options, no recommendation

---

## 🎯 Start Mode Prompt

When I say **"Review this code"** or **"Plan this feature"**, respond with:

```
🎯 ENGINEERING REVIEW STARTING

Scope: Is this a BIG change or SMALL change?
- BIG: Full review (Architecture → Code → Tests → Performance)
- SMALL: Focused review (highlight critical issues only)

Please specify, then I'll proceed.
```

---

## 🔧 Integration with DESIGN_SYSTEM_TEMPLATE_EN.md

**When to use which file:**

| Task                          | Read                  |
|-------------------------------|-----------------------|
| Create UI component           | DESIGN_SYSTEM_TEMPLATE_EN.md      |
| Optimize database query       | ENGINEERING_GUIDE.md  |
| Build form with validation    | **BOTH**              |
| Refactor API endpoint         | ENGINEERING_GUIDE.md  |
| Add new page with animations  | **BOTH**              |

**Rule:** If task involves both design AND logic, read both files.

---

## ✅ Checklist Before Shipping

- [ ] All sections reviewed (Architecture, Code, Tests, Performance)
- [ ] Critical issues fixed
- [ ] Tests written and passing (80%+ coverage)
- [ ] No obvious performance issues
- [ ] Code follows DRY principles
- [ ] Error handling in place
- [ ] Edge cases covered
- [ ] Security boundaries checked
- [ ] Documentation updated
- [ ] No "TODO" comments left for critical logic

---

**This document is living — update it as engineering standards evolve.**

*Last updated: [Date]*
