# FeatherMCP — Monday Testing Session Guide

**Session date:** Monday, Feb 24 (external testers) + Wednesday Feb 25 PUM with TA  
**What we're testing:** FeatherMCP — an MCP server that lets GitHub Copilot search FeathersJS documentation in real time.

---

## Table of Contents

1. [What Testers Are Evaluating](#what-testers-are-evaluating)
2. [Host Setup (Do Before Testers Arrive)](#host-setup-do-before-testers-arrive)
3. [Tester Task List](#tester-task-list)
4. [What to Observe and Note](#what-to-observe-and-note)
5. [Bug Report Template](#bug-report-template)
6. [Session Rules Summary](#session-rules-summary)

---

## What Testers Are Evaluating

Our project is different from a traditional web app — there's no UI to click through. Instead, testers interact with **GitHub Copilot Chat** and evaluate the quality of answers that our server provides in the background.

**The flow for each task:**
1. Tester opens GitHub Copilot Chat in VS Code
2. Tester asks a question about FeathersJS
3. Copilot calls our MCP server's `search-doc` tool in the background
4. Copilot synthesizes an answer using real documentation content we provide
5. Tester evaluates: was the answer accurate, helpful, well-sourced?

**Without our server:** Copilot would answer from training data only (often outdated or vague).  
**With our server:** Copilot should answer with specific, current FeathersJS v6 content, code examples, and source links.

---

## Host Setup (Do Before Testers Arrive)

Complete these steps **before your tester arrives**. Takes ~5 minutes.

### 1. Make sure the server is built and running

```bash
cd /path/to/MVP/FeatherMCP
npm run build
```

### 2. Confirm the MCP server is connected in VS Code

- `Cmd+Shift+P` → `MCP: List Servers`
- `feathersjsDocs` should show status **Running**
- If it shows **Stopped**: click it → `Start Server`
- If it's not listed at all: open the workspace from the `MVP/` folder (not `FeatherMCP/`), reload window

### 3. Confirm Copilot Chat is in Agent mode with tools enabled

- Open GitHub Copilot Chat
- Switch dropdown to **Agent** mode
- Click the Tools (🔧) icon → verify `feathersjsDocs` tools are checked:
  - `search-doc`
  - `get-menu`
  - `get-schema`

### 4. Run a quick smoke test yourself before the session

Type this in Copilot Chat — if you get a structured answer about hooks with code examples, you're good:
> `How do hooks work in FeathersJS v6?`

---

## Tester Task List

Give this list to each tester. Read them the context sentence first, then let them type the prompt themselves.

**Total time: ~10–12 minutes for all 5 tasks.**

---

### Task 1 — Authentication Setup (~2 min)

**Context:** "You're a developer setting up a new FeathersJS API and need to add user authentication. You want to know what tools are available."

**Prompt to type in Copilot Chat (Agent mode):**
> `How do I set up authentication in FeathersJS v6? What does @feathersjs/authentication provide?`

**What a good answer looks like:**
- Mentions `@feathersjs/authentication`
- Mentions JWT and OAuth support
- Includes at least one code example
- Has a source URL like `https://v6.feathersjs.com/api/authentication`

---

### Task 2 — Hooks Explained (~2 min)

**Context:** "You're new to FeathersJS and want to understand what hooks are and how to write one."

**Prompt to type in Copilot Chat:**
> `What are hooks in FeathersJS and how do I write an around hook? Give me a code example.`

**What a good answer looks like:**
- Explains before/after/around hook types
- Shows actual TypeScript `async (context, next)` function syntax
- Explains `await next()` usage in around hooks

---

### Task 3 — Services (~2 min)

**Context:** "You want to understand what a FeathersJS service is before building one."

**Prompt to type in Copilot Chat:**
> `What is a FeathersJS service and what standard methods does it have?`

**What a good answer looks like:**
- Lists `find`, `get`, `create`, `update`, `patch`, `remove`
- Mentions services are transport-independent
- Source from `https://v6.feathersjs.com/api/services`

---

### Task 4 — Cookbook Recipe (~2 min)

**Context:** "You want to implement a specific feature and you're looking it up in the cookbook."

**Prompt to type in Copilot Chat:**
> `How do I revoke a JWT token in FeathersJS? Is there a cookbook recipe for that?`

**What a good answer looks like:**
- References the Revoking JWTs cookbook page
- Explains maintaining a revocation list or similar approach
- Source from `https://v6.feathersjs.com/cookbook/authentication/revoke-jwt`

---

### Task 5 — Searching Across Categories (~2 min)

**Context:** "You want to find all content related to error handling both in the API docs and the guides."

**Prompt to type in Copilot Chat:**
> `How does error handling work in FeathersJS? What error classes are available?`

**What a good answer looks like:**
- Mentions `@feathersjs/errors` package
- Lists common error classes (BadRequest, NotAuthenticated, NotFound, etc.)
- Has a source URL

---

## What to Observe and Note

While the tester is working, write down:

### For each task:
- [ ] Did Copilot actually call our MCP tool? (look for "Used feathersjsDocs" indicator in chat)
- [ ] Was the answer accurate? (compare to https://v6.feathersjs.com)
- [ ] Did it include a source URL?
- [ ] Did it include relevant code examples?
- [ ] Did the tester understand and find value in the answer?
- [ ] Any confusing/wrong/missing information?

### Overall session:
- [ ] Did the server stay running for all 5 tasks?
- [ ] Any tool call failures or errors? (Copilot will say "Tool call failed" if so)
- [ ] Any tasks where Copilot ignored our tools and answered from training data only?
- [ ] Any tasks that returned clearly irrelevant results?

---

## Bug Report Template

For each bug found, open a GitHub Issue with this format:

```markdown
## Bug Report

**Task:** [Task number and name, e.g. "Task 2 — Hooks Explained"]

**Description:**
[One sentence. What happened vs. what should have happened.]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. ...

**Expected Result:**
[What should have happened]

**Actual Result:**
[What actually happened]

**Severity:**
[ ] Low — cosmetic / minor inaccuracy
[ ] Medium — partially wrong or missing key info
[ ] High — completely wrong answer / tool didn't fire / server crashed

**Screenshot / Evidence:**
[Paste the Copilot response or screenshot]
```

**Common issue categories to watch for:**

| Category | Example |
|----------|---------|
| Wrong results | Search for "authentication" returns unrelated docs |
| Tool didn't fire | Copilot answers without calling `search-doc` |
| Missing source URL | Answer has no link back to feathersjs.com |
| CSS noise in content | Answer contains `html pre.shiki code .snl16{--shiki-default:#...}` text |
| Server crashes | Copilot says "Tool call failed" |
| Zero results for valid query | "cloudflare deploy" in cookbook returns nothing |

---

## Session Rules Summary

| You are... | Rule |
|------------|------|
| **Hosting** | Arrive 5 min early, give tester the task list, observe silently, only help if completely stuck, take notes |
| **Testing (Sessions A & B)** | Test a **different** team's project only |
| **Testing (Session C)** | Test your own project |

**After the session:**
- File any bugs as GitHub Issues using the template above
- Bring bug reports to the Wednesday Feb 25 PUM with your TA
- Be ready to say: who your 5 testers were + what bugs were found + what you'll fix

---

## Quick Reference — Our 3 MCP Tools

When reviewing Copilot's tool calls, you may see these tool names:

| Tool | What It Does | When Copilot Uses It |
|------|-------------|----------------------|
| `search-doc` | Full-text search with BM25 relevance | Almost every question |
| `get-menu` | Lists all 47 docs by category | "What topics are covered?" |
| `get-schema` | Shows database structure | Rarely — mainly for debugging |

Our database has **47 documents** across 4 categories:
- `api` — 17 pages (core API reference)
- `guides` — 14 pages (tutorials, getting started)
- `cookbook` — 15 pages (specific recipes, OAuth, JWT, Docker, etc.)
- `ecosystem` — 1 page
