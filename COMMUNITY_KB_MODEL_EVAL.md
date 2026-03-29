# Community knowledge base — model evaluation (GitHub Copilot & others)

## Contents

- [Seeded posts (ground truth)](#what-is-currently-seeded-ground-truth-for-judging-answers)
- [Question bank (C1–C3)](#question-bank-copy-paste--short-neutral-no-tool-hints)
- [Results (summary tables)](#results-summary-tables) — without skill · with skill · **Skill effect** matrix
- [Session notes — with skill (2026-03-29)](#session-notes--with-skill-batch-2026-03-29)
- [Detailed run log](#detailed-run-log-paste-screenshots--transcripts-here)

---

**Goal:** See whether **each model**, **without being told which tool to use**, chooses **`search-community`** / **`get-community-post`** when the question matches topics in **your seeded D1 posts**. You are testing **emergent retrieval**, not compliance with explicit instructions.

**How this differs from “tell it to use community”:** The prompts below are **short and neutral**. They do **not** say “use MCP,” “search community,” or “FeathersMCP.” If the model only uses **`search-doc` / `get-doc`**, that is a **meaningful result** (it did not “detect” or prioritize community on its own). If it uses **`search-community`**, that is the outcome you’re looking for. **Skill on vs off** is summarized in the **Skill effect** table under [Results (summary tables)](#results-summary-tables) (same models, comparable prompts).

**Not what this file tests:** Whether official SQLite docs work (you already verified that separately).

**Tools involved**

| Tool | When it hits Cloudflare |
|------|-------------------------|
| `search-community` | GET Worker `/search?q=…` → D1 FTS on `contributions` |
| `get-community-post` | GET Worker `/community-post?id=…` → full row |

If the Worker is down or empty, tools return errors or “no posts found” — that is a **different** failure mode than “model skipped tools.”

---

## What is currently seeded (ground truth for judging answers)

Use this to spot **hallucination**: if the model invents authors, titles, or patterns **not** below while claiming “community KB,” flag it.

### Post A — Auth0 + JWT + refresh tokens

| Field | Value |
|-------|--------|
| **Title** | FeathersJS + Auth0: JWT and Refresh Token Setup |
| **Author** | saikou |
| **Tags** | feathersjs, auth0, authentication, jwt, refresh-token |
| **Distinct ideas** | Feathers validates JWT / `authenticate('jwt')`; Auth0 owns OAuth, refresh issuance & rotation; client refreshes with Auth0 then retries Feathers; short-lived access tokens; refresh rotation in Auth0; sample snippet registers `jwt`, `auth0`, `oauth()`. |

### Post B — RBAC / AWS IAM–style hooks

| Field | Value |
|-------|--------|
| **Title** | Role-Based Access Control with Feathers Hooks (AWS IAM-style) |
| **Author** | KuanKongy |
| **Tags** | tutorial, authentication, authorization, hooks, rbac, security |
| **Distinct ideas** | RBAC via hooks; IAM-style **permission policies**; policies attached to users/groups; hook runs **before** service methods; multi-tenant / enterprise / audit-style use cases. |

### Duplicate note (important for your tests)

You listed **two** entries with the **same** RBAC title/author/body. If both were ingested, D1 may contain **two rows** with the same title — `search-community` can show **duplicate-looking** hits with **different `id`** values. That is **expected** until duplicates are removed server-side. When logging results, record **post id** from search if visible.

---

## Question bank (copy-paste) — short, neutral, no tool hints

Use **exactly** these lines (or trivial rewordings) so runs stay comparable. **Do not** add “use MCP” or “check community” unless you are running a *different* experiment.

### C1 — Auth0 / JWT / refresh (aligned with Post A)

```text
How do Feathers and Auth0 usually split JWT validation and refresh token handling?
```

**Why this shape:** Matches your seeded write-up (Feathers vs Auth0 responsibilities) without naming tools. Official docs may also discuss auth; the question does **not** force community retrieval—it tests whether the model **chooses** it.

**If community was retrieved:** Ground truth is still Post A (saikou; Auth0 owns refresh/OAuth; Feathers JWT + hooks; etc.).

---

### C2 — IAM-style RBAC + hooks (aligned with Post B)

```text
How would you implement AWS IAM–style RBAC using Feathers hooks?
```

**Why this shape:** Very specific (“IAM-style,” “RBAC,” “hooks”)—your seed is one of the few places that combination appears as a **tutorial framing**. Still not an instruction to call any tool.

**If community was retrieved:** Ground truth is Post B (KuanKongy; policies before service methods; IAM-like model).

---

### C3 — Fine-grained permissions (can match Post B; may also match official docs)

```text
What’s a good pattern for fine-grained permissions before service methods in Feathers?
```

**Why this shape:** Broader than C2; some models may answer from **official docs only** via `search-doc`. That outcome is **useful data** (“no community retrieval on a borderline question”).

---

## How to read outcomes (important)

| Outcome | Meaning |
|--------|---------|
| **`search-community` / `get-community-post` used** | Model **did** pull from Cloudflare-backed KB (what you want to compare across models). |
| **Only `get-menu` / `search-doc` / `get-doc`** | Model stayed on **official** docs path; note it—**not** automatically “wrong,” but **no community detection** for that run. |
| **No tools** | Answered from memory / generic text; flag **hallucination risk** against ground truth below. |

The **Y/N column** is only “did community tools fire?”—not whether the prose answer was good. Use **Notes** for docs-only paths, hallucination, or partial tool use.

## Skill on vs off

| Mode | Setup |
|------|--------|
| **With skill** | `.agents/skills/feathersjs-mcp/SKILL.md` present in the repo (e.g. `npx feathersjs-mcp install-skill`). |
| **Without skill** | Remove or rename that folder for the test, or use a clone without the skill — note which you did. |

Record **skill: yes/no** on every row in the tables below.

---

## Results (summary tables)

Results are split by whether the **`feathersjs-mcp`** agent skill was installed (see [Skill on vs off](#skill-on-vs-off)). **Y** / **N** refers only to **`search-community`** or **`get-community-post`** appearing in the trace.

### Without skill (`feathersjs-mcp` skill absent)

| Date | Client | Model | Skill | Q | Community KB? | All tools observed | Notes |
|------|--------|-------|-------|---|---------------|-------------------|-------|
| 2026-03-27 | Copilot CLI | Claude Opus 4.5 | no | C1 | Y | `search-doc`, `search-community` (×2), `get-doc` | Consulted community + docs; answer emphasizes OAuth + Feathers-issued JWT pattern (see run note). |
| 2026-03-27 | Copilot CLI | Claude Opus 4.5 | no | C2 | Y | `search-doc`, `search-community`, `get-community-post` (id 7), `get-doc` (id 13) | Strong community path: fetched full post + official doc. |
| 2026-03-27 | Copilot CLI | Claude Opus 4.5 | no | C3 | Y | `search-doc`, `search-community` | Both layers; answer is generic composable hooks (no explicit cite of community author in paste). |
| 2026-03-27 | Copilot CLI | Claude Haiku 4.5 | no | C1 | Y | `get-menu`, `search-doc`, `search-community`, `get-doc` (×2), `get-community-post` | Full stack: menu + docs + community post; answer emphasizes JWKS validation + refresh with Auth0. |
| 2026-03-27 | Copilot CLI | Claude Haiku 4.5 | no | C2 | Y | `search-doc` (×2), `search-community`, `get-doc` (id 20, 30), `get-community-post` (id 7) | Same community post id 7 as Opus; two official pages by id before full post. |
| 2026-03-27 | Copilot CLI | Claude Haiku 4.5 | no | C3 | Y | `search-doc` (×2), `search-community` (×2), `get-doc` (id 13) | Iterative search then one full doc; long practical answer (ownership, scoping, fields). |
| 2026-03-28 | GitHub Copilot | GPT-5 Mini | no | C1 | N | *(none)* | TODO + prose; **no MCP tools** in transcript. |
| 2026-03-28 | GitHub Copilot | GPT-5 Mini | no | C2 | N | *(none)* | IAM-style hook example; no MCP. |
| 2026-03-28 | GitHub Copilot | GPT-5 Mini | no | C3 | N | *(none)* | Permissions pattern text; no MCP. |
| 2026-03-28 | Copilot CLI | GPT-5.1 Codex | no | C1 | N | `search-doc`, `get-doc` | Official docs only. |
| 2026-03-28 | Copilot CLI | GPT-5.1 Codex | no | C2 | N | `search-doc`, `get-doc` (id 30) | Official docs only. |
| 2026-03-28 | Copilot CLI | GPT-5.1 Codex | no | C3 | N | *(none)* | Text-only answer; no tools in paste. |
| 2026-03-28 | Copilot CLI | GPT-5.3 Codex | no | C1 | N | *(none)* | No MCP tools in transcript. |
| 2026-03-28 | Copilot CLI | GPT-5.3 Codex | no | C2 | N | *(none)* | No MCP tools in transcript. |
| 2026-03-28 | Copilot CLI | GPT-5.3 Codex | no | C3 | N | *(none)* | No MCP tools in transcript. |
| 2026-03-28 | GitHub Copilot | Gemini 3.1 Pro | no | C1 | Y | `get-menu`, `search-doc` (×2), `search-community`, `get-community-post` (id 4) | Community + docs; post id **4** (not 7). |
| 2026-03-28 | GitHub Copilot | Gemini 3.1 Pro | no | C2 | N | Read workspace `src/hooks/iam.ts` | **Workspace file read**, not Feathers MCP community tools. |
| 2026-03-28 | GitHub Copilot | Gemini 3.1 Pro | no | C3 | Y | `search-doc`, `search-community`, `get-community-post` (id 7); + terminal `grep` | Mixed; **`get-community-post` id 7** matches other sessions’ RBAC seed. |
| 2026-03-28 | GitHub Copilot | Gemini 3 Flash | no | C1 | N | `get-menu`, `get-doc` (×2), `search-doc` | Docs/menu only; no community tools. |
| 2026-03-28 | GitHub Copilot | Gemini 3 Flash | no | C2 | N | `get-menu`, `search-doc` | Docs only. |
| 2026-03-28 | GitHub Copilot | Gemini 3 Flash | no | C3 | Y | `get-menu`, `search-doc`, `search-community`, `get-doc` (path `api/hooks`) | **Community only on C3** in this batch. |
| 2026-03-28 | Cursor (Agent) | Composer 2 | no | C1 | N | `search-doc` (×2), `get-doc` | **feathersmcp** / **feathersjsDocs** only — **no** Search Community / Get Community Post in capture; contrasts with **skill-on** C1. |
| 2026-03-28 | Cursor (Agent) | Composer 2 | no | C2 | N | `search-doc`, `get-doc` | IAM-style RBAC: **Search Doc** + **Get Doc** in one capture; **no community tools**. |
| 2026-03-28 | Cursor (Agent) | Composer 2 | no | C3 | N | *(none visible)* | Fine-grained permissions (“Guiding auth patterns”, etc.): **no MCP tool strip** in screenshots — treat as **N** for community. |

### With skill (`feathersjs-mcp` skill installed)

Transcripts show **`Invoked skill: feathersjs-mcp`** where the client reports it.

| Date | Client | Model | Skill | Q | Community KB? | All tools observed | Notes |
|------|--------|-------|-------|---|---------------|-------------------|-------|
| 2026-03-29 | Copilot CLI | Claude Haiku 4.5 | yes | C1 | Y | Skill, `search-doc` (×2), `search-community`, `get-doc` (id 35), `get-community-post` (id 4) | Full doc + community post. |
| 2026-03-29 | Copilot CLI | Claude Haiku 4.5 | yes | C2 | Y | `search-doc` (×2), `search-community`, `get-community-post` (id 7), `get-doc` (id 13) | Aligns with seeded RBAC post (id 7). |
| 2026-03-29 | Copilot CLI | Claude Haiku 4.5 | yes | C3 | Y | `search-doc` (×3), `search-community` (×2) | Search-heavy; no `get-community-post` in trace. |
| 2026-03-29 | Copilot CLI | Claude Opus 4.5 | yes | C1 | Y | Skill, `search-doc`, `search-community`, `get-community-post` (id 4) | Lean path; post id 4. |
| 2026-03-29 | Copilot CLI | Claude Opus 4.5 | yes | C2 | Y | `search-doc`, `search-community`, `get-community-post` (id 7) | |
| 2026-03-29 | Copilot CLI | Claude Opus 4.5 | yes | C3 | Y | `search-doc`, `search-community` | |
| 2026-03-29 | GitHub Copilot | GPT-5 Mini | yes | C1 | N | *(none)* | Prose only — **no MCP tools** in transcript. |
| 2026-03-29 | GitHub Copilot | GPT-5 Mini | yes | C2 | N | *(none)* | |
| 2026-03-29 | GitHub Copilot | GPT-5 Mini | yes | C3 | N | *(none)* | |
| 2026-03-29 | Copilot CLI | GPT-5.1 Codex | yes | C1 | Y | Skill, `search-doc`, `search-community`, `get-doc` (id 35) | Cites cookbook + GitHub issue link in prose. |
| 2026-03-29 | Copilot CLI | GPT-5.1 Codex | yes | C2 | N | `search-doc` | Docs-only. |
| 2026-03-29 | Copilot CLI | GPT-5.1 Codex | yes | C3 | N | `search-doc` | Docs-only. |
| 2026-03-29 | Copilot CLI | GPT-5.3 Codex | yes | C1 | Y | Skill, `search-doc` (×4), `search-community` | Multiple doc searches + community search. |
| 2026-03-29 | Copilot CLI | GPT-5.3 Codex | yes | C2 | N | Skill, `search-doc` (×3) | IAM answer from guides/api docs only. |
| 2026-03-29 | Copilot CLI | GPT-5.3 Codex | yes | C3 | Y | Skill, `search-doc`, `search-community` | |
| 2026-03-29 | GitHub Copilot | Gemini 3.1 Pro | yes | C1 | Y | `get-menu`, `search-doc`, `search-community` (×2), `get-community-post` (id 4) | |
| 2026-03-29 | GitHub Copilot | Gemini 3.1 Pro | yes | C2 | Y | `search-community`, `get-community-post` (id 7) | **Community-first** on C2 (no `search-doc` in trace). |
| 2026-03-29 | GitHub Copilot | Gemini 3.1 Pro | yes | C3 | Y | `search-community` (×2), `search-doc` | |
| 2026-03-29 | GitHub Copilot | Gemini 3 Flash | yes | C1 | N | `search-doc`, `get-doc` (path `cookbook/authentication/auth0`) | Docs only. |
| 2026-03-29 | GitHub Copilot | Gemini 3 Flash | yes | C2 | N | `search-doc` | Docs only. |
| 2026-03-29 | GitHub Copilot | Gemini 3 Flash | yes | C3 | N | `search-doc` | CASL/resolver narrative; **no community tools** in trace. |
| 2026-03-28 | Cursor (Agent) | Composer 2 | yes | C1 | Y | `search-doc` (×2), `search-community`, `get-community-post` | UI: “Search Doc / Search Community / Get Community Post” in **feathersjsDocs** MCP. Answer cites **FeathersJS + Auth0: JWT and Refresh Token Setup** (FeathersMCP KB). |
| 2026-03-28 | Cursor (Agent) | Composer 2 | yes | C2 | N | `search-doc` | IAM/RBAC answer after **Search Doc** only (no community tools in screenshots). |
| 2026-03-28 | Cursor (Agent) | Composer 2 | yes | C3 | N | *(not visible)* | Fine-grained permissions pattern in reply; **tool strip not visible** in supplied screenshots — scored **N** for community KB unless you confirm traces. |

#### Skill effect — same models, C1 / C2 / C3 (Y = community tool used)

| Model | Without skill | With skill | Δ (high level) |
|-------|----------------|------------|------------------|
| **Claude Haiku 4.5** | Y / Y / Y | Y / Y / Y | No change on metric; skill runs still full retrieval. |
| **Claude Opus 4.5** | Y / Y / Y | Y / Y / Y | No change on metric. |
| **GPT-5 Mini** | N / N / N | N / N / N | **Skill did not produce MCP tool traces** in these runs. |
| **GPT-5.1 Codex** | N / N / N | **Y** / N / N | **C1** gains community + `get-doc`; C2–C3 still docs-only. |
| **GPT-5.3 Codex** | N / N / N | **Y** / N / **Y** | **C1 & C3** gain community; **C2** still docs-only. |
| **Gemini 3.1 Pro** | Y / N / Y | Y / **Y** / Y | **C2 flips N→Y** (community MCP instead of workspace `iam.ts`). |
| **Gemini 3 Flash** | N / N / Y | N / N / N | **C3 flips Y→N** in trace — with skill, **no** `search-community` on any prompt. |
| **Composer 2** (Cursor) | **N** / N / N | **Y** / N / N | **Skill lifts C1:** without skill = **Search Doc** + **Get Doc** only; with skill = **Search Community** + **Get Community Post** + cites Auth0 KB post. C2–C3 stay **N** on community in your captures. |

**Legend:** **Y** = `search-community` or `get-community-post` appeared. **N** = official tools or no tools only.

**Community KB tools?** — `Y` = trace shows `search-community` and/or `get-community-post`. `N` = only official tools (`get-menu`, `search-doc`, `get-doc`, `get-schema`) or no tools.

**When community = N:** That is still a valid outcome: model stayed on official docs or memory. Compare **with vs without skill** using the matrix above.

### Session notes — with skill batch (2026-03-29)

| Model | Highlights |
|-------|------------|
| **Claude Haiku / Opus** | Skill loads; **Y/Y/Y** on community tools. Haiku C2 prose references “tutorial (ID **#81**)” — **wrong id** vs tool trace (**7** / **4**); treat as narrative slip, not tool output. |
| **GPT-5 Mini** | **No MCP tools** in paste **with or without** skill — skill alone did not surface tool traces here. |
| **GPT-5.1 Codex** | **C1** now hits **`search-community`** + Auth0 cookbook `get-doc` + issue link in text — clearest **skill lift** on Auth0 question. |
| **GPT-5.3 Codex** | **C1 & C3** use community; **C2** remains **docs-only** (IAM pattern from guides/API). |
| **Gemini 3.1 Pro** | **C2** with skill: **only** `search-community` → `get-community-post` (**7**) — fixes prior **workspace `iam.ts`** path without skill. |
| **Gemini 3 Flash** | With skill, traces are **docs-only** for all three; **without** skill, C3 had used community — **regression on community metric** for this client/model combo. |
| **Composer 2** (Cursor Agent, skill **on**) | **C1:** MCP trace shows **Search Doc → Search Community → Get Community Post** (“feathersjsDocs”) and answer references **FeathersJS + Auth0: JWT and Refresh Token Setup** (FeathersMCP KB). **C2:** **Search Doc** only in supplied screenshots. **C3:** Substantive hook patterns; **no tool calls visible** in captures—revisit C3 row if you export a full trace. |
| **Composer 2** (Cursor Agent, skill **off**) | **C1:** **Search Doc** (×2) + **Get Doc** — official docs path only. **C2:** **Search Doc** + **Get Doc** (or prose-only in some crops). **C3:** “Guiding auth patterns” style answer with **no tool UI** in screenshots. Screenshots dated **2026-03-28** (`Screenshot_2026-03-28_at_4.56*.png`). |

*Evidence: user transcripts — skill **on**, 2026-03-29; Composer 2 — screenshots **2026-03-28** (with & without skill).*

---

## Detailed run log (paste screenshots / transcripts here)

*Assistant or teammate: append a new `###` block per run when the user sends Copilot output.*

### Run template

- **Date:**  
- **Client:** (e.g. GitHub Copilot in VS Code)  
- **Model:** (exact UI name)  
- **Skill:** yes / no  
- **Question ID:** C1 / C2 / C3  
- **Verbatim user message:**  
- **Community retrieval?** yes / no (`search-community` or `get-community-post` in trace)  
- **All tools observed:** (e.g. `get-menu`, `search-doc`, …)  
- **Answer quality / hallucination:** (optional; compare to ground truth section if community or docs cited)  
- **Screenshot or paste:** *(user provides)*  

---

### Runs

#### Session: Claude Opus 4.5 — Copilot CLI — skill **off** (2026-03-27)

**Overall:** On **all three** prompts (C1–C3), the trace shows **`search-community`** fired without you naming it. **C2** went furthest: **`get-community-post` id 7** plus **`get-doc` id 13**. For **C1**, community **was** consulted — if it felt “docs-only,” that is because the **written** answer foregrounds official Feathers/Auth0 OAuth patterns; the tool trace still shows community retrieval.

---

##### C1 — JWT / Auth0 split

- **Verbatim user message:** `How do Feathers and Auth0 usually split JWT validation and refresh token handling?`
- **Community KB tools?** **Yes** — `search-community` appears **twice** in the trace (plus `search-doc`, `get-doc`).
- **Assessment:** The model **did** consult the community knowledge base on question 1. It did **not** skip it. The reply is structured around **official-doc-style** behavior (OAuth callback, Feathers issuing its **own** JWT after Auth0, `JWTStrategy` validation). Your seeded Post A (saikou) stresses **Auth0 owning refresh lifecycle** and Feathers **`authenticate('jwt')`** — overlapping themes, but the narrative does not obviously **quote** or **attribute** the community post; compare to ground truth if you need strict alignment with saikou’s wording.

---

##### C2 — IAM-style RBAC + hooks

- **Verbatim user message:** `How would you implement AWS IAM–style RBAC using Feathers hooks?`
- **Community KB tools?** **Yes** — `search-community` → **`get-community-post` (id 7)** (full post), plus `search-doc` and **`get-doc` (id 13)**.
- **Assessment:** Strong **end-to-end** use of community + docs. The answer (policy objects, `authorize` hook, deny-over-allow) fits the **KuanKongy / IAM-style RBAC** seed; implementation detail is partly **synthesized** (example code) — normal for this style of answer.

---

##### C3 — Fine-grained permissions before service methods

- **Verbatim user message:** `What’s a good pattern for fine-grained permissions before service methods in Feathers?`
- **Community KB tools?** **Yes** — `search-doc` + `search-community`.
- **Assessment:** Community path used; final answer reads like **general** hook composition (`hasPermission`, `isOwner`, etc.) and does not, in the pasted text, name community authors — still valid for your “did it hit the KB?” metric (**Y**).

---

*Evidence: user-provided Copilot CLI transcript (2026-03-27).*

---

#### Session: Claude Haiku 4.5 — Copilot CLI — skill **off** (2026-03-27)

**Overall:** **All three questions (C1–C3) show `search-community` and/or `get-community-post`** — same **binary outcome** as Opus 4.5 for “did it hit the community KB?” (**Y/Y/Y**). Haiku often took **more tool steps** (e.g. **`get-menu`** on C1, multiple **`search-doc`** / **`search-community`** rounds on C2–C3).

**vs Opus 4.5 (same day, no skill):** Both models **self-selected** community tools on every prompt. Opus sometimes used fewer listed steps; Haiku **explicitly opened `get-community-post` on C1** (Opus’s C1 trace had `search-community` but not `get-community-post` in your paste). Haiku **C2** also pulled **`get-community-post` id 7** (same id as Opus) after **`get-doc` id 20 and 30** (Opus used **`get-doc` id 13** — different doc ids, same pattern).

---

##### C1 — JWT / Auth0 split

- **Tools:** `get-menu` → `search-doc` → `search-community` → `get-doc` (×2) → **`get-community-post`**
- **Community KB?** **Yes** (search + full post fetch).
- **Notes:** Answer stresses **JWKS validation**, **`authenticate('jwt')`**, refresh handled with **Auth0**, Feathers not managing refresh long-term — **aligned** with your seeded Auth0/JWT/refresh themes. Slightly different emphasis than Opus C1 (which stressed Feathers-issued JWT after OAuth).

---

##### C2 — IAM-style RBAC + hooks

- **Tools:** `search-doc` (×2) → `search-community` → `get-doc` (id **20**, **30**) → **`get-community-post` (id 7)**
- **Community KB?** **Yes**
- **Notes:** Pulled the **same community post id (7)** as the Opus run; IAM-style policy/hook structure in the answer matches the **KuanKongy**-style seed.

---

##### C3 — Fine-grained permissions before service methods

- **Tools:** `search-doc` (×2) → `search-community` (×2) → `get-doc` (id **13**)
- **Community KB?** **Yes** (`search-community` twice; no `get-community-post` in trace — search-only community path).
- **Notes:** Long **patterns** answer (ownership, scoping, field-level, etc.); grounded in doc id 13 + community search terms.

---

*Evidence: user-provided Copilot CLI transcript — Claude Haiku 4.5 (2026-03-27).*

---

### Cross-model snapshot (no skill) — 2026-03-28 batch

| Model | C1 | C2 | C3 | Pattern |
|-------|----|----|-----|---------|
| **Claude Opus / Haiku** (prior) | Y | Y | Y | Consistent community + docs |
| **GPT-5 Mini** | N | N | N | **No MCP tools** in paste — generic / TODO workflow |
| **GPT-5.1 Codex** | N | N | N | **`search-doc` / `get-doc` only** on C1–C2; C3 no tools |
| **GPT-5.3 Codex** | N | N | N | **No tools** in transcript (pure text) |
| **Gemini 3.1 Pro** | Y | N | Y | C1 `get-community-post` **id 4**; C2 **local `iam.ts`**; C3 post **id 7** |
| **Gemini 3 Flash** | N | N | Y | Community **`search-community`** only on **C3** |

---

#### Session: GPT-5 Mini — GitHub Copilot — skill **off** (2026-03-28)

**Overall:** **N / N / N** — transcript shows **no** `feathersjs` MCP tool usage (only TODO/planning and long prose). For this evaluation metric, treat as **no community retrieval**.

---

#### Session: GPT-5.1 Codex — Copilot CLI — skill **off** (2026-03-28)

**Overall:** **N / N / N** for community KB. **C1–C2:** `search-doc` + `get-doc` (official SQLite docs). **C3:** answer has **no listed tools** — likely pure completion or tools omitted from paste.

---

#### Session: GPT-5.3 Codex — Copilot CLI — skill **off** (2026-03-28)

**Overall:** **N / N / N** — no MCP tools listed for any question; concise architectural answers only.

---

#### Session: Gemini 3.1 Pro — GitHub Copilot — skill **off** (2026-03-28)

**Overall:** **Y / N / Y**. Strong on **C1** and **C3** for community (`search-community`, `get-community-post`). **C2** used **workspace `Read`** on `src/hooks/iam.ts` instead of community MCP — still useful engineering, but **not** D1 retrieval.

- **C1 note:** Fetched **`get-community-post` id 4** (different id than id **7** seen in Claude runs — expected if multiple rows or ordering differs).
- **C3 note:** `search-community` + **`get-community-post` id 7** + `search-doc`; also **terminal `grep`** on a Copilot cache JSON (side path).

---

#### Session: Gemini 3 Flash — GitHub Copilot — skill **off** (2026-03-28)

**Overall:** **N / N / Y**. **C1–C2:** menu + official doc search only. **C3:** added **`search-community`** (query e.g. CASL-related) + `get-doc` `api/hooks` — community engagement appears **late**, on the broadest question.

---

*Evidence: user-provided GitHub Copilot / Copilot CLI transcripts — 2026-03-28 batch.*
