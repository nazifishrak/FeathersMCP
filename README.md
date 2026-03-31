# FeathersJS MCP Server

An MCP server that gives AI assistants access to **FeathersJS v6** official documentation and optional **community** knowledge—search, browse, and retrieve full pages from your IDE.

[![npm](https://img.shields.io/npm/v/feathersjs-mcp)](https://www.npmjs.com/package/feathersjs-mcp)

## Why use this?

Feathers has a large surface area (hooks, services, auth, channels, schemas). Generic models often **mix versions**, invent APIs, or skip edge cases. This server connects your assistant to **real v6 docs** (and optional community posts) so answers can be **grounded in sources** with links to `https://v6.feathersjs.com/...`.

| Without MCP | With `feathersjs-mcp` |
|-------------|------------------------|
| Best-effort recall from training data | Search and fetch **actual** doc pages and code examples |
| Risk of outdated or wrong API names | **`source_url`** and snippets tied to the bundled docs DB |
| Community tips only if the model remembers them | Optional **`search-community`** / **`get-community-post`** (when configured server-side) |

Use it whenever you work on FeathersJS—especially hooks, authentication, and v6 schemas/resolvers.

---

## Requirements

- **Node.js** (LTS recommended, e.g. 20.x) so `npx` can run the published package.
- **npm** (LTS recommended, e.g. 11.x) so `npx` can install the published package.
- The config file must live at the **workspace root** (see below)—this is the most common reason a server “does not connect.”

---
# Setup

## Put the config at the workspace root

Your IDE loads MCP config from the **folder you opened**, not from subfolders.

- **Correct:** Open `my-app/` in VS Code or Cursor and place `.vscode/mcp.json` or `.cursor/mcp.json` in **`my-app/`** (same level as `package.json` if that is your app root).
- **Wrong:** Put the MCP JSON only under `my-app/packages/api/` or `my-app/docs/` — many clients (including **GitHub Copilot** in VS Code) will **not** pick up the server for the workspace, and chat may show no tools.

If you use a monorepo, either open the repo root and put config there, or open the specific package as its own workspace and put config in **that** folder’s root.

---

## Add the MCP server

Pick **one** client section below. After saving the file, **reload the window** or restart the IDE once so the server is registered.

### Cursor

Create **`.cursor/mcp.json`** at the workspace root:

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

### VS Code (including GitHub Copilot Chat)

Create **`.vscode/mcp.json`** at the workspace root:

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

GitHub Copilot uses the same VS Code workspace; if the MCP file is not at the root of the **opened folder**, Copilot may not list or run the server.

### Claude Desktop

Add to `claude_desktop_config.json` (see [Claude Desktop MCP docs](https://modelcontextprotocol.io/quickstart/user)):

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

The first run may download the package via `npx`.

---

## Enable the server in your IDE

1. **Reload** the window after editing MCP config (`Developer: Reload Window` in VS Code, or restart Cursor, Claude).
2. **Command Palette** — **Windows / Linux:** `Ctrl+Shift+P` · **macOS:** `Cmd+Shift+P`.  
- **Cursor:** Open **Cursor Settings → Tools & MCP** → find `feathersjs` under *Installed MCP Servers* → make sure the toggle is **enabled** (green) and it shows a green dot with "7 tools enabled." The JSON config alone is not enough — the server must be toggled on in this settings panel.
- **VS Code + Copilot:** Run `MCP: List Servers` from the command palette → confirm `feathersjs` shows as Running → open Copilot Chat → switch to **Agent** mode → click the Tools icon and enable `feathersjs` tools.
- **Claude Desktop:** Restart the app — tools appear automatically.  
3. **In chat**, ask something that should trigger tools, for example:  
   `What FeathersJS topics are covered in the official docs?`  
   You should see the assistant call **`get-menu`** (or **`search-doc`**) rather than answering from memory alone.

If the palette shows no MCP errors but tools never appear, re-check that the JSON file is at the **workspace root** ([section above](#put-the-config-at-the-workspace-root)).

### Optional: install locally (pin version + easier PATH)

```bash
npm install feathersjs-mcp
```

Then you can point `command` / `args` at `node_modules/feathersjs-mcp/build/index.js` and a full path to `node` if `npx` is not found (see [Troubleshooting](#troubleshooting)).

---

## GitHub Release

Download the latest zip from [Releases](https://github.com/nazifishrak/FeathersMCP/releases). Extract it, open the folder in your IDE, and use the included `.vscode/` / `.cursor/` examples if present.

---

## Troubleshooting

### MCP config in a nested folder

**Symptom:** GitHub Copilot / VS Code / Cursor never connects to the server, or tools never appear.  
**Fix:** Move **`.vscode/mcp.json`** or **`.cursor/mcp.json`** to the **root of the folder you opened** in the IDE, then reload the window.

### macOS: `spawn npx ENOENT` or `spawn node ENOENT`

If the app was launched from the Dock/Finder, it may not inherit your shell `PATH`.

**Option A:** Open the project from a terminal so the IDE inherits PATH:

```bash
cursor .
# or
code .
```

**Option B:** Install the package locally and use the full path to `node` (from `which node`):

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

Adjust `command` to match your machine.

---

## Agent skill (optional)

The `feathersjs-mcp` **skill** adds structured guidance on top of the tools—doc workflow, community search, and share flow—for clients that support `.agents/skills/` (see [agentskills.io](https://agentskills.io)).

> Without the skill, tools still work. With the skill, assistants are nudged to use them consistently.

**Install** (from project root):

```bash
npx feathersjs-mcp install-skill
```

This writes `.agents/skills/feathersjs-mcp/SKILL.md`. Re-run to update to the bundled version.

**Quick check:** Ask “What FeathersJS topics are covered in the docs?” and confirm **`get-menu`** (or similar) is called.

**Uninstall:** `rm -rf .agents/skills/feathersjs-mcp`

**Deeper checks:** see [MODEL_MCP_EVAL.md](./MODEL_MCP_EVAL.md) if you maintain evaluation notes in this repo.

---

## Available tools

The server exposes **seven** tools over MCP:

| Tool | Purpose |
|------|---------|
| `get-schema` | Schema of the bundled `documents` table (for query-aware assistants). |
| `get-menu` | Full doc navigation (categories, paths, ids). |
| `search-doc` | Full-text search over official v6 docs (snippets + URLs). |
| `get-doc` | Full page text and code examples by id, path, or title. |
| `search-community` | Search community contributions (requires hosted Worker; may be empty). |
| `get-community-post` | Full community post by id. |
| `share-knowledge` | Build a pre-filled GitHub issue URL for community submissions. |

### `get-schema`

No parameters. Returns metadata for the `documents` table used by search tools.

### `get-menu`

No parameters. Returns the official doc structure (on the order of **47** pages across `api`, `guides`, `cookbook`, `ecosystem`).

### `search-doc`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | yes | Search text |
| `category` | string | no | `api`, `guides`, `cookbook`, or `ecosystem` |
| `limit` | number | no | Max hits (default: 5) |

### `get-doc`

Provide **at least one** of `id`, `path`, or `title`. Prefer **`id`** or **`path`** for uniqueness.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | From `get-menu` or search |
| `path` | string | e.g. `api/hooks`, `guides/basics/setup` |
| `title` | string | Exact title (can be ambiguous) |

### `share-knowledge`

| Parameter | Type | Required |
|-----------|------|----------|
| `title` | string | yes |
| `author` | string | yes (e.g. GitHub username) |
| `content` | string | yes (Markdown) |
| `tags` | string[] | yes |

Opens a draft GitHub issue; publishing to the community index follows your repo’s workflow and labels.

### `search-community`

| Parameter | Type | Required |
|-----------|------|----------|
| `query` | string | yes |

### `get-community-post`

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | number | yes (from `search-community`) |

---

## Links

- **npm:** https://www.npmjs.com/package/feathersjs-mcp  
- **GitHub:** https://github.com/nazifishrak/FeathersMCP  
- **Feathers v6 site:** https://v6.feathersjs.com/

---

## More in this repository

- [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) — architecture and data flow  
- [ACCESSIBILITY_TESTING.md](./ACCESSIBILITY_TESTING.md) — internal testing notes  
- [CI_CD.md](./CI_CD.md) — CI/CD overview  
