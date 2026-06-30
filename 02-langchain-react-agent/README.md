# 02 — LangChain ReAct Agent

The same weather agent from Project 01, rebuilt using LangChain instead of writing the ReAct loop by hand. The goal wasn't to "upgrade" — it was to see exactly what a framework hides once you already understand what's underneath.

## Impact

| | Project 01 (manual) | Project 02 (LangChain) |
|---|---|---|
| Lines of code | ~95 | ~35 |
| System prompt | hand-written | pulled from LangChain Hub |
| The loop | manual `while(true)` | `AgentExecutor` (hidden) |
| JSON parsing | manual `JSON.parse()` + if/else | hidden inside the agent |
| Tool calling | manual function lookup | `DynamicTool` wrapper |

**~63% fewer lines**, but the exact same ReAct loop is still running underneath — just invisible. This is the value of having built Project 01 first: nothing here feels like magic.

## What changed conceptually

```
Project 01                         Project 02
-----------                        -----------
hand-written system_prompt    →    pull("hwchase17/react") from LangChain Hub
plain JS function as tool     →    DynamicTool({ name, description, func })
manual while(true) loop       →    AgentExecutor (loop is hidden inside)
JSON.parse + if/else logic    →    .invoke({ input }) — one line
```

## Tech stack

| Tool | Why |
|---|---|
| LangChain | agent framework — provides ReAct loop, prompt templates, tool wrappers |
| LangChain Hub | registry of reusable, pre-written prompts (like npm, but for prompts) |
| Groq | free, fast LLM inference |
| dotenv | keeps API keys out of source code |

## Setup

```bash
npm install
cp .env.example .env
# paste your Groq key into .env
node index.js
```

## Key concepts learned

- **LangChain Hub is a prompt registry.** `pull("hwchase17/react")` fetches a prompt template written by LangChain's founder — the same kind of PLAN → ACTION → OBSERVATION instructions we wrote by hand in Project 01, just maintained by someone else.
- **`DynamicTool` is just a wrapper.** It takes the same plain function from Project 01 and adds a `name` + `description` so LangChain can auto-generate the tool section of the system prompt — something we typed manually before.
- **`AgentExecutor` IS the manual loop.** It's not a different concept — it's our `while(true)` loop from Project 01, packaged into a reusable class.
- **Abstractions cost flexibility for convenience.** LangChain's JS ecosystem changes import paths frequently between versions — version pinning (`langchain@0.1.37`) was necessary to get a stable working setup.

## Why building the manual version first mattered

Every time something failed during setup (import path errors, version mismatches, `cache_breakpoint` style incompatibilities elsewhere in this repo), having built the manual version made debugging straightforward — I always knew which underlying step LangChain must be failing at, instead of treating it as an unexplainable black box.

## What's next

Project 03 moves to RAG (Retrieval Augmented Generation) — scraping a website, generating embeddings, storing them in a vector database, and answering questions grounded in real retrieved content instead of the model's training data.