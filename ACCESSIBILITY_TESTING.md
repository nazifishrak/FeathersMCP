# FeathersMCP Internal Testing Plan (Prompt, Tooling, and Ingest Reliability)

This document defines an internal test plan to verify that FeathersMCP works reliably in real assistant workflows for building and learning FeathersJS.

## What We Are Testing

We are not focusing on screen-reader or keyboard-only UI behavior in this plan.

We are testing whether FeathersMCP:
1. Calls the right tools at the right time.
2. Retrieves correct FeathersJS documentation for implementation and learning tasks.
3. Handles non-existent or unsupported FeathersJS requests safely and clearly.
4. Automatically supports community contribution flow (blog-style post + valid issue URL).
5. Returns useful and reliable `search-community` results.
6. Can be set up by a user without hand-holding.
7. Successfully ingests closed contribution issues into the community database pipeline.
8. Works well with agent skills (current and future usage patterns).

## Definition: “Accessibility” for This Plan

For FeathersMCP, accessibility here means:
- A user can set it up and use it independently.
- Prompts in natural language still trigger the right MCP behavior.
- Output is clear enough to act on without additional guidance.

## Test Environment

- IDE: Cursor or VS Code MCP-compatible setup.
- MCP server configured from README instructions.
- Use a clean chat context per scenario when possible.
- Capture logs/screenshots for failures.

## Test Matrix (Scenarios, Prompts, Expected Behavior)

### A. Tool Routing and Documentation Retrieval

Goal: verify that implementation requests correctly trigger `search-doc` and `get-doc` with useful follow-up.

Prompts to test:
1. "Add chat moderation to my Feathers app. I need a hook that blocks banned words before create."
2. "How do before and after hooks differ in Feathers v6?"
3. "Show me the exact docs section for authentication setup and summarize it with a practical example."
4. "List what docs categories are available first, then find anything about channels."

Expected outcomes:
- Assistant queries docs first before giving authoritative implementation details.
- Results reference real FeathersJS concepts and do not invent APIs.
- When user asks for exact section/full page, flow progresses from search to full doc retrieval.
- Explanations are implementation-oriented, not only generic summaries.

Pass/fail checks:
- Correct tool choice sequence (`get-menu`/`search-doc`/`get-doc`) for the prompt intent.
- No hallucinated FeathersJS methods/options.
- Output includes enough concrete detail for coding.

### B. Edge Cases and Non-Existent Features

Goal: ensure unknown or invalid FeathersJS requests are handled explicitly.

Prompts to test:
1. "How do I use the built-in FeathersJS GraphQL ORM adapter?"
2. "Show me the official Feathers v6 function `app.enableQuantumHooks()` and example usage."
3. "Where is the native Feathers tool for auto-generating Kafka event schemas from services?"

Expected outcomes:
- Assistant says feature/API is not found in Feathers docs when appropriate.
- Assistant offers nearest valid alternative (if any) without pretending certainty.
- Tone remains clear and corrective.

Pass/fail checks:
- Explicit "not found / not in docs" behavior appears where appropriate.
- No fabricated citations or fake doc paths.

### C. Community Contribution Flow (`share-knowledge`)

Goal: verify natural-language requests trigger contribution draft + clickable issue URL.

Prompts to test:
1. "I built JWT + refresh token auth in my Feathers project, help me share it with the community."
2. "Can you turn my implementation notes into a community post and prepare submission?"
3. "I want to publish a short tutorial from this project."
4. "I just finished building role-based access control with Feathers hooks."

Expected outcomes:
- Assistant gathers missing info (title, author, content, tags) if needed.
- Draft resembles a concise blog/tutorial post.
- Final output includes a valid GitHub new-issue URL with:
  - `[Community]` title prefix
  - `community-contribution` label
  - YAML frontmatter fields (`title`, `author`, `tags`, `date`)
- Assistant clearly tells user to click URL to submit.
- For successful implementation outcomes, assistant proactively asks whether the user wants to share with the community.

Pass/fail checks:
- URL opens correctly and pre-fills issue body.
- Required fields are present and parseable.
- Content is not empty, malformed, or missing tags.
- Proactive share prompt appears when user has built something meaningfully shareable.

### D. Community Search Reliability (`search-community`)

Goal: ensure knowledge-base lookups are useful and resilient.

Prompts to test:
1. "Find community tutorials about file uploads in FeathersJS."
2. "Any community posts for Docker deployment + Feathers?"
3. "Search community posts for custom auth strategies."
4. "Search community posts for totally-made-up-topic-xyz." 

Expected outcomes:
- Returns result cards when matches exist.
- Returns graceful no-results message when none exist.
- Distinguishes community contributions from official docs context.

Pass/fail checks:
- Response contains title, author, tags, content preview, and issue link when results exist.
- No crash/unhandled error text for common misses.

### E. Setup and First-Run Usability

Goal: test if a new user can install and start without direct support.

Prompts/tasks to test:
1. Follow README setup in a fresh workspace.
2. Verify tools appear and can be called.
3. Run first learning prompt: "Explain Feathers services and hooks with references."
4. Run first implementation prompt: "Help me add a before hook for input validation."

Expected outcomes:
- Setup is successful via documented steps.
- User can reach productive responses in first session.
- Troubleshooting guidance is enough for common PATH/node issues.

Pass/fail checks:
- Time-to-first-successful-answer is reasonable.
- Any setup confusion is documented with exact step that failed.

### F. Ingest Pipeline Validation (Issue -> Cloudflare -> Search)

Goal: verify contribution ingestion works end-to-end after issue closure.

Test flow:
1. Use `share-knowledge` flow to generate and submit issue.
2. Confirm issue has both labels: `community-contribution` and `approved-post`, plus parseable body.
3. Close issue (or use controlled test issue lifecycle).
4. Verify GitHub workflow `.github/workflows/ingest-to-cloudflare.yml` executes successfully.
5. Verify post appears through `search-community` query.

Expected outcomes:
- Ingest endpoint accepts payload.
- D1 row created/updated correctly.
- Entry is searchable with expected tags/author/title.

Pass/fail checks:
- Workflow does not run if `approved-post` label is missing.
- Workflow run success (no secret/auth/frontmatter parsing failure).
- Searchable entry appears within expected delay window.

### G. Agent Skill Compatibility (Current + Future)

Definition (for this plan):
- An agent skill is a reusable instruction layer/workflow that guides an AI agent to use tools consistently for a task type.

Goal: ensure skill-guided prompts improve tool-use consistency and reduce missed calls.

Prompts to test:
1. "Using the Feathers MCP workflow skill, implement role-based access checks with hooks."
2. "Use the skill to research docs first, then propose a migration plan for auth changes."
3. "Use the skill and share this project to community format."

Expected outcomes:
- Skill leads to more consistent search -> retrieve -> propose behavior.
- Less hallucination and fewer missed tool calls.
- Share/community behavior remains correct under skill-guided flow.

Pass/fail checks:
- Compare with non-skill baseline for consistency and factual accuracy.

## Ownership and Assignment

### Nazif
- Owns pipeline + integration reliability.
- Sections: F (Ingest), D (Community Search), final triage of blocker bugs.

### Maggie
- Owns implementation flow quality for real feature-building prompts.
- Sections: A (Tool Routing + Docs Retrieval), G (Agent Skill Compatibility).

### Maharaj
- Owns setup and first-run UX for new contributors.
- Sections: E (Setup/First Run), plus cross-check of README clarity.

### Nariman
- Owns correctness under edge-case and non-existent-feature prompts.
- Sections: B (Edge Cases), negative testing coverage expansion.

### Nam
- Owns contribution authoring quality and community submission flow.
- Sections: C (Share Knowledge), plus validation of generated issue draft quality.

## Execution Cadence

1. Each owner runs assigned section prompts and logs evidence.
2. Each failure gets severity:
   - P0: data loss, ingest broken, wrong critical guidance.
   - P1: tool routing consistently wrong, invalid issue links, major false claims.
   - P2: partial clarity/usability gaps, formatting inconsistencies.
3. Daily sync: merge findings into one tracker.
4. Retest fixed items before closing.

## Reporting Template (Use for Every Failure)

- Tester:
- Section/Scenario:
- Prompt used:
- Expected behavior:
- Actual behavior:
- Tool behavior observed (if visible):
- Reproducible (Yes/No):
- Severity (P0/P1/P2):
- Screenshot/log link:
- Suggested fix:

## Exit Criteria (Release Gate)

- No open P0 issues.
- All P1 issues fixed or explicitly accepted with owner sign-off.
- Ingest pipeline validated with at least one successful end-to-end contribution.
- Community search validated on both hit and no-hit queries.
- At least one successful skill-guided run and one non-skill baseline comparison completed.
- Proactive community-share suggestion behavior validated in at least one successful implementation scenario.
