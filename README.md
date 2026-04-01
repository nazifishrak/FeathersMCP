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

## Prerequisites

| Requirement | Link |
|-------------|------|
| [Node.js](https://nodejs.org) (v18 LTS or later) | https://nodejs.org |
| [npm](https://www.npmjs.com) (bundled with Node) | https://www.npmjs.com |
| An MCP-compatible AI client (see [Installation](#installation)) | (n/a) |

**Supported clients:** [VS Code](https://code.visualstudio.com) (with [GitHub Copilot](https://github.com/features/copilot)), [Cursor](https://cursor.com), [Claude Desktop](https://claude.ai/download), [Zed](https://zed.dev), and [any other MCP host](https://modelcontextprotocol.io/clients).

> Each client uses its own MCP config location. Follow the section for your client below (Step 1 shows the exact file or setting to edit).

---

## Installation

The server command is the same everywhere; only the **config file location** and **JSON shape** depend on your MCP host. Open the section for the client you use.

### VS Code (GitHub Copilot)

**Step 1.** Create `.vscode/mcp.json` inside your project folder:

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

**Step 2.** Reload the window — open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run **Developer: Reload Window**.

**Step 3.** Open the Command Palette again, run **MCP: List Servers**, and confirm `feathersjs` appears in the list.
- If it shows as **Stopped**, click it and select **Start Server**.
- If VS Code prompts you to **trust the server**, click **Allow**. Without this the server will not run.
- If it is listed but disabled, enable it from the same panel.

**Step 4.** Open GitHub Copilot Chat, switch to **Agent** mode, and ask:
> `What FeathersJS topics are covered in the official docs?`

If the server is connected, the assistant should call a tool like `get-menu` or `search-doc`. If no tool call appears, check that the server is running in **MCP: List Servers** and that you are in Agent mode, not Ask or Edit mode.

---

### Cursor

**Step 1.** Create the config file. Two options:
- **Project only:** `.cursor/mcp.json` inside your project folder (can be committed to git and shared with teammates)
- **All projects:** `~/.cursor/mcp.json` in your home directory (local to your machine only)

If both files exist, the project-level file takes priority.

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

**Step 2.** Reload the window — open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run **Developer: Reload Window**.

**Step 3.** Open **Cursor Settings → Tools & MCP** and confirm `feathersjs` appears with a green status indicator. If the toggle next to it is off, turn it on. Adding the config file alone is not enough — the server must be enabled in this panel.

**Step 4.** Open Cursor Chat in **Agent** mode and ask:
> `How do Feathers hooks work in v6?`

If the server is active, the assistant should call `search-doc` and return a result with a source URL. If no tool is called, check that the server is toggled on in **Settings → Tools & MCP** and that you are in Agent mode, not Ask or Edit mode.

> **Tip:** Type `@feathersjs` in the chat input to explicitly target this MCP server.

---

### Claude Desktop

**Easier path — Desktop Extensions:** If you see an **Extensions** option in Claude Desktop's settings, that is the simplest way to add an MCP server without editing config files. Check the [Claude help center](https://support.claude.ai/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) first to see if it is available for your version.

**Manual path — config file:**

**Step 1.** Open the config file for your OS:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Step 2.** Add the server entry (create the file if it does not exist):

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

**Step 3.** Fully restart Claude Desktop — quit and reopen, do not just reload. The first run downloads the package automatically.

**Step 4.** Ask a test question:
> `What authentication strategies does Feathers v6 support?`

If no tool is called, check Claude's MCP logs (**Help → Open Logs Folder**) for connection errors. See [Claude Desktop MCP docs](https://modelcontextprotocol.io/quickstart/user) for more detail.

---

### Zed

**Step 1.** Add the server to your Zed settings. Open **Zed Settings** (`Cmd+,`) and add a `context_servers` block:

```json
{
  "context_servers": {
    "feathersjs": {
      "command": {
        "path": "npx",
        "args": ["-y", "feathersjs-mcp@latest"]
      }
    }
  }
}
```

Alternatively, open the **Agent Panel** (`Cmd+?`), click the settings icon, and use **Add Custom Server** to register the same command.

**Step 2.** Check the status indicator next to the server name in the Agent Panel. A green dot means it is active. If it is grey or shows an error, verify `npx` is on your PATH by opening Zed from a terminal: `zed .`

**Step 3.** Note that Zed may ask you to **approve tool calls** before they run — this is expected. Confirm when prompted.

**Step 4.** Ask a test question in the Agent Panel:
> `What topics are covered in the official FeathersJS v6 docs?`

If the server is connected, it should call `get-menu` or `search-doc`. Mentioning `feathersjs` by name in your prompt can help Zed route to the right server.

---

### Other MCP hosts

Register the same command — `npx` with args `["-y", "feathersjs-mcp@latest"]` — using your client's MCP config format. The [MCP clients list](https://modelcontextprotocol.io/clients) links setup docs for each supported host.

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
Check the client-specific step for your MCP host above — most clients require you to manually enable or start the server after adding the config file. Also verify the config file is in the correct location for your client (see the table in Prerequisites).

**macOS: `spawn npx ENOENT`**
Open your project from a terminal (`cursor .` / `code .` / `zed .`) so the IDE inherits your shell `PATH`. Or install locally and use the full path to `node` (from `which node`):

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

**Tools appear but no tool is called in chat**
Make sure you are in **Agent** mode — tools are not available in Ask or Edit mode. In Cursor, also verify the server toggle is on in **Settings → Tools & MCP**.

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
