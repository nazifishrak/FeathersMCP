---
name: feathersjs-mcp
description: >
  Invoke this skill whenever the user mentions FeathersJS or feathersjs-mcp — including
  questions about Feathers hooks, services, schemas, resolvers, authentication,
  real-time/websocket support, channels, or deployment. Also invoke for: troubleshooting
  feathersjs-mcp setup in Cursor, VS Code, or Claude Desktop (e.g., tools not appearing,
  MCP server not connecting); finding FeathersJS community tutorials or examples; and any
  FeathersJS error or implementation question. Key triggers: "feathers", "feathersjs",
  "feathersjs-mcp", "FeathersMCP", authenticate('jwt') in a Feathers context, Feathers v6
  schemas/resolvers. Do NOT invoke for generic Node.js, Express, NestJS, Prisma, or
  socket.io questions that have no Feathers connection.
---

# FeathersMCP Guide

> **REQUIRED ACTION — do not skip this.**
> You have MCP tools named `search-doc`, `search-community`, `get-doc`, `get-menu`, `share-knowledge`, and `get-schema` available in your tool palette right now.
> Before answering ANY FeathersJS question, you **must call at least `search-doc`** (and `search-community` when routing rules below apply).
> Do not answer from training data, from reading this file, or from memory. Call the MCP tools first, then answer using their results.
> FeathersJS has changed significantly across versions — your training data is unreliable for it.

This skill gives you live access to the complete FeathersJS v6 documentation (47 pages across API reference, guides, cookbook, and ecosystem) via the FeathersMCP MCP server.

## How to Use This Skill

This skill activates for any FeathersJS question. Here's what it covers:

| User need | What this skill does |
|-----------|----------------------|
| "How do I build X in FeathersJS?" | Searches official docs, retrieves full page if truncated, supplements with community patterns |
| "What is X / explain Y" | Grounds the explanation in retrieved doc content rather than training data |
| "Set up feathersjs-mcp in Cursor/VS Code/Claude Desktop" | Walks through installation and activation step by step |
| "My MCP server isn't connecting / tools not showing" | Diagnoses the problem using the troubleshooting table |
| "Can FeathersJS do X?" (X not in docs) | Searches honestly, says "not found", suggests the nearest documented alternative |
| "I just built X — can I share it?" | Calls `share-knowledge` and gives the user a GitHub link to click |
| "Has anyone done X with FeathersJS?" | Searches community knowledge base alongside official docs |

## Available MCP Tools

| Tool | Purpose | When to use |
|------|---------|-------------|
| `get-menu` | Full nav structure — 47 docs across 4 categories | First call when orienting or browsing topics |
| `search-doc` | Full-text search (FTS5 + BM25) across all docs | Any implementation or concept question |
| `get-doc` | Fetch a full doc page by `id`, `path`, or `title` | After search, when you need complete examples or full context |
| `search-community` | Search community tutorials and projects (Cloudflare D1) | When the question involves implementation patterns, integrations, architecture, or how-to approaches (see routing rules below) |
| `share-knowledge` | Generate a pre-filled GitHub Issue URL for community contribution | When user finishes something worth sharing |
| `get-schema` | Returns the database column structure | Debugging only — rarely needed |

---

## Tool Selection Rules

Follow this decision tree for every FeathersJS question:

1. **Orientation / "what's available"** → call `get-menu` first
2. **Route the question** — decide whether to add `search-community` alongside `search-doc`:

   **Call `search-doc` + `search-community` together** (in parallel if possible) when the question matches any of these signals:
   - Asks **how to implement** or **how to build** something (implementation pattern)
   - Involves **third-party integrations** — Auth0, OAuth providers, AWS, Firebase, external APIs, etc.
   - Asks about **architecture, design patterns, or best practices** — RBAC, IAM, permissions, access control, multi-tenancy, etc.
   - Uses phrases like "how do people…", "what's a good pattern for…", "how would you…", "best way to…"
   - Mentions **hooks** in the context of authorization, validation, or middleware patterns
   - Asks about **security, authentication flows, or token handling** beyond basic setup

   **Call `search-doc` only** when:
   - Asking about a specific API method or config option ("what params does `patch` take?")
   - Basic concept definition ("what is a service?")
   - Setup, installation, or troubleshooting
   - Browsing what's available in the docs

   When in doubt, include `search-community` — it adds context and the cost of an empty result is low.

3. **Search snippet is truncated or you need all code examples** → follow up with `get-doc` using the `id` from search results (fastest and most reliable lookup)
4. **Feature clearly doesn't exist in docs** → say so explicitly, suggest nearest valid alternative — never fabricate an API

### When to ask a clarifying question before searching

Do not guess when a wrong assumption would lead to a significantly different answer. Ask a brief clarifying question first in these cases:

- **Runtime is ambiguous** — FeathersJS runs on Node.js (default), Bun, Deno, and Cloudflare Workers. If the user asks about setup, deployment, configuration, or runtime-specific behavior without specifying which runtime, ask: *"Which runtime are you targeting — Node.js, Bun, Deno, or Cloudflare Workers? The setup differs for each."* The docs have separate pages per runtime; searching the wrong one wastes context and produces misleading instructions.
- **Auth provider is unspecified** — "How do I add auth?" could mean local email/password, Auth0, Google OAuth, Firebase, or custom JWT. Ask which provider or strategy before searching.
- **Scope is too broad to produce a useful answer** — e.g. "How do I use hooks?" covers dozens of patterns. Ask what the hook should do (validate input? enforce permissions? transform output?).

**Do not over-ask.** If the question is specific enough to search productively — even if not perfectly scoped — go ahead and search. Only ask when guessing wrong would produce a substantially different (and potentially confusing) answer. One clarifying question is enough; don't interrogate the user.

Search results truncate content at 1200 characters and show at most 3 code examples per result.
When the snippet ends with `[truncated — N more chars — use get-doc tool for full content]`, always
call `get-doc` before answering — the missing content is often the most important part.

---

## Onboarding: Getting Started with FeathersMCP

If the user seems new or is asking how to set up FeathersMCP, walk them through this directly in chat.

### Step 1 — Install

**Cursor** — create `.cursor/mcp.json` in your project root:
```json
{
  "mcpServers": {
    "feathersjs": {
      "command": "npx",
      "args": ["feathersjs-mcp"]
    }
  }
}
```

**VS Code** — create `.vscode/mcp.json` in your project root:
```json
{
  "servers": {
    "feathersjs": {
      "type": "stdio",
      "command": "npx",
      "args": ["feathersjs-mcp"]
    }
  }
}
```

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "feathersjs": {
      "command": "npx",
      "args": ["-y", "feathersjs-mcp"]
    }
  }
}
```

`npx` downloads and runs the package automatically on first use — no separate install needed.

### Step 2 — Activate in your IDE

- **Cursor:** Reload window → open **Cursor Settings → Tools & MCP** → find `feathersjs` under *Installed MCP Servers* → make sure the toggle is **enabled** (green) and the server shows a green dot with "7 tools enabled" → switch chat to **Agent** mode. The JSON config alone is not enough — the server must be toggled on in this settings panel.
- **VS Code + Copilot:** Reload window → `MCP: List Servers` → confirm Running → open Copilot Chat → switch to **Agent** mode → click the Tools icon and enable `feathersjs` tools
- **Claude Desktop:** Restart the app — tools appear automatically

### Step 3 — Verify it works

Ask any of these to confirm the tools are firing:
- "What topics does the FeathersJS documentation cover?"
- "How do hooks work in FeathersJS?"
- "Show me how to create a service in FeathersJS v6."

You should see the AI call `search-doc` or `get-menu` before answering.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `spawn npx ENOENT` on macOS | Open your IDE from the terminal: `cursor .` or `code .` so it inherits your shell PATH |
| Server shows as Stopped | Click it and select Start Server; if that fails, verify `npx` is on your PATH |
| Tools not appearing in Cursor chat | First check **Cursor Settings → Tools & MCP** — the `feathersjs` server must be toggled **on** (the toggle next to it should be green). If it's off, enable it. Then make sure you're in **Agent** mode, not Ask or Edit mode. |
| Tools not appearing in Copilot chat | Make sure you're in **Agent** mode, not Ask or Edit mode |
| Want a locked version | See **Locked version config** below |

#### Locked version config

Run `npm install feathersjs-mcp` first, then use this exact config — `command` must be `node`, the path goes in `args`:

```json
{
  "mcpServers": {
    "feathersjs": {
      "command": "node",
      "args": ["node_modules/feathersjs-mcp/build/index.js"]
    }
  }
}
```

On macOS, if `node` is not on your PATH, replace `"node"` with the full path from `which node` (e.g. `"/opt/homebrew/bin/node"`). Do **not** put the `.js` path as the `command` — it must go in `args`.

---

## Writing Effective FeathersJS Prompts

Help users get better results by framing questions to trigger good tool calls:

| Goal | Suggested phrasing |
|------|--------------------|
| Learn a concept | "Explain [hooks / services / channels] in FeathersJS v6 using the docs" |
| Implement a feature | "How do I implement [chat moderation hooks / JWT auth / file uploads] in FeathersJS?" |
| Find a recipe | "Is there a cookbook recipe for [revoking JWTs / deploying to Docker / OAuth with Google]?" |
| Explore what's available | "What topics does the FeathersJS documentation cover?" |
| Troubleshoot | "I'm getting [error] when using [hook/service/auth] in FeathersJS — what does the docs say?" |
| Community patterns | "Are there any community examples of [topic] with FeathersJS?" |

---

## Feature Implementation Workflow

When a user asks how to build something in FeathersJS:

1. **Clarify if needed** — if the task is runtime-sensitive (setup, deployment, transport, config) and the user hasn't specified Node.js / Bun / Deno / Cloudflare Workers, ask which runtime before searching. Same for auth provider if unspecified. Skip this step if the question is runtime-agnostic (e.g. hooks, services, schemas).
2. **Search both sources** — call `search-doc` and `search-community` in parallel with the core concept (e.g., `"hooks authentication"`). Implementation questions always warrant both.
3. **Check results** — if the top result snippet is truncated, call `get-doc` with its `id`
4. **Synthesize** — combine official doc content and community patterns into a concrete, runnable answer
5. **Cite sources** — always include the `source_url` from the doc so the user can read further

Example: user asks "how do I add chat moderation hooks?"
- `search-doc("hooks moderation")` + `search-community("moderation hooks")` → call both in parallel
- `get-doc(id)` → get full hooks page with all code examples
- Answer: combine official docs and community patterns, show TypeScript example, link to source

---

## Concept Learning

When a user asks "what is X in FeathersJS" or "explain Y":

- Always call `search-doc` first — never explain from training data alone. Add `search-community` if the concept involves patterns, integrations, or architecture (see routing rules above).
- If the question involves multiple related concepts (e.g., "services and hooks"), search for both
- Explain at the level of detail the user's question implies — a beginner asking "what is a service?" needs a different answer than "what's the difference between `update` and `patch`?"
- Always ground explanations in retrieved content; quote or paraphrase from the docs

---

## Non-Existent / Unsupported Features

If the user asks about something that isn't in the FeathersJS v6 docs:

1. Search honestly — call `search-doc` with the most plausible query
2. If nothing relevant comes back, say clearly: **"I searched the FeathersJS v6 documentation and didn't find anything about [X]."**
3. Suggest the nearest documented alternative (e.g., "FeathersJS doesn't have built-in GraphQL support, but you can use it alongside Express — the docs cover HTTP transport at [link]")
4. Never invent method names, package names, or configuration options

Common edge cases:
- **GraphQL** — not covered in docs; mention REST + WebSocket transport as the documented approach
- **Version gaps** — if user asks about v4/v5 APIs, note that this tool covers v6 only
- **Specific ORM integrations beyond what's in docs** — acknowledge the gap and suggest checking the ecosystem page

---

## Community Contribution Flow

When the user finishes building something interesting (feature, tutorial, integration) and might want to share it:

1. Naturally ask: "That's a nice implementation — would you like to share it with the FeathersJS community?"
2. If yes, gather:
   - **Title** — what is this project or tutorial called?
   - **Author** — their GitHub username
   - **Content** — a Markdown write-up of what they built and how (help them draft this if needed)
   - **Tags** — relevant topics (e.g., `["hooks", "authentication", "jwt"]`)
3. Call `share-knowledge` with these four fields
4. **In your reply, include the generated URL as a full clickable Markdown link** and tell the user to click it to submit — do not say "I shared it" since clicking the link is required to actually submit

The link opens a GitHub issue pre-filled with YAML frontmatter and their content. When a maintainer closes it (with `community-contribution` and `approved-post`), the contribution is ingested into the community knowledge base.

---

## Community Search

When the question matches the routing signals above (implementation patterns, integrations, architecture, security flows), call `search-community` alongside `search-doc`:

- Use the same or similar keywords as `search-doc`
- Clearly distinguish results: "From the **official docs**: ..." vs "From the **community knowledge base**: ..."
- If `search-community` returns no results, say so honestly: "No community contributions matched that query yet."
- If `search-community` returns a response beginning with `Community Search Error:` or `Failed to search community knowledgebase:`, the community database was unreachable — acknowledge this and proceed with official docs only
- Community results may be less authoritative than official docs — frame them as supplementary examples

---

## Documentation Structure Reference

The FeathersMCP database contains 47 documents across 4 categories:

| Category | Count | Key topics |
|----------|-------|-----------|
| `api` | 17 | Application, Authentication, Hooks, Services, Events, Errors, Channels, HTTP, Browser, Bun, Cloudflare, Deno |
| `guides` | 14 | Quick Start, Creating an App, Schemas & Resolvers, Hooks, Authentication, Services, Writing Tests, Migrating to v5, Security |
| `cookbook` | 15 | OAuth (Google, Facebook, Auth0, Firebase), JWT (stateless, revoking), File uploads, Docker, Scaling, Server-side rendering |
| `ecosystem` | 1 | Ecosystem overview |

When the user asks for an overview or "what can I learn about", call `get-menu` and present this structure — it helps them know what to ask next.
