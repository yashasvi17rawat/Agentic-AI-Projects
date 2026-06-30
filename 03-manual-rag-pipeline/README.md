# 03 — Manual RAG Pipeline (Built From Scratch)

A complete Retrieval Augmented Generation (RAG) system, built without any framework. Scrapes a real website, converts its content into vector embeddings, stores them in a vector database, and answers questions grounded in that retrieved content instead of the LLM's training data.

## What is RAG?
<img width="1400" height="662" alt="image" src="https://github.com/user-attachments/assets/6fdb2198-1e3b-456b-b7de-7297793d5e0c" />

**R**etrieval **A**ugmented **G**eneration — instead of letting the LLM answer purely from what it was trained on (which can be outdated or made up), we:

1. **Retrieve** — fetch real, relevant content first
2. **Augment** — inject that content into the prompt as context
3. **Generate** — let the LLM answer using that real context

```
Without RAG:  question → LLM answers from training data (can hallucinate)
With RAG:     question → retrieve real content → LLM answers from that content
```

## How it works end to end

```
INGEST PHASE                          QUERY PHASE
─────────────                         ───────────
Scrape webpage (axios + cheerio)      User asks a question
        ↓                                     ↓
Strip HTML noise (scripts/styles)     Convert question to embedding
        ↓                                     ↓
Split into chunks (~300 words)        ChromaDB finds closest matching
        ↓                              chunks (cosine similarity)
Convert each chunk to an embedding            ↓
(Ollama, local, free)                 Inject matched chunks into the
        ↓                              LLM's prompt as context
Store in ChromaDB                             ↓
        ↓                             LLM answers, grounded strictly
Recursively crawl internal links       in that retrieved context
and repeat for every page
```

## Prerequisites (beyond `npm install`)

This project depends on two services running locally:

**1. Ollama** — generates embeddings for free, fully local
```bash
brew install ollama          # or download from ollama.com
ollama pull nomic-embed-text
ollama serve                 # keep this running in a separate terminal
```

**2. ChromaDB** — the vector database
```bash
pip install chromadb
chroma run --host localhost --port 8000   # keep this running too
```

Both must be running *before* you execute `index.js`.

## Setup

```bash
npm install
cp .env.example .env
# paste your Groq key into .env
node index.js
```

The script has a "control panel" at the bottom — uncomment the ingest step the first time you run it, then comment it out and use the chat step for all future questions (no need to re-scrape every time).

## Key concepts learned

- **Embeddings turn text into numbers that represent meaning.** Similar meaning = similar numbers. Generated locally here via Ollama's `nomic-embed-text` model (768 numbers per chunk).
- **Chunking matters for accuracy.** Embedding an entire page as one vector dilutes meaning. Smaller, focused chunks (~300 words) give far more precise retrieval.
- **Vector databases compare meaning automatically.** ChromaDB uses cosine similarity (the angle between two vectors) to find the closest matches — this comparison logic is entirely built into the database; we never write it ourselves.
- **The LLM cannot read raw embeddings.** Vectors are for machine comparison only. We store the actual text in metadata alongside each embedding, so once ChromaDB finds a match, we can hand the LLM real, readable text.
- **Grounding stops hallucination.** The system prompt explicitly tells the LLM to answer *strictly* from retrieved context — without this instruction, the model tends to "complete" answers using its own training data, even when given real context.
- **`upsert` over `add`.** Using `add` throws an error on duplicate IDs; `upsert` updates if the ID exists or inserts if it doesn't — essential for safely re-running ingestion.
- **Unique IDs per chunk are critical.** Using just the URL as an ID meant every chunk from the same page silently overwrote the last one — only the final chunk ever got stored. Fixed by combining URL + chunk index (`url-chunk-body-3`) into the ID.

## Mistakes made and fixed along the way

- HTML tags were initially included in scraped content, polluting embeddings with markup noise instead of clean language — fixed by extracting `.text()` instead of `.html()`, and removing `<script>`/`<style>` tags before extraction.
- Internal links were being appended to the *current* page's URL instead of the *base* URL, causing broken double-slash URLs on nested pages — fixed by always building links from a fixed `BASE_URL`.
- The visited-URLs `Set` was being recreated inside the recursive function on every call, meaning it never actually prevented revisits — fixed by declaring it once, outside the function.

## Free resources used

- **[Ollama](https://ollama.com)** — free, local embedding generation, no API key, nothing leaves your machine.
- **[ChromaDB](https://www.trychroma.com)** — free, open-source vector database, runs locally.
- **[Groq](https://console.groq.com)** — free, fast LLM inference for the final answer generation step.

## What's next

Project 04 rebuilds this same RAG pipeline using LangChain's abstractions (`CheerioWebBaseLoader`, `RecursiveCharacterTextSplitter`, `Chroma` vector store) to compare how much manual plumbing a framework hides — and where it falls short (e.g. losing the recursive multi-page crawling this manual version supports).
