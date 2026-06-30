# 04 — LangChain RAG Pipeline

The same RAG system from Project 03, rebuilt using LangChain's LCEL (LangChain Expression Language) instead of writing every step by hand. As with Project 02, the goal isn't "better" — it's understanding exactly what a framework hides, and just as importantly, what capability gets lost in the process.

## Impact

| | Project 03 (manual) | Project 04 (LangChain) |
|---|---|---|
| Lines of code | ~150 | ~45 |
| Scraping | `axios.get()` + `cheerio.load()` (2 steps) | `CheerioWebBaseLoader` (1 class) |
| Chunking | hand-written word splitter | `RecursiveCharacterTextSplitter` (smarter, splits on natural boundaries) |
| Embedding + storage | manual functions + manual unique IDs | `Chroma.fromDocuments()` (1 line) |
| Query + retrieval + LLM call | one big manual `chat()` function | `RunnableSequence` (LCEL chain) |
| **Recursive multi-page crawling** | ✅ fully supported | ❌ **not supported out of the box** |

**~70% fewer lines** — but this version only scrapes a single page. The manual version's recursive crawling across internal links had to be built by hand in Project 03; LangChain's `CheerioWebBaseLoader` doesn't include that capability.

## A real limitation, found by testing

Asking `"who wrote the bella quote?"` returned an incorrect "not found in context" answer here, while the exact same question worked correctly in Project 03. The reason: the Bella quote lives on an author's sub-page, which only the manual version's recursive crawler had ingested. This is a good concrete example of an abstraction quietly doing less than expected — something only noticeable because the manual version was built first.

## How it works

```
Scrape (CheerioWebBaseLoader)
        ↓
Chunk (RecursiveCharacterTextSplitter)
        ↓
Embed + store (Ollama embeddings → Chroma vector store)
        ↓
chain.invoke(question)
        ↓
        ├─ retriever fetches relevant chunks
        ├─ prompt template fills in {context} and {question}
        ├─ LLM (ChatGroq) generates an answer
        └─ StringOutputParser extracts plain text
```

## Prerequisites (beyond `npm install`)

Same as Project 03:

```bash
ollama pull nomic-embed-text
ollama serve

pip install chromadb
chroma run --host localhost --port 8000
```

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env
# paste your Groq key into .env
node index.js
```

`--legacy-peer-deps` is required — LangChain's JS packages have peer dependency conflicts with almost everything at this point in their release cycle.

## Key concepts learned

- **"Vector store" is just LangChain's name for whatever DB sits underneath.** `Chroma.fromDocuments()` is still ChromaDB doing the work — LangChain wraps every vector DB behind the same interface so swapping providers (e.g. to Pinecone) only changes one line, not the whole pipeline.
- **LCEL chains are function composition, not magic.** `RunnableSequence.from([...])` just pipes the output of one step into the input of the next — `{ context: retriever, question: passthrough } → prompt → llm → parser`. Each step is independently swappable.
- **`RunnablePassthrough` does exactly what it sounds like.** It just forwards the raw input unchanged into the next step — used here so the original question reaches the prompt template even after the `context` field has been transformed by the retriever.
- **Query-time embedding still happens — it's just invisible.** Inside `chain.invoke()`, the question gets embedded, ChromaDB gets queried, and the LLM gets called — the exact sequence built by hand in Project 03's `chat()` function, just hidden behind one call.
- **Frameworks trade completeness for convenience.** The recursive crawling limitation above is a direct, demonstrable cost of using the higher-level loader instead of writing the crawl logic by hand.

## LangChain JS version instability

Worth noting for future reference: import paths for `langchain/agents`, `langchain/chains`, etc. changed multiple times across recent LangChain versions, frequently breaking tutorials written even a few months prior. Pinning exact versions and checking `node_modules/<package>/package.json` exports directly was often the fastest way to find correct import paths when documentation was out of date.

## Free resources used

- **[Ollama](https://ollama.com)** — free, local embedding generation.
- **[ChromaDB](https://www.trychroma.com)** — free, local vector database.
- **[Groq](https://console.groq.com)** — free, fast LLM inference via LangChain's `ChatGroq` wrapper.

## What's next

Project 05 moves away from frameworks again, building a manual multi-agent **orchestrator pattern** — a router agent that delegates to specialist agents and replies to the user itself, as opposed to a simple handoff.