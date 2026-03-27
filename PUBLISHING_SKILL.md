# Publishing the feathersjs-mcp Skill

This document is for FeathersMCP maintainers. It covers what to commit, how to publish, and how to keep the skill in sync with the server.

---

## How Users Install the Skill

```bash
npx feathersjs-mcp install-skill
```

Run from the project root. Writes `.agents/skills/feathersjs-mcp/SKILL.md` into the current directory — the cross-platform standard supported by Claude Code, Cursor, Windsurf, Gemini CLI, and others ([agentskills.io](https://agentskills.io)). Re-running it updates in place.

---

## Publishing to npm

The skill ships automatically inside the npm package — no separate release asset needed.

```bash
npm run build
npm version patch   # or minor / major
npm publish
git push && git push --tags
```

Users get the updated skill the next time they run `npx feathersjs-mcp install-skill`.

---

## Updating the Skill

When the MCP tools, documentation structure, or skill guidance changes:

1. Edit `.agents/skills/feathersjs-mcp/SKILL.md`
2. Build, bump, and publish:

```bash
npm run build
npm version patch
npm publish
git add .agents/skills/feathersjs-mcp/SKILL.md package.json package-lock.json
git commit -m "Update feathersjs-mcp skill"
git push && git push --tags
```
