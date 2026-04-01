# FeathersMCP

[![npm](https://img.shields.io/npm/v/feathersjs-mcp)](https://www.npmjs.com/package/feathersjs-mcp)

An [MCP](https://modelcontextprotocol.io) server that connects your AI assistant to the **[FeathersJS v6](https://feathersjs.com)** documentation. Get accurate, source-linked answers about hooks, services, authentication, and more, directly in your IDE.

---

## Why use FeathersMCP?

AI assistants answering from memory often mix up Feathers versions, invent APIs, or miss edge cases. FeathersMCP gives your assistant **live access to the real v6 docs** so answers come with a `source_url` you can verify.

| Without FeathersMCP | With FeathersMCP |
|---------------------|-----------------|
| Training-data guesses, risk of outdated APIs | Searches and returns actual v6 documentation pages |
| No citations | Every answer includes a link to `v6.feathersjs.com` |
| No community patterns | Optional community knowledge base (real-world tutorials) |

---
# Setup

## Prerequisites

| Requirement | Link |
|-------------|------|
| [Node.js](https://nodejs.org) (v18 LTS or later) | https://nodejs.org |
| [npm](https://www.npmjs.com) (bundled with Node) | https://www.npmjs.com |
| An MCP-compatible AI client (see [Installation](#installation)) | (n/a) |

**Supported clients:** [VS Code](https://code.visualstudio.com) (with [GitHub Copilot](https://github.com/features/copilot)), [Cursor](https://cursor.com), [Claude Desktop](https://claude.ai/download), [Zed](https://zed.dev), and [any other MCP host](https://modelcontextprotocol.io/clients). Each host uses its own MCP config format (same server, different JSON shape).

> The MCP config file must be placed in the **root of the folder you open** in your IDE, not in a subfolder. Putting it in the wrong directory is the most common reason the server fails to connect.

---

## Installation

The server command is the same everywhere; only the **config file location** and **JSON shape** depend on your MCP host. Open the section for the client you use.

### VS Code (GitHub Copilot)

**Step 1.** Create `.vscode/mcp.json` at your project root:

```json
{
  "servers": {
    "feathersjs": {
      "type": "stdio",
      "command": "npx",
      "args": ["feathersjs-mcp@latest"]
    }
  }
}
```

**Step 2.** Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`), search **MCP**, and confirm the server appears in the list.

**Step 3.** In GitHub Copilot Chat, ask:
> `What FeathersJS topics are covered in the official docs?`

You should see a `search-doc` or `get-menu` tool call in the response.

---

### Cursor

**Step 1.** Create `.cursor/mcp.json` at your project root:

```json
{
  "mcpServers": {
    "feathersjs": {
      "command": "npx",
      "args": ["feathersjs-mcp@latest"]
    }
  }
}
```

**Step 2.** Reload the window (`Cmd+Shift+P` / `Ctrl+Shift+P` → **Developer: Reload Window**).

**Step 3.** Open Cursor Chat and ask:
> `How do Feathers hooks work in v6?`

The assistant should call `search-doc` and return a result with a source URL.

> **Tip (Cursor only):** Type `@feathersjs` in the chat input to target this MCP server explicitly.

---

### Claude Desktop

**Step 1.** Open your Claude Desktop config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Step 2.** Add the server entry:

```json
{
  "mcpServers": {
    "feathersjs": {
      "command": "npx",
      "args": ["-y", "feathersjs-mcp@latest"]
    }
  }
}
```

**Step 3.** Restart Claude Desktop. The first run downloads the package automatically. Ask:
> `What authentication strategies does Feathers v6 support?`

See [Claude Desktop MCP docs](https://modelcontextprotocol.io/quickstart/user) for more detail.

---

### Zed and other MCP hosts

Use your client’s MCP settings (often a JSON file or UI) and register the same command: `npx` with args `["feathersjs-mcp@latest"]` (or `["-y", "feathersjs-mcp@latest"]` where `npx` needs `-y`). The [MCP clients list](https://modelcontextprotocol.io/clients) links each host’s installation docs.

---

## Optional: pin the version locally

```bash
npm install feathersjs-mcp
```

Locks the package in `package.json` so all contributors use the same release. Swap `"npx"` for `"node"` and point `args` at `node_modules/feathersjs-mcp/build/index.js`.

---

## Agent skill (optional)

The skill file adds a workflow guide so your assistant searches docs and community **before** answering from memory.

```bash
# Install
npx feathersjs-mcp@latest install-skill

# Uninstall
rm -rf .agents/skills/feathersjs-mcp
```

Works with Cursor, Claude Code, Windsurf, Gemini CLI, and any tool that follows the [agentskills.io](https://agentskills.io) standard. Re-run the install command to update it.

---

## Prompts to try

These natural-language questions demonstrate what FeathersMCP is good at. Paste any of them into your AI chat after installation.

| What you ask | Tool triggered |
|---|---|
| `What topics are covered in the official FeathersJS v6 docs?` | `get-menu` (full doc index) |
| `How does authentication work in Feathers v6?` | `search-doc` (official pages + source URL) |
| `Show me the full page on Feathers hooks, including code examples.` | `get-doc` (full hooks page + examples) |
| `Are there any real-world patterns for using Feathers with React?` | `search-community` (tutorials and patterns) |

You don't need to mention tool names. The server picks the right one based on your question.

---

## Troubleshooting

**Server not connecting / tools never appear**  
Move the MCP JSON file to the **root of the folder you opened** in the IDE, then reload the window.

**macOS: `spawn npx ENOENT`**  
Open your project from a terminal (`cursor .` / `code .`) so the IDE inherits your shell `PATH`. Or install locally and use the full path to `node` (from `which node`):

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

---

## Available tools

| Tool | Description |
|------|-------------|
| `get-menu` | Full doc index (categories, paths, IDs) |
| `search-doc` | Full-text search across 47 official v6 pages |
| `get-doc` | Full page content and code examples (by id, path, or title) |
| `get-schema` | Schema of the local docs database |
| `search-community` | Search community tutorials and patterns |
| `get-community-post` | Full community post by id |
| `share-knowledge` | Generate a pre-filled GitHub issue to submit a community post |

---

## Links

- **npm package:** https://www.npmjs.com/package/feathersjs-mcp
- **GitHub repo:** https://github.com/nazifishrak/FeathersMCP
- **FeathersJS v6 docs:** https://feathersjs.com / https://v6.feathersjs.com
- **MCP standard:** https://modelcontextprotocol.io
- **Agent skills:** https://agentskills.io
