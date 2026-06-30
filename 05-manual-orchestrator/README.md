# 05 — Manual Multi-Agent: Handoff vs Orchestrator Patterns

Two ways to coordinate multiple specialist agents, both built from scratch with no framework — just plain functions, each making its own LLM call. This folder exists to make the difference between two commonly confused patterns concrete and visible in code.

## Handoff vs Orchestrator — the core difference
<img width="482" height="203" alt="image" src="https://github.com/user-attachments/assets/842fdfde-1732-4621-878e-93239abd5954" />

<img width="687" height="236" alt="image" src="https://github.com/user-attachments/assets/64fba653-670a-46c2-83fa-6d9a357ea435" />


| | Handoff (`handoff.js`) | Orchestrator (`orchestrator.js`) |
|---|---|---|
| Router decides specialist | ✅ | ✅ |
| Specialist generates answer | ✅ | ✅ |
| Specialist's answer reviewed/rewritten | ❌ — sent straight to user | ✅ — orchestrator re-presents it |
| User sees | the specialist's raw output | one consistent voice, always |
| LLM calls per message | 2 | 3 |
| Conversation memory | none (single-shot) | full multi-turn history |
| Tools | none | each specialist has mock data tools |

**Analogy:** Handoff is a receptionist transferring your call — once transferred, you're talking directly to the specialist. Orchestrator is a manager who delegates, gets a report back, and replies to you personally — you never directly interact with whoever did the work.

## How the orchestrator flow works

```
User message
      ↓
Router (1 LLM call) → classifies: sales / support / billing
      ↓
Specialist agent (1 LLM call) → generates an expert answer,
                                  using its own tool data + system prompt
      ↓
Orchestrator (1 LLM call) → reviews specialist's raw answer,
                              rewrites it in one consistent tone
      ↓
User sees ONLY the orchestrator's final reply
      ↓
Both messages saved to conversationHistory[] for the next turn
```

## Setup

```bash
npm install
cp .env.example .env
# paste your GitHub Models token into .env
node handoff.js        # simple version
node orchestrator.js   # full version with tools + memory
```

Get a free token from GitHub Models (Settings → Developer settings → Personal access tokens, or via the GitHub Models playground) — works as an OpenAI-compatible endpoint at no cost.

## Key concepts learned

- **An "agent" doesn't need a special class or object.** Every specialist here is just a plain async function making one LLM call with its own system prompt. The "multi-agent" complexity is entirely in how these functions are *orchestrated together*, not in how each individual agent is built.
- **This is NOT the ReAct pattern.** Each agent here makes exactly one LLM call and returns — no Think → Act → Observe → Think looping happens anywhere in this folder. Compare to Project 01, where the inner `while(true)` loop is the actual ReAct cycle. Orchestration and ReAct solve different problems and can be combined (e.g. CrewAI in Project 06 does orchestration at the crew level, with ReAct looping happening inside each individual agent's task execution).
- **Tools here are "prompt-injected," not natively called.** Instead of using the OpenAI API's native function-calling feature, tool data (plans, outages, bills) is fetched and pasted directly into the system prompt as JSON. Simpler to build and debug, though it doesn't scale as cleanly as native tool calling for many tools.
- **Conversation memory is just an array, same as Project 01.** `conversationHistory[]` is spread into every specialist's messages array — the LLM has no memory of its own; we're responsible for replaying the full relevant history on every call.
- **Orchestration adds a real cost: one extra LLM call per message.** The router call and the final "polish" call both cost time and tokens. Worth it when consistency of tone/voice across specialists matters; unnecessary overhead when it doesn't (handoff is fine for many simple cases).

## Free resources used

- **[GitHub Models](https://github.com/marketplace/models)** — free, OpenAI-compatible inference endpoint using a personal GitHub token. Used here instead of Groq specifically because the model used (`gpt-4o-mini`) needed native OpenAI-style behavior that Groq's models didn't reliably replicate during testing.

## What's next

Project 06 looks at the same multi-agent idea, but through a real framework — CrewAI — comparing its `Process.sequential` orchestration (which handles context-passing between tasks automatically) against the fully manual orchestration built here.
