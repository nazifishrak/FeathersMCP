# FeathersMCP — MVP Testing Plan

**Session Date:** Monday, Feb 23, 2026 | 5:30-7:00 PM | ICICS 238

---

## Table of Contents

- [What We're Testing](#what-were-testing)
- [What Testers Are Evaluating](#what-testers-are-evaluating)
- [Host Setup](#host-setup)
- [Timeline](#timeline)
- [Team Assignments](#team-assignments)
- [Testing Schedule](#testing-schedule)
- [Intro Script](#intro-script-read-to-the-tester-1-min)
- [Phase 1 — Query Testing](#phase-1--query-testing-10-min) — Tasks 1–7
- [Phase 2 — App Building](#phase-2--app-building-8-min) — per-host sheets
- **Host-only sections** *(collapsed below each phase):*
  - [Pre-Session Checklist](#pre-session-checklist)
  - [Host Script](#host-script)
  - [Observation Checklist](#observation-checklist)
  - [Cross-Session Comparison](#cross-session-comparison)
  - [Bug Report Format](#bug-report-format)
  - [Feedback Form](#feedback-form)
  - [PUM Checklist](#pum-checklist)
  - [Quick Reference](#quick-reference)

---

## What We're Testing

FeatherMCP is an MCP server that gives AI assistants access to FeathersJS v6 documentation via a local SQLite database. We're stress-testing it across **different LLM clients** and **different JS runtimes**.

Each hosting session is **20 minutes** with two phases:
- **Phase 1 (~10 min):** Query testing — tester asks questions, we evaluate search quality
- **Phase 2 (~8 min):** App building — tester tries to build a FeathersJS app with AI assistance

---

## What Testers Are Evaluating

Testers are **not** testing a UI — they're interacting with an AI chat assistant (Copilot, Claude, etc.) that's connected to our MCP server behind the scenes. When they ask a question about FeathersJS, the AI calls our tools (`search-doc`, `get-doc`, `get-menu`, `get-schema`) to retrieve real documentation, then synthesizes an answer.

**What we're validating as hosts:**
- The AI consistently calls our MCP tools (not just its training data)
- Search results are relevant, accurate, and include source URLs
- A tester with no FeathersJS experience can go from zero to a working app **in under 15 minutes** with AI guidance
- The experience works consistently across different MCP clients and JS runtimes

Your job as host is to observe, not instruct. If the tester struggles, that's signal — note what went wrong.

---

## Host Setup

Follow **[PROJECT_GUIDE.md](PROJECT_GUIDE.md)** for full setup instructions for your specific MCP client (Cursor, Zed, Claude Desktop, VSCode-Insiders).

Before your session: complete the Pre-Session Checklist below to verify your build, database, and tool connections are working.

---

## Timeline

| Time | Activity |
|------|----------|
| 5:30–5:40 PM | Setup & Get to Rooms |
| 5:40–6:00 PM | **Session A** — Nazif + Maggie host, others test external projects |
| 6:00–6:05 PM | Transition |
| 6:05–6:25 PM | **Session B** — Nam + Nariman host, others test external projects |
| 6:25–6:30 PM | Transition |
| 6:30–6:50 PM | **Session C** — Maharaj + Maggie host, others test internally |
| 6:50–7:00 PM | Team Debrief |

---

## Team Assignments

Each teammate uses a different MCP client and targets a different runtime during Phase 2:

| Team Member | MCP Client | Runtime | Hosts in Session |
|-------------|-----------|---------|------------------|
| **Nazif** | Zed (Antigravity) | Deno + Node.js | A, B |
| **Nam** | Cursor | Bun + Node.js | B |
| **Maggie** | Claude Desktop | Cloudflare Workers + Node.js | A, C |
| **Nariman** | VSCode-Insiders | Node.js | B |
| **Maharaj** | VSCode-Insiders | Node.js | C |

---

## Testing Schedule

<details>
<summary><strong>📋 Full Schedule (all members, all sessions)</strong></summary>

| Name | Session A (5:40–6:00) | With (Team) | Session B (6:05–6:25) | With (Team) | Session C (6:30–6:50) | With (Team) |
|------|----------------------|-------------|----------------------|-------------|----------------------|-------------|
| Maharaj | Tester | Jack (Benevity C) | Tester | Mehrshad (Surrey Food Bank A) | **HOST** | Yikai (FeathersJS A), Kavyansh (FeathersJS C) |
| Nazif | **HOST** | Crystal (Open WebUI B) | **HOST** | Jaskirat (Open WebUI B) | Tester | Shams (FeathersJS C) |
| Nam | Tester | Marie (Open WebUI A) | **HOST** | Marie (Open WebUI A) | Tester | Thien (FeathersJS A), Sirjak (FeathersJS C) |
| Nariman | Tester | Jessica (Open WebUI A) | **HOST** | Jessica (Open WebUI A) | Tester | Pai (FeathersJS A) |
| Maggie | **HOST** | Rui (Open WebUI B) | Tester | Manan (Benevity C) | **HOST** | Jack (FeathersJS A), Kush (FeathersJS C) |

</details>

### Hosting Assignments at a Glance

**Session A — Nazif + Maggie host**

| Host | Client | Tester | Their Team |
|------|--------|--------|------------|
| Nazif | Zed (Antigravity) | Crystal | Open WebUI B |
| Maggie | Claude Desktop | Rui | Open WebUI B |

**Session B — Nazif + Nam + Nariman host**

| Host | Client | Tester | Their Team |
|------|--------|--------|------------|
| Nazif | Zed (Antigravity) | Jaskirat | Open WebUI B |
| Nam | Cursor | Marie | Open WebUI A |
| Nariman | VSCode-Insiders | Jessica | Open WebUI A |

**Session C — Maharaj + Maggie host**

| Host | Client | Tester | Their Team |
|------|--------|--------|------------|
| Maharaj | VSCode-Insiders | Yikai (FeathersJS A), Kavyansh (FeathersJS C) |
| Maggie | Claude Desktop | Jack (FeathersJS A), Kush (FeathersJS C) |

> Session C testers are from other FeathersJS teams — they'll be more technical. Push into deeper questions and more ambitious app building.
>
> **Hosts with 2 testers in one session (Maharaj, Maggie in Session C):** Split time ~10 min per tester. Compress to Phase 1 (tasks 1–3 only, ~5 min) + Phase 2 (scaffold only, ~4 min) + debrief (~1 min).

---

<details id="pre-session-checklist">
<summary><strong>✅ Pre-Session Checklist (host only — complete before tester arrives)</strong></summary>

- [ ] `npm run build` succeeds
- [ ] `npm run test:pipeline` passes (verifies database + search)
- [ ] Your MCP client is configured and connected (see PROJECT_GUIDE.md for setup)
- [ ] All four tools accessible: `search-doc`, `get-doc`, `get-schema`, `get-menu`
- [ ] Dry-run query works (e.g., "What are hooks in FeathersJS?" → structured answer with code)
- [ ] Fresh AI conversation ready (clear chat history)
- [ ] This task sheet open and ready to hand to tester
- [ ] Bug report template open for note-taking
- [ ] Laptop charged, stable build running
- [ ] Arrive **5 min early** to your hosting session

</details>

---

## Intro Script (read to the tester, ~1 min)

> "FeatherMCP is a tool that gives an AI assistant access to the FeathersJS documentation. Instead of searching the internet, the AI looks things up from a local database we built. Today you're using **[name your client]**. We have about 20 minutes total with two parts: first you'll ask the AI some questions about FeathersJS to see how well it answers (~10 min). Then we'll try to actually build a simple FeathersJS app together using the AI (~8 min). Just ask questions however feels natural — there's no right way to phrase things. Think out loud so I can take notes."

---

## Phase 1 — Query Testing (~10 min)

**Hand the tester this section.** Let them drive. Only suggest fallback prompts if they've been stuck for 2+ minutes.

---

**Scenario:** You are a developer who just started learning FeathersJS. You want to use an AI assistant to understand the framework.

**How to do this:**
- For each task, there is a goal. Ask the AI however feels natural — there is no "right" phrasing.
- Think out loud. Say what you're expecting and what you notice.
- If something seems wrong, confusing, or missing, say so.

---

### Task 1 (Required) — What Is a Service? (~2–3 min)

**Goal:** Find out what a FeathersJS service is and how to create one.

Ask however you want. You're done when you feel like you understand what a service is and could try building one.

<details>
<summary><strong>🔑 Host notes — What a good answer includes + fallback prompts</strong></summary>

**What a good answer includes:**
- Lists standard methods: `find`, `get`, `create`, `update`, `patch`, `remove`
- Mentions services are transport-independent (same code works over REST, WebSockets, etc.)
- Includes a code example of defining or using a service
- Source URL from `https://v6.feathersjs.com/api/services`

**Fallback prompts** (suggest if tester is stuck):
> "What is a FeathersJS service and what standard methods does it have?"
> "How do I create a custom service in FeathersJS?"

</details>

---

### Task 2 (Required) — Authentication (~2–3 min)

**Goal:** Figure out how to add authentication to a FeathersJS app.

Ask however you want. You're done when you have steps or guidance you could actually follow.

<details>
<summary><strong>🔑 Host notes — What a good answer includes + fallback prompts</strong></summary>

**What a good answer includes:**
- Mentions `@feathersjs/authentication` package
- Mentions JWT and OAuth support (GitHub, Google, etc.)
- At least one code example (e.g., `authenticate('jwt')` hook)
- Source URL from `https://v6.feathersjs.com/api/authentication`

**Fallback prompts** (suggest if tester is stuck):
> "How do I set up authentication in FeathersJS v6? What does @feathersjs/authentication provide?"
> "Show me how to protect a route with JWT in FeathersJS."

</details>

---

### Task 3 (Required) — Browse Available Topics (~2 min)

**Goal:** Get a sense of what topics the documentation covers.

Ask however you want. You're done when you have a useful overview of what you could learn about.

<details>
<summary><strong>🔑 Host notes — What a good answer includes + fallback prompts</strong></summary>

**What a good answer includes:**
- Lists or describes all four categories: **api** (17 pages), **guides** (14), **cookbook** (15), **ecosystem** (1)
- Mentions specific topics like hooks, services, authentication, deployment, OAuth recipes
- This should trigger the `get-menu` tool — watch for it

**Fallback prompts** (suggest if tester is stuck):
> "What topics does the FeathersJS documentation cover?"
> "Can you show me a table of contents or overview of the Feathers docs?"

**Host note:** This task exercises the `get-menu` tool. Watch whether the AI calls it automatically or only when explicitly asked.

</details>

---

### Task 4 (Optional) — Hooks Code Example (~2 min)

**Goal:** Find a real working example of using hooks in FeathersJS.

Ask however you want. You're done when you have something concrete you could run or adapt.

<details>
<summary><strong>🔑 Host notes — What a good answer includes + fallback prompts</strong></summary>

**What a good answer includes:**
- Explains before/after/around hook types
- Shows TypeScript `async (context, next)` function syntax for around hooks
- Explains `await next()` usage
- Source from `https://v6.feathersjs.com/api/hooks`

**Fallback prompts** (suggest if tester is stuck):
> "What are hooks in FeathersJS and how do I write an around hook? Give me a code example."
> "Show me a FeathersJS hook that logs every request."

</details>

---

### Task 5 (Optional) — Edge Case / Outside the Docs (~1–2 min)

**Goal:** Ask something where you're not sure the AI will have a good answer. Examples: comparing FeathersJS to other frameworks, or a very niche setup.

There's no right answer. We want to see how the AI handles edge-of-docs questions.

<details>
<summary><strong>🔑 Host notes — What to watch for + fallback prompts</strong></summary>

**What to watch for:**
- Does the AI acknowledge uncertainty if the docs don't cover it?
- Or does it give an overconfident, made-up answer?

**Fallback prompts** (suggest if tester is stuck):
> "How does FeathersJS compare to NestJS for building APIs?"
> "Can I use FeathersJS with GraphQL instead of REST?"

</details>

---

### Task 6 (Optional) — Cookbook Recipe (~2 min)

**Goal:** Look up a specific recipe from the FeathersJS cookbook — for example, how to revoke a JWT token.

Ask however you want. You're done when you have a concrete approach you could implement.

<details>
<summary><strong>🔑 Host notes — What a good answer includes + fallback prompts</strong></summary>

**What a good answer includes:**
- References the Revoking JWTs cookbook page
- Explains maintaining a revocation list or similar approach
- Source URL from `https://v6.feathersjs.com/cookbook/authentication/revoke-jwt`

**Fallback prompts** (suggest if tester is stuck):
> "How do I revoke a JWT token in FeathersJS? Is there a cookbook recipe for that?"
> "Show me how to invalidate tokens in FeathersJS."

</details>

---

### Task 7 (Optional) — Searching Across Categories (~2 min)

**Goal:** Find content that spans multiple documentation categories — for example, error handling in both the API reference and the guides.

Ask however you want. You're done when you have a comprehensive picture of the topic.

<details>
<summary><strong>🔑 Host notes — What a good answer includes + fallback prompts</strong></summary>

**What a good answer includes:**
- Mentions the `@feathersjs/errors` package
- Lists common error classes: `BadRequest`, `NotAuthenticated`, `NotFound`, etc.
- Pulls results from multiple categories (api + guides)
- Includes a source URL

**Fallback prompts** (suggest if tester is stuck):
> "How does error handling work in FeathersJS? What error classes are available?"
> "Where can I find information about FeathersJS errors in the docs?"

</details>

---

## Phase 2 — App Building (~8 min)

After query testing, transition to building. The tester drives the AI; the host provides the runtime context.

**Tell the tester:**
> "Now let's try something practical. We're going to use the AI to help us build a simple FeathersJS app from scratch. You keep driving — ask the AI for step-by-step guidance. I'll tell you which runtime we're targeting."

**General goal across all hosts:** Build a minimal FeathersJS app with at least one service and one API endpoint that responds to requests. Stretch goal: add authentication.

**What to observe:**
- Can the AI provide a working project scaffold?
- Does it give correct install/setup commands?
- Are the code examples runnable?
- Does the AI use `search-doc` to look up implementation details?

---

<details>
<summary><strong>🟦 Nazif's Hosting Sheet — Zed (Antigravity) + Deno</strong></summary>

**You host in:** Session A (Crystal from Open WebUI B) and Session B (Jaskirat from Open WebUI B)

**Runtime goal:** Build a FeathersJS app that runs on Deno (or falls back to Node.js).

**Tell the tester:**
> "We're using Zed as our editor with the Antigravity AI extension. Our goal is to scaffold a FeathersJS app and try running it on Deno."

**Suggested prompts if tester needs direction:**
1. "How do I create a new FeathersJS app from scratch?"
2. "Can FeathersJS run on Deno? What do I need to change?"
3. "Set up a basic messages service with CRUD endpoints"
4. "How do I start the server and test it?"

**What you're specifically testing:**
- Does the AI know about Deno compatibility with FeathersJS?
- Can it provide Deno-specific setup (import maps, permissions)?
- If the docs don't cover Deno, does the AI say so honestly?

</details>

---

<details>
<summary><strong>🟩 Nam's Hosting Sheet — Cursor + Bun</strong></summary>

**You host in:** Session B (Marie from Open WebUI A)

**Runtime goal:** Build a FeathersJS app that runs on Bun (or falls back to Node.js).

**Tell the tester:**
> "We're using Cursor as our editor. Our goal is to scaffold a FeathersJS app and try running it on Bun."

**Suggested prompts if tester needs direction:**
1. "Help me create a new FeathersJS project"
2. "Can I use Bun instead of Node.js to run a FeathersJS app?"
3. "Create a simple todo service with create and find methods"
4. "How do I run and test this?"

**What you're specifically testing:**
- Does the AI know about Bun compatibility with FeathersJS?
- Can it provide `bun install` / `bun run` equivalents?
- Does it handle Bun-specific gotchas (if any)?

</details>

---

<details>
<summary><strong>🟪 Maggie's Hosting Sheet — Claude Desktop + Cloudflare Workers</strong></summary>

**You host in:** Session A (Rui from Open WebUI B) and Session C (Jack from FeathersJS A, Kush from FeathersJS C)

**Runtime goal:** Build a FeathersJS app that can deploy to Cloudflare Workers (or starts as Node.js then adapts).

**Tell the tester:**
> "We're using Claude Desktop. Our goal is to scaffold a FeathersJS app and explore deploying it to Cloudflare Workers."

**Suggested prompts if tester needs direction:**
1. "How do I start a new FeathersJS application?"
2. "Can FeathersJS run on Cloudflare Workers? What adapters do I need?"
3. "Set up a basic API with one service"
4. "How do I deploy a FeathersJS app to Cloudflare?"

**What you're specifically testing:**
- Does the AI find the Cloudflare deployment cookbook page?
- Can it provide correct Wrangler / Workers config?
- Does it handle serverless constraints (no filesystem, etc.)?

</details>

---

<details>
<summary><strong>🟧 Nariman's Hosting Sheet — VSCode-Insiders + Node.js</strong></summary>

**You host in:** Session B (Jessica from Open WebUI A)

**Runtime goal:** Build a standard FeathersJS Node.js app with services and hooks.

**Tell the tester:**
> "We're using VSCode with GitHub Copilot. Our goal is to build a simple FeathersJS API on Node.js."

**Suggested prompts if tester needs direction:**
1. "Walk me through creating a FeathersJS app step by step"
2. "Add a users service with basic CRUD"
3. "How do I add a hook that validates input before creating a user?"
4. "How do I add JWT authentication to protect my endpoints?"

**What you're specifically testing:**
- Standard Node.js flow — this is the baseline
- Does the AI give a complete, runnable project?
- Are hooks and auth setup instructions accurate?

</details>

---

<details>
<summary><strong>🟥 Maharaj's Hosting Sheet — VSCode-Insiders + Node.js (Real-Time Focus)</strong></summary>

**You host in:** Session C (Yikai from FeathersJS A, Kavyansh from FeathersJS C)

**Runtime goal:** Build a FeathersJS Node.js app, focusing on real-time / WebSocket features.

**Tell the tester:**
> "We're using VSCode with GitHub Copilot. Our goal is to build a FeathersJS app that shows off its real-time capabilities."

**Suggested prompts if tester needs direction:**
1. "How do I create a new FeathersJS application?"
2. "Set up a chat messages service"
3. "How do real-time events work in FeathersJS? Show me WebSocket setup"
4. "How do I listen for new messages being created in real time?"

**What you're specifically testing:**
- Does the AI find the Events and Channels docs?
- Can it explain the real-time publish/subscribe model?
- Does the WebSocket client setup code actually work?

</details>

---

<details id="host-script">
<summary><strong>🎬 Host Script — Running the 20-Minute Session (click to expand)</strong></summary>

**If hosting:** Arrive 5 min early. Give tester the task list. Observe and take notes. Don't help unless they're stuck. Note bugs using the bug report template.

### 0:00 — Tester arrives

- Welcome them. Introduce yourself.
- Say: _"We have about 20 minutes. First ~10 minutes you'll ask the AI questions about FeathersJS. Then we'll try to build a small app together using the AI. Please think out loud."_
- Open a fresh AI conversation (clear history).

### 0:02 — Read intro script

- Read or paraphrase the intro script from above.
- Tell them which client they're using and that it's already connected.
- Set context: _"You're a developer who just started learning FeathersJS and wants AI help."_
- Ask: _"Any questions before we start?"_

### 0:03 — Phase 1: Query testing (~10 min)

- Hand them the Phase 1 task sheet.
- Let them drive. Don't help unless they've been stuck 2+ minutes.
- Note the exact phrasing they use — this is valuable data.
- Watch for: tool calls appearing, source URLs in answers, code examples.

### 0:12 — Transition to Phase 2

- Say: _"Great, now let's try building something. I'll tell you what runtime we're targeting."_
- Read your personal Phase 2 setup line to the tester.
- Let the tester keep driving the AI — suggest prompts only if they're stuck.

### 0:18 — Wrap up + debrief (~2 min)

- If app isn't finished, that's fine — note how far they got.
- Ask debrief questions:

**Required (ask every time):**

1. _"What was the hardest or most confusing part?"_
2. _"Did the AI's answers feel accurate and trustworthy?"_
3. _"If you could change one thing, what would it be?"_

**Optional (if time allows):**

- _"Did the way you phrased questions affect what you got back?"_
- _"On a scale of 1–5, how easy was this to use?"_

### 0:20 — Close

- Thank them. Write down their name for PUM.
- If there's a feedback form, share it.

</details>

---

<details id="observation-checklist">
<summary><strong>📝 Host Observation Checklist (copy for each tester)</strong></summary>

**Host:** _______________
**Tester name:** _______________
**Session:** A / B / C
**MCP Client:** _______________
**Runtime tested:** _______________

### Phase 1 — Query Tasks

| Task | Tester's exact phrasing | Completion | MCP tool fired? | Source URL? |
|------|------------------------|------------|----------------|------------|
| Task 1 — Services | | Unassisted / Prompted / Not done | Yes / No | Yes / No |
| Task 2 — Authentication | | Unassisted / Prompted / Not done | Yes / No | Yes / No |
| Task 3 — Browse topics | | Unassisted / Prompted / Not done | Yes / No | Yes / No |
| Task 4 — Hooks (optional) | | Unassisted / Prompted / Not done | Yes / No | Yes / No |
| Task 5 — Edge case (optional) | | Unassisted / Prompted / Not done | Yes / No | Yes / No |

### Phase 2 — App Building

| Step | Completed? | Notes |
|------|-----------|-------|
| Project scaffolded | Yes / No | |
| At least one service created | Yes / No | |
| Server starts successfully | Yes / No | |
| API endpoint responds | Yes / No | |
| Auth added (stretch) | Yes / No | |

### Usability Notes

- [ ] Tester understood what to do without extra explanation
- [ ] Tester seemed confident asking the AI questions
- [ ] Tester expressed confusion at some point (note where)
- [ ] AI answers felt grounded in real docs, not hallucinated
- [ ] Tester noticed or commented on answer quality
- [ ] Tester tried rephrasing after a bad answer
- [ ] AI called `get-menu` or `get-schema` before searching

**Confusing moments:**

```
Task/Phase:
What happened:
```

### Technical Validation (check after tester leaves)

- [ ] All required tasks returned non-empty results
- [ ] Search results were relevant (not off-topic)
- [ ] Topic overview included all 4 categories
- [ ] No duplicate results for same query
- [ ] Server did not crash
- [ ] Response time < 2 seconds
- [ ] No CSS noise in any answer (e.g., `.shiki`, `--shiki-default`)

</details>

---

<details id="cross-session-comparison">
<summary><strong>📊 Cross-Session Comparison (fill in after all sessions)</strong></summary>

| | Session A | Session B | Session C |
|---|-----------|-----------|----------|
| Hosts | Nazif, Maggie | Nazif, Nam, Nariman | Maharaj, Maggie |
| Clients used | Zed, Claude Desktop | Zed, Cursor, VSCode-Insiders | VSCode-Insiders, Claude Desktop |
| Testers from | Open WebUI B | Open WebUI A & B | FeathersJS A & C |
| All required query tasks completed? | | | |
| App building reached? | | | |
| Any errors or crashes? | | | |
| Response quality consistent? | | | |
| Client-specific differences? | | | |

</details>

---

<details id="bug-report-format">
<summary><strong>🐛 Bug Report Format (file as GitHub Issues after session)</strong></summary>

```markdown
**Title:** [Short description]

**Session:** A / B / C
**Host:** [Your name]
**MCP Client:** [Zed / Cursor / Claude Desktop / VSCode-Insiders]
**Tester:** [Name]
**Task/Phase:** [Task 1–5 / App Building]
**Tool involved:** [search-doc / get-schema / get-menu / unknown]
**Tester's exact phrasing:** [What they asked]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
[What actually happened]

**Severity:** Critical / High / Medium / Low

**Notes:**
[Error messages, screenshots, or extra context]
```

**Common issue categories:**

| Category | Example |
|----------|---------|
| Wrong results | Search for "authentication" returns unrelated docs |
| Tool didn't fire | AI answers without calling `search-doc` |
| Missing source URL | Answer has no link back to feathersjs.com |
| CSS noise in content | Answer contains `.shiki` CSS artifacts |
| Server crash | AI says "Tool call failed" |
| Zero results | Valid query like "cloudflare deploy" returns nothing |
| Runtime-specific gap | AI doesn't know about Deno/Bun/Workers compatibility |

</details>

---

<details id="feedback-form">
<summary><strong>📄 Feedback Form (share with tester)</strong></summary>

1. Were you able to complete the tasks? (Yes / Partially / No)
2. Did the AI's answers feel accurate and useful? (1–5 scale)
3. Was anything confusing about how to use the tool?
4. Did you notice any wrong or missing answers?
5. How far did you get in building the app? Could you have continued on your own?
6. What would make this more useful for a developer?

</details>

---

<details id="pum-checklist">
<summary><strong>📦 What to Bring to Wednesday PUM (Feb 25)</strong></summary>

- [ ] Names of all testers across your hosting sessions
- [ ] Completed observation checklists (one per tester)
- [ ] GitHub issues filed for each bug
- [ ] Which bugs you plan to fix and how
- [ ] Most common feedback across all testers
- [ ] Differences observed between clients / runtimes
- [ ] How far testers got in app building

</details>

---

<details id="quick-reference">
<summary><strong>🔧 Quick Reference — Our 4 MCP Tools</strong></summary>

| Tool | What It Does | When AI Uses It |
|------|-------------|------------------|
| `search-doc` | Full-text search with BM25 relevance | Almost every question |
| `get-doc` | Fetch full page content by title/id/path | After search, when full content is needed |
| `get-menu` | Lists all 47 docs by category | "What topics are covered?" |
| `get-schema` | Shows database structure | Rarely — mainly debugging |

**Database:** 47 documents across 4 categories:
- **api** — 17 pages (Application, Authentication, Hooks, Services, Events, Errors, etc.)
- **guides** — 14 pages (Quick Start, Creating an App, Schemas, Writing Tests, etc.)
- **cookbook** — 15 pages (OAuth, JWT, File Uploads, Docker, Cloudflare, etc.)
- **ecosystem** — 1 page

</details>
