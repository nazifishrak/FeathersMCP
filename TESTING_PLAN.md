# FeatherMCP MVP Testing Plan
**Session Date:** Monday, Feb 23, 2026 | 5:30-7:00 PM | ICICS 238

---

## Session Overview

We have three hosting sessions. Each one uses a **different MCP client** so we can see how FeatherMCP behaves across different integrations.

| Session | Hosts | MCP Client to Use |
|---------|-------|-------------------|
| A (5:40-6:00) | Members 1 & 2 | Claude Desktop |
| B (6:05-6:25) | Members 3 & 4 | Cursor (MCP mode) |
| C (6:30-6:50) | Member 5 | Open WebUI (or whichever client is left) |

> If one of these clients is not ready in time, fall back to Claude Desktop for that session and note it in your bug report. The goal is to stress-test the server across different clients, not the clients themselves. If the same search query behaves differently between sessions, that is worth flagging.

---

## Pre-Session Checklist (Complete Before You Arrive)

- [ ] Pipeline tests all pass (`npm run test:pipeline`) — this verifies the database and search are working
- [ ] MCP server builds without errors (`npm run build`)
- [ ] Database file (`contents.sqlite`) exists at `feathers/website/.data/content/contents.sqlite`
- [ ] MCP server starts without crashing (`npm start`)
- [ ] All tools are registered and callable: `search_documentation`, `get_db_schema`, `get_menu_structure`, and `get_document_by_path` / `get_document_by_id` if implemented
- [ ] The MCP client for your session is configured and connected to FeatherMCP
- [ ] You've done a dry-run on that client before the session (try a real query and confirm you get a useful answer)
- [ ] Laptop is charged and running a stable build
- [ ] Task sheet is ready to hand to the tester
- [ ] Bug report template is open and ready
- [ ] You know which client each session uses (see table above)

---

## What to Say When the Tester Arrives (read this out loud, ~1 min)

> "FeatherMCP is a tool that gives an AI assistant access to the FeathersJS documentation. Instead of searching the internet, the AI looks things up from a local database we built. Today you're using [name the client]. You're playing the role of a developer who just started learning FeathersJS and wants to use an AI assistant to get help. Just ask it questions however feels natural to you, like you would if you were actually coding. The AI will look up the docs behind the scenes."

---

## Tester Task Sheet

Hand this to the tester at the start. Ask them to think out loud as they go.

---

**Scenario:** You are a developer who just started learning FeathersJS. You want to use an AI assistant to help you understand the framework and find answers.

**How to do this:**
- For each task, there is a goal. Ask the AI however feels natural to you. There is no "right" way to phrase it.
- Think out loud. Say what you're expecting and what you notice.
- If something seems wrong, confusing, or missing, say so.
- You have about 10-12 minutes.

---

**Task 1 (Required) - Basic Concept (~2-3 min)**

Goal: Find out what a FeathersJS service is and how to create one.

Ask the AI however you want. You're done when you feel like you understand what a service is and could try building one.

---

**Task 2 (Required) - Specific Feature Lookup (~2-3 min)**

Goal: Figure out how to add authentication to a FeathersJS app.

Ask the AI however you want. You're done when you have steps or guidance you could actually follow.

---

**Task 3 (Required) - Browse What's Available (~2 min)**

Goal: Get a sense of what topics the documentation covers.

Ask the AI however you want. You're done when you have a useful overview of what you could learn about.

---

**Task 4 (Optional, if time allows) - Find a Code Example or Specific Page (~2 min)**

Goal: Find a real working example of using hooks in FeathersJS, or ask the AI to pull up a specific documentation page (e.g., the hooks page or the authentication page directly).

Ask the AI however you want. You're done when you have something concrete you could run or adapt.

---

**Task 5 (Optional, if time allows) - Something Unclear or Outside the Docs (~1-2 min)**

Goal: Ask about something where you're not sure the AI will have a good answer. For example: how FeathersJS compares to other frameworks, or a very niche or unusual setup.

There's no right answer here. We want to see how the AI handles questions that might be at the edge of what the docs cover.

---

## Host Script: How to Run the 20-Minute Session

### 0:00 - Tester arrives
- Welcome them and introduce yourself.
- Say: *"We have about 20 minutes. I'll hand you a task sheet and watch and take notes. Please think out loud as you go. I won't step in unless you're completely stuck."*
- Open a fresh AI conversation (clear chat history first).
- Hand them the task sheet.

### 0:02 - Context brief
- Read or paraphrase the intro script above.
- Tell them which client they're using and that it's already connected.
- Ask: *"Any quick questions before we start?"*

### 0:03 - Testing
- Let the tester drive completely.
- Your job is to watch and take notes. Do not help, correct, or steer them.
- Only step in if they've been stuck for more than 2 minutes and cannot continue at all.
- Watch for: hesitation, confusion, unexpected results, errors, or answers that seem wrong or made-up.
- Note the exact phrasing they use to ask each question. This is valuable data.

### 0:13 - Wrap up tasks
- If they haven't finished all tasks, say: *"That's really helpful, let's move to quick feedback."*

### 0:15 - Verbal debrief (3 required questions, ask the rest if time allows)

**Required (ask every time):**
1. *"What was the hardest or most confusing part?"*
2. *"Did the AI's answers feel accurate and trustworthy?"*
3. *"If you could change one thing first, what would it be?"*

**Optional (ask if time allows):**
- *"Did the way you phrased your questions affect what you got back?"*
- *"On a scale of 1-5, how easy was this to use?"*

### 0:19 - Close
- Thank them.
- If you have a feedback form, ask them to fill it in.
- Write down their name for PUM.

---

## Host Observation Checklist

**Tester name:** ___________________________
**Session:** A / B / C
**MCP Client used:** ___________________________

For each task, mark one: **Completed unassisted / Completed with a prompt from host / Not completed**

| Task | How tester phrased their question | Completion |
|------|-----------------------------------|------------|
| Task 1 - Basic concept | | |
| Task 2 - Authentication | | |
| Task 3 - Browse topics | | |
| Task 4 - Hooks example (optional) | | |
| Task 5 - Edge case (optional) | | |

> Write the tester's actual phrasing in the middle column. Different testers will ask differently, and that variation is useful to compare across sessions.

---

### During the Session: Usability Notes

Watch for these and check them off if you see them.

- [ ] Tester understood what to do without needing extra explanation
- [ ] Tester seemed confident asking the AI questions
- [ ] Tester expressed confusion or hesitation at some point (note where below)
- [ ] AI answers clearly felt grounded in real docs, not made-up
- [ ] Tester noticed or commented on the quality of the answer
- [ ] Tester tried rephrasing a question after getting a bad or incomplete answer

**Notes on confusing moments:**

```
Task:
What happened:
```

---

### After the Session: Technical Validation

Check these on your own after the tester leaves.

- [ ] All three required tasks returned non-empty results
- [ ] Search results were relevant to the query (not off-topic)
- [ ] Topic overview (Task 3) included all four categories: api, guides, cookbook, ecosystem
- [ ] No duplicate results appeared for the same query
- [ ] Server did not crash at any point
- [ ] Response time felt fast (under 2 seconds)
- [ ] This session's client behaved the same as other sessions (note differences if not)
- [ ] If `get_document_by_path` or `get_document_by_id` were tested, did they return the correct page?

**Edge case result (Task 5):**
- [ ] AI acknowledged uncertainty or said it might not have enough info
- [ ] AI gave an overconfident or made-up answer
- [ ] Task 5 was not attempted

---

## Cross-Session Comparison (fill in after all 3 sessions)

Use this to compare how FeatherMCP behaved across different clients.

| | Session A (Claude Desktop) | Session B (Cursor) | Session C (Open WebUI) |
|---|---|---|---|
| Did all 3 required tasks complete? | | | |
| Any errors or crashes? | | | |
| Response quality felt consistent? | | | |
| Anything the client handled differently? | | | |

---

## Bug Report Format

File these as GitHub issues after the session.

```
**Title:** [Short description]

**Session:** A / B / C
**MCP Client:** [Claude Desktop / Cursor / Open WebUI]
**Tester:** [Name or identifier]
**Task:** Task 1 / 2 / 3 / 4 / 5
**Tool involved:** [search_documentation / get_db_schema / get_menu_structure / get_document_by_path / get_document_by_id / unknown]
**Tester's exact phrasing:** [What they asked]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
[What actually happened]

**Severity:** Critical / High / Medium / Low

**Notes:**
[Error messages, screenshots, or extra context]
```

---

## Optional Feedback Form (share with tester)

1. Were you able to complete the tasks? (Yes / Partially / No)
2. Did the AI's answers feel accurate and useful? (1 = Not at all, 5 = Very much)
3. Was anything confusing about how to use the tool?
4. Did you notice any wrong or missing answers?
5. What would make this more useful for a developer?

---

## What to Bring to Wednesday PUM (Feb 25)

- [ ] Names of all 5 testers
- [ ] Completed observation checklists (one per tester)
- [ ] GitHub issues filed for each bug
- [ ] Which bugs you plan to fix and how
- [ ] The most common piece of feedback across all testers
- [ ] Any differences you noticed between the three clients
