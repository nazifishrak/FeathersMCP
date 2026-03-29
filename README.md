# FeathersJS MCP Server

An MCP server that gives AI assistants access to the FeathersJS v6 documentation. Search, browse, and retrieve full documentation pages directly from your IDE.

[![npm](https://img.shields.io/npm/v/feathersjs-mcp)](https://www.npmjs.com/package/feathersjs-mcp)

## Getting Started

### 1. Add the MCP config file

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

**Claude Desktop** — add to your `claude_desktop_config.json`:

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

That's it — `npx` downloads and runs the package automatically on first use.

### 2. Enable the server in your IDE

**Cursor:** Open **Cursor Settings → Tools & MCP** → find `feathersjs` under *Installed MCP Servers* → make sure the toggle is **enabled** (green) and it shows a green dot with "7 tools enabled." The JSON config alone is not enough — the server must be toggled on in this settings panel.

**VS Code + Copilot:** Run `MCP: List Servers` from the command palette → confirm `feathersjs` shows as Running → open Copilot Chat → switch to **Agent** mode → click the Tools icon and enable `feathersjs` tools.

**Claude Desktop:** Restart the app — tools appear automatically.

### 3. Use MCP tools in chat

Open your IDE's AI chat (in **Agent** mode for Cursor and VS Code) and the FeathersJS documentation tools will be available. Ask your AI assistant about FeathersJS hooks, services, authentication, or any other topic.

### Optional: install locally

```bash
npm install feathersjs-mcp
```

Locks the version in your `package.json` so all contributors use the same release. Also required for the troubleshooting Option B below.

## GitHub Release

Download the latest zip from [Releases](https://github.com/nazifishrak/FeathersMCP/releases). Extract it, open the folder in your IDE, and the MCP server is ready to use. The archive includes pre-configured `.vscode/` and `.cursor/` settings — no setup needed.

## Troubleshooting

### macOS: `spawn npx ENOENT` or `spawn node ENOENT`

On macOS, if Cursor or VS Code was opened from the Dock or Finder (not the terminal), it may not have `node` or `npx` in its PATH.

**Option A:** Open your project from the terminal so the IDE inherits your shell PATH:

```bash
cursor .
# or
code .
```

**Option B:** Install the package locally (see [Optional: install locally](#optional-install-locally)) and use the full path to `node` in your config. Find it by running `which node`, then update the config file:

```json
{
  "mcpServers": {
    "feathersjs": {
      "command": "/opt/homebrew/bin/node",
      "args": ["node_modules/feathersjs-mcp/build/index.js"]
    }
  }
}
```

Replace `/opt/homebrew/bin/node` with the output of `which node` on your machine.

## Agent Skill (optional)

The `feathersjs-mcp` skill adds structured guidance on top of the MCP tools — doc-grounded answers, onboarding, community search, and share flow. It works in any AI coding assistant that supports the `.agents/skills/` standard.

> Without the skill, your AI assistant can still call the MCP tools. With it, it follows a consistent workflow and never answers FeathersJS questions from training data alone.

**Supported clients:** Claude Code, Cursor, Windsurf, Gemini CLI, and others that follow the [agentskills.io](https://agentskills.io) standard.

### Install

Run this from your project root:

```bash
npx feathersjs-mcp install-skill
```

This writes `.agents/skills/feathersjs-mcp/SKILL.md` into your project. Your AI assistant picks it up automatically — no restart needed. Re-running the command updates the skill to the version bundled with the current npm release.

**Verify** the skill loaded by asking your AI assistant:

```
What FeathersJS topics are covered in the docs?
```

You should see it call `get-menu` before answering. If it answers without calling any MCP tool, confirm the MCP server is also configured (see [Getting Started](#getting-started) above).

### Verify the skill is working

Run through these four checks — each tests a different part of the skill:

| Check | What to ask | What to look for |
|-------|-------------|-----------------|
| **Doc grounding** | `How do before hooks work in FeathersJS v6?` | Calls `search-doc`, includes a `source_url` link |
| **Unsupported feature** | `Does FeathersJS have built-in GraphQL support?` | Searches first, then explicitly says "not found in docs" — no invented API names |
| **Community search** | `Are there community examples of Google OAuth in FeathersJS?` | Calls both `search-doc` and `search-community`, labels results separately |
| **Share flow** | `I just built a JWT revocation feature in FeathersJS. Help me share it.` | Calls `share-knowledge` and returns a clickable GitHub issue URL — does not claim it submitted anything |

### Uninstall

```bash
rm -rf .agents/skills/feathersjs-mcp
```

---

## Links

- **npm:** https://www.npmjs.com/package/feathersjs-mcp
- **GitHub:** https://github.com/nazifishrak/FeathersMCP
- **Internal Testing Plan:** [ACCESSIBILITY_TESTING.md](./ACCESSIBILITY_TESTING.md)

## Available Tools

The server exposes 6 tools over the MCP protocol:

### `get-schema`

Returns the database schema for the documentation tables. No parameters.

### `get-menu`

Returns the full navigation structure of the FeathersJS documentation — 47 documents across 4 categories (`api`, `guides`, `cookbook`, `ecosystem`). Call this first to understand what's available. No parameters.

### `search-doc`

Full-text search across the documentation with FTS5 and Porter stemming.

| Parameter  | Type   | Required | Description                                                     |
| ---------- | ------ | -------- | --------------------------------------------------------------- |
| `query`    | string | yes      | Search query                                                    |
| `category` | string | no       | Filter by category: `api`, `guides`, `cookbook`, or `ecosystem` |
| `limit`    | number | no       | Max results (default: 5)                                        |

### `get-doc`

Fetches the full content of a documentation page. Use after `search-doc` when you need the complete text or all code examples.

| Parameter | Type   | Required | Description                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| `id`      | number | no       | Document ID from `get-menu` or search results         |
| `path`    | string | no       | Source path (e.g. `api/hooks`, `guides/basics/setup`) |
| `title`   | string | no       | Exact document title (e.g. `Hooks`)                   |

Provide at least one of `id`, `path`, or `title`. Prefer `id` or `path` for unique lookups.

### `share-knowledge`

Generates a pre-filled GitHub Issue link to share a tutorial or project with the FeathersJS community. Clicking the link opens a new issue with YAML frontmatter and your content already filled in. Ingestion runs after a maintainer **closes** the issue when it includes both labels: `community-contribution` and `approved-post`; the Worker upserts by issue URL if the same issue is ingested again.

| Parameter | Type     | Required | Description                           |
| --------- | -------- | -------- | ------------------------------------- |
| `title`   | string   | yes      | Title of your tutorial or project     |
| `author`  | string   | yes      | Your GitHub username                  |
| `content` | string   | yes      | Markdown body of your contribution    |
| `tags`    | string[] | yes      | Topic tags (e.g. `["hooks", "auth"]`) |

### `search-community`

Searches the FeathersJS community knowledge base (Cloudflare D1 with FTS5) for tutorials and projects shared by other users. Use alongside `search-doc` for comprehensive answers.

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `query`   | string | yes      | Search terms (e.g. `"jwt authentication"`) |
