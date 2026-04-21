# FeathersMCP — Setup from scratch (repository)

This checklist is for **engineers** who have cloned the GitHub repository: verify the build, tests, and (optionally) a local MCP connection—for example before **transfer of ownership**, when **onboarding** new team members to the codebase, or under **CI**-like conditions.

**Not required for end users:** Anyone who only runs the published server via `npx feathersjs-mcp` (as in the root [README.md](../../README.md)) does **not** need this document; the README installation steps are sufficient.

Use it on a **clean** machine when you want to prove “clone → install → build → test” works. Adjust paths for your OS.

**Prerequisites:** [Node.js](https://nodejs.org) **18 LTS or newer** (20 LTS recommended) and npm.

---

## 1. Clone and install

```bash
git clone https://github.com/daffl/FeathersMCP.git
cd FeathersMCP
npm ci
```

---

## 2. Build

```bash
npm run build
```

This compiles TypeScript to `build/` (including `build/index.js`, the MCP entrypoint). The repo lists `build/` in `.gitignore`; you must run `npm run build` after every clone.

---

## 3. Verify the server and database (no IDE required)

```bash
npm run test:mcp
```

Expect **all checks to pass**, including **7 tools** registered and smoke calls for doc search, community tools, and `share-knowledge`.

Other useful checks:

```bash
npm run test:search   # SQLite / FTS smoke
npm run test:pipeline # Full ingest pipeline (slower)
```

---

## 4. Run the MCP server manually (optional sanity check)

```bash
npm start
```

The process will appear to “hang” with no prompt — that is normal. It speaks **JSON-RPC over stdio** for MCP hosts. Press `Ctrl+C` to exit.

---

## 5. Connect your IDE (pick one)

Use the same **command** everywhere: `npx` with package `feathersjs-mcp@latest` (or pin with a local `npm install` — see [README.md](../../README.md) “Optional: pin the version locally”).

### VS Code (GitHub Copilot)

1. Create **`.vscode/mcp.json`** at the **root of the folder you opened** in VS Code:

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

2. **Developer: Reload Window**
3. Command Palette → **MCP: List Servers** → start `feathersjs` if needed; trust the server if prompted.
4. Copilot Chat → **Agent** mode → ask: *What FeathersJS topics are covered in the official docs?*

### Cursor

1. Create **`.cursor/mcp.json`** at the project root (or use `~/.cursor/mcp.json` for all projects).

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

2. Reload the window.
3. **Cursor Settings → Tools & MCP** → enable `feathersjs`.
4. Chat in **Agent** mode with the same test question as above.

### Claude Desktop

1. Edit the config file for your OS:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Merge this server entry (create valid JSON if the file is new):

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

3. **Fully quit and restart** Claude Desktop (not just reload).
4. Ask a Feathers doc question and confirm tools run (check **Help → Open Logs Folder** if something fails).

### Zed

Add a `context_servers` entry per [README.md](../../README.md) Zed section, or use **Agent Panel → Add Custom Server** with `npx` / `-y` / `feathersjs-mcp@latest` as documented there.

---

## 6. Optional: install the Agent Skill

From your **project** root (where you want `.agents/skills/`):

```bash
npx feathersjs-mcp@latest install-skill
```

Re-run after npm upgrades to refresh `SKILL.md`.

---

## Troubleshooting

| Symptom | What to try |
|--------|-------------|
| `spawn npx ENOENT` (macOS) | Launch the IDE from a terminal (`cursor .`, `code .`) so `PATH` includes `npx`, or use a local install + full path to `node` (see main README). |
| Tools never appear | Wrong MCP JSON location (must be workspace root), server not started/trusted, or chat not in **Agent** mode. |
| `build/index.js` missing | Run `npm run build`. |

---

## Where to read next

- **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** — architecture, data flow, file map.
- **[HANDOVER.md](./HANDOVER.md)** — ownership and operations summary, limitations, ops checklist (for maintainers and technical owners).
- **[README.md](../../README.md)** — end-user overview and IDE-specific MCP snippets (what npm users follow).
