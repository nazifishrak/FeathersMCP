# FeatherMCP Skill Accessibility Testing

This document defines the internal testing scenarios for the `feathermcp-guide` skill created for issue #71.

The goal is to verify that the skill is:

- beginner-friendly for first-time users
- reliable about FeatherMCP tool selection
- explicit when docs do not support a feature
- clear about the difference between official docs and community content
- able to guide sharing flow end to end

## How To Use This File

Run each scenario with the `feathermcp-guide` skill enabled and check the pass criteria.
The evaluator should prefer observable behaviors over vague impressions.

## Scenario 1: New User Onboarding In Cursor

Prompt:

`I have never used FeatherMCP before. How do I set it up in Cursor and what should I ask first to confirm it works?`

Pass criteria:

- Detects that the user is unconfigured.
- Gives the correct `.cursor/mcp.json` config.
- Explains reload / Agent mode / tool enablement in plain language.
- Suggests a first verification prompt.
- Does not tell the user to go read the docs before helping.

## Scenario 2: VS Code Troubleshooting

Prompt:

`I added feathersjs-mcp to VS Code but Copilot chat still does not show any tools.`

Pass criteria:

- Treats this as a setup-gap or troubleshooting question.
- Gives the `.vscode/mcp.json` shape for the Feathers server.
- Tells the user to reload VS Code and use Agent mode with tools enabled.
- Mentions PATH troubleshooting when relevant.

## Scenario 3: Feature Implementation

Prompt:

`How do I add moderation hooks to a chat service in FeathersJS?`

Pass criteria:

- Uses `search-doc` before answering.
- Uses `get-doc` when the snippet is truncated or not enough.
- Gives Feathers-specific implementation guidance grounded in retrieved docs.
- Includes at least one official documentation link or `source_url`.

## Scenario 4: Concept Learning

Prompt:

`What is the difference between before, after, and around hooks in Feathers?`

Pass criteria:

- Uses FeatherMCP docs rather than generic framework knowledge.
- Explains the concepts clearly for a learner.
- Keeps the answer tied to FeathersJS v6.

## Scenario 5: Unsupported Feature Handling

Prompt:

`Does FeathersJS have built-in GraphQL support?`

Pass criteria:

- Searches the docs before concluding.
- Uses explicit "not found in docs" language if appropriate.
- Does not invent APIs, packages, or config options.
- Suggests the nearest documented alternative.

## Scenario 6: Community Search With Official Separation

Prompt:

`Are there any community examples of Google OAuth in Feathers?`

Pass criteria:

- Searches official docs first.
- Uses `search-community` when relevant.
- Separates official docs from community findings in the answer.
- Handles both no-hit and tool-error community cases honestly.

## Scenario 7: Share Flow

Prompt:

`I just finished a tutorial on revoking JWTs in FeathersJS. Help me share it with the community.`

Pass criteria:

- Gathers title, author, content, and tags.
- Uses `share-knowledge`.
- Returns a clickable GitHub issue URL.
- Tells the user the link still needs to be clicked to submit.

## Scenario 8: macOS ENOENT Troubleshooting

Prompt:

`Cursor says spawn npx ENOENT when it tries to start FeatherMCP on my Mac.`

Pass criteria:

- Explains the terminal-launch workaround with `cursor .` or `code .`.
- Offers the local install fallback with `npm install feathersjs-mcp` and `which node`.
- Shows the correct full-node-path config pattern.

## Exit Criteria

The skill is ready for issue #71 when:

- a new user can reach a first successful FeatherMCP query from chat guidance alone
- implementation and concept questions trigger the correct doc workflow
- unsupported features are handled with explicit non-hallucinating language
- community search is honest about hits, no hits, and failures
- share flow produces a valid pre-filled GitHub issue link
