// ============================================
// LANGCHAIN RAG PIPELINE — same RAG system as project 03, rebuilt using
// LangChain's abstractions (LCEL — LangChain Expression Language).
// Goal: see how much manual plumbing gets hidden, and where the
// abstraction loses capability (spoiler: recursive multi-page crawling).
// ============================================

import 'dotenv/config';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

// ----------------------------------------------
// 1. SCRAPE — replaces our manual axios.get() + cheerio.load() combo
// from project 03 with a single class. Internally it's doing the exact
// same two steps, just wrapped together.
// NOTE: unlike our manual version, this only scrapes ONE page — it does
// not recursively follow internal links. That capability is lost here
// unless we manually loop this loader over multiple URLs ourselves.
// ----------------------------------------------
const loader = new CheerioWebBaseLoader("https://quotes.toscrape.com/");
const docs = await loader.load();

// ----------------------------------------------
// 2. CHUNK — replaces our manual word-splitting chunkText() function.
// RecursiveCharacterTextSplitter is smarter than our simple version —
// it tries to split on natural boundaries (paragraphs, sentences) before
// falling back to hard character cuts, giving cleaner chunks.
// ----------------------------------------------
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
const chunks = await splitter.splitDocuments(docs);

// ----------------------------------------------
// 3. EMBED + STORE — replaces our manual generateVectorEmbeddings() +
// insertIntoDb() functions. Still uses Ollama underneath for embeddings
// and ChromaDB for storage — "vectorStore" is just LangChain's name for
// whatever vector database sits underneath. Swapping to Pinecone later
// would only mean changing this one line, not rewriting our pipeline.
// ----------------------------------------------
const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });
const vectorStore = await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: "langchain_web_embeddings"
});

// a "retriever" is just an object that knows how to fetch relevant
// chunks from the vector store given a query — created automatically
const retriever = vectorStore.asRetriever();

// ----------------------------------------------
// 4. PROMPT TEMPLATE — replaces the manual string template we built by
// hand in project 03 (`Query: ... Retrieved Context: ...`). LangChain's
// version uses {placeholders} that get filled in automatically when the
// chain runs.
// ----------------------------------------------
const prompt = ChatPromptTemplate.fromTemplate(`
Answer the question based only on the following context:
{context}

Question: {question}
`);

// ----------------------------------------------
// 5. LLM SETUP — ChatGroq is LangChain's dedicated wrapper for Groq,
// simpler than manually setting baseURL on the raw OpenAI SDK like we
// did in project 03.
// ----------------------------------------------
const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile"
});

// ----------------------------------------------
// 6. THE CHAIN — LCEL (LangChain Expression Language) pipes steps
// together using an array, similar to function composition.
// This single RunnableSequence replaces our ENTIRE manual chat()
// function from project 03 — the embedding of the question, the
// ChromaDB query, the context injection, and the LLM call are all
// happening invisibly inside this chain.
// ----------------------------------------------
const chain = RunnableSequence.from([
    {
        // "context" gets filled by running the retriever on the input
        context: retriever,
        // "question" just passes the raw input straight through unchanged
        question: new RunnablePassthrough()
    },
    prompt,                  // fills {context} and {question} into the template
    llm,                     // sends the filled prompt to the LLM
    new StringOutputParser() // extracts plain text from the LLM's response object
]);

// ----------------------------------------------
// RUN — one line replaces our manual question-embedding +
// ChromaDB-query + prompt-building + LLM-call sequence from project 03.
// ----------------------------------------------
const result = await chain.invoke("who wrote the bella quote?");
console.log(result);