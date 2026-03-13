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

### 2. Use MCP tools in chat

Open your IDE and the FeathersJS documentation tools will be available in chat. Ask your AI assistant about FeathersJS hooks, services, authentication, or any other topic.

### Optional: install locally

```bash
npm install feathersjs-mcp
```

Locks the version in your `package.json` so all contributors use the same release. Also required for the troubleshooting Option B below.

## GitHub Release

Download the latest zip from [Releases](https://github.com/nazifishrak/FeatherMCP/releases). Extract it, open the folder in your IDE, and the MCP server is ready to use. The archive includes pre-configured `.vscode/` and `.cursor/` settings — no setup needed.

## Troubleshooting

### macOS: `spawn npx ENOENT` or `spawn node ENOENT`

On macOS, if Cursor or VS Code was opened from the Dock or Finder (not the terminal), it may not have `node` or `npx` in its PATH.

**Option A:** Open your project from the terminal so the IDE inherits your shell PATH:

```bash
cursor .
# or
code .
```

**Option B:** Install the package locally (see [Optional: install locally](#optional-install-locally)) and use the full path to `node` in your config. Find it by running `which node`, then update config file:

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

## Links

- **npm:** https://www.npmjs.com/package/feathersjs-mcp
- **GitHub:** https://github.com/nazifishrak/FeatherMCP

## Available Tools

The server exposes 4 tools over the MCP protocol:

### `get-schema`

Returns the database schema for the documentation tables. No parameters.

### `get-menu`

Returns the full navigation structure of the FeathersJS documentation — 47 documents across 4 categories (`api`, `guides`, `cookbook`, `ecosystem`). Call this first to understand what's available. No parameters.

### `search-doc`

Full-text search across the documentation with FTS5 and Porter stemming.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | yes | Search query |
| `category` | string | no | Filter by category: `api`, `guides`, `cookbook`, or `ecosystem` |
| `limit` | number | no | Max results (default: 5) |

### `get-doc`

Fetches the full content of a documentation page. Use after `search-doc` when you need the complete text or all code examples.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | no | Document ID from `get-menu` or search results |
| `path` | string | no | Source path (e.g. `api/hooks`, `guides/basics/setup`) |
| `title` | string | no | Exact document title (e.g. `Hooks`) |

Provide at least one of `id`, `path`, or `title`. Prefer `id` or `path` for unique lookups.
