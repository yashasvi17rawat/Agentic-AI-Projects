# Agentic AI — From Scratch

A hands-on journey learning agentic AI by building everything manually first, then comparing against popular frameworks — to understand exactly what each abstraction is hiding, not just how to use it.

Every project here started with no framework. Once the manual version worked end to end, I rebuilt it using a popular library (LangChain, CrewAI) to compare line counts, see what gets simplified, and — just as importantly — what capability quietly gets lost along the way.

## Roadmap

```
Level 1 — Core agent patterns         ✅ done
Level 2 — RAG pipelines               ✅ done
Level 3 — Multi-agent systems         ✅ done
Level 4 — Production-grade agents     ⬜ next
Level 5 — Expert topics (LangGraph,   ⬜ upcoming
           MCP, A2A)
```

## Projects

| # | Project | What it covers |
|---|---|---|
| [01](./01-manual-react-agent) | Manual ReAct Agent | Plan → Action → Observation loop, built with raw API calls — no framework |
| [02](./02-langchain-react-agent) | LangChain ReAct Agent | Same agent rebuilt with LangChain — comparing what gets abstracted away |
| [03](./03-manual-rag-pipeline) | Manual RAG Pipeline | Web scraping, chunking, embeddings, vector DB, grounded LLM answers — fully manual |
| [04](./04-langchain-rag) | LangChain RAG Pipeline | Same RAG system using LangChain's LCEL — and a real limitation found by comparing it to Project 03 |
| [05](./05-manual-orchestrator) | Manual Multi-Agent (Handoff vs Orchestrator) | Two coordination patterns for multiple specialist agents, built from scratch |
| [06](./06-crewai-multiagent) | CrewAI Multi-Agent System | A real multi-agent pipeline (Python) using CrewAI's task chaining and sequential process |

Each project folder has its own README with setup instructions, fully commented code, key concepts learned, and real issues hit along the way.

## Why build manually first?

Frameworks like LangChain and CrewAI are genuinely useful — but using them without understanding what they're doing underneath makes debugging nearly impossible. Every framework error encountered while building these projects (version mismatches, provider incompatibilities, silently-dropped functionality) was solvable specifically *because* the manual version was built first and the underlying mechanics were already understood.

## Free resources used throughout

No paid APIs were used anywhere in this repo. Everything here can be reproduced for free:

| Resource | What it provides | Why it's useful |
|---|---|---|
| **[Groq](https://console.groq.com)** | Free, extremely fast LLM inference | OpenAI-compatible API — same SDK, just point `baseURL` at Groq's servers |
| **[Ollama](https://ollama.com)** | Free, local embedding + LLM models | Runs entirely on your machine, no API key, no rate limits, nothing leaves your laptop |
| **[ChromaDB](https://www.trychroma.com)** | Free, open-source vector database | Runs locally, perfect for learning RAG without cloud costs |
| **[GitHub Models](https://github.com/marketplace/models)** | Free, OpenAI-compatible inference using a GitHub token | Used where Groq had compatibility issues with certain frameworks (e.g. CrewAI) |
| **[YouTube Data API v3](https://console.cloud.google.com)** | Free tier video search | Used as a real tool for the CrewAI researcher agent |

## Core concepts learned across this repo

- **The LLM has no memory of its own.** Every "memory" is just an array of past messages, replayed in full on every single API call.
- **The LLM cannot execute code.** When an agent "calls a tool," it's only generating text in a format our code recognizes — we run the actual function and feed the result back.
- **ReAct (Reasoning + Acting)** is a loop: Plan → Act (tool call) → Observe → Plan again → ... until a final answer. Built manually in Project 01; CrewAI runs this same loop internally per agent task in Project 06.
- **RAG (Retrieval Augmented Generation)** retrieves real content first, then augments the prompt with it, so the LLM answers from real data instead of its training data alone.
- **Vector databases compare meaning, not keywords.** Embeddings are numbers representing meaning; similarity search (cosine similarity) finds the closest matches — this comparison logic is built into the database, never written by hand.
- **Multi-agent orchestration is a coordination problem, not a new kind of "agent."** Specialist agents are often just single LLM calls with their own system prompt — the interesting part is how a router/orchestrator coordinates them (handoff vs full orchestration, sequential task chaining, etc.).
- **Framework abstractions trade completeness for convenience.** Multiple times across this repo, the framework version did measurably less than the manual version (e.g. LangChain's loader not recursively crawling pages like the manual scraper did) — a cost only visible because the manual version was built and understood first.

## What's next

Level 4 (production-grade agents): evals, tracing, guardrails, and deployment. Followed by Level 5: LangGraph, MCP (Model Context Protocol), and A2A (Agent-to-Agent) — once the underlying problems they solve have actually been felt firsthand in a real project, not just watched in a tutorial.
