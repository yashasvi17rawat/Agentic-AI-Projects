// ============================================
// MANUAL RAG PIPELINE — Retrieval Augmented Generation, built from scratch
// Instead of the LLM answering from its training data alone, we first
// fetch real content (scraped from a website), then "augment" the
// question with that real content before asking the LLM to answer.
// ============================================

import { ChromaClient } from "chromadb";
import axios from 'axios';
import * as cheerio from 'cheerio';
import ollama from 'ollama';
import OpenAI from 'openai';
import 'dotenv/config';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BASE_URL = "https://quotes.toscrape.com"; // site built specifically for scraping practice

const client = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// ChromaDB is our vector database — it stores embeddings and can find
// the "closest meaning" matches when we query it later.
// Must be running locally on this host/port before this script runs.
const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8000,
});
chromaClient.heartbeat(); // just checks the DB is alive and reachable

// ----------------------------------------------
// SCRAPE A WEBPAGE
// axios fetches the raw HTML (same as what a browser receives before
// it renders anything visual). cheerio then parses that HTML so we can
// query it like jQuery — $('body'), $('a'), etc.
// ----------------------------------------------
async function scrapeWebpage(url = '') {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // remove non-content tags BEFORE extracting text — otherwise our
    // embeddings get polluted with JS/CSS code that has no real meaning
    $('script, style, noscript, iframe').remove();

    // .text() gives pure readable text (no HTML tags) — embedding models
    // understand language, not markup syntax
    const pageHead = $('head').text().trim();
    const pageBody = $('body').text().trim();

    const internalLinks = new Set(); // Set auto-removes duplicate links
    const externalLinks = new Set();

    $('a').each((_, el) => {
        const link = $(el).attr('href');
        if (!link || link === '/') return;
        if (link.startsWith("http") || link.startsWith("https")) {
            externalLinks.add(link); // links to OTHER websites — not our concern
        } else {
            internalLinks.add(link); // relative links on THIS site — worth crawling
        }
    });

    return { head: pageHead, body: pageBody, internalLinks: Array.from(internalLinks) };
}

// ----------------------------------------------
// CONVERT TEXT TO EMBEDDINGS (numbers that represent meaning)
// Similar meaning = similar numbers. This runs locally via Ollama —
// completely free, no API key, nothing leaves your machine.
// ----------------------------------------------
async function generateVectorEmbeddings(text) {
    const response = await ollama.embeddings({
        model: 'nomic-embed-text',
        prompt: text
    });
    return response.embedding; // an array of 768 numbers
}

// ----------------------------------------------
// SPLIT LONG TEXT INTO SMALLER CHUNKS
// Smaller chunks = more precise retrieval later. If we embedded an
// entire page as ONE vector, a search for "Einstein quote" might
// accidentally match because the page ALSO mentions other authors.
// ----------------------------------------------
function chunkText(text, chunkSize = 300) {
    const words = text.split(' ');
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        chunks.push(chunk);
    }
    return chunks;
}

let collection; // will hold our ChromaDB collection reference

// ----------------------------------------------
// WIPE AND RECREATE THE DATABASE
// Useful when re-running ingestion so old/stale chunks don't linger.
// ----------------------------------------------
async function resetDb() {
    await chromaClient.deleteCollection({ name: "web_embeddings" });
    collection = await chromaClient.getOrCreateCollection({ name: "web_embeddings" });
    console.log("✅ DB cleared and recreated");
}

// ----------------------------------------------
// STORE ONE CHUNK'S EMBEDDING IN CHROMADB
// `upsert` = insert if new, update if the ID already exists — safer
// than `add`, which throws an error on duplicate IDs.
// The ID MUST be unique per chunk (url + chunkIndex), otherwise every
// chunk from the same page would silently overwrite the previous one.
// ----------------------------------------------
async function insertIntoDb({ embedding, url, body = '', head = '', chunkIndex = 0 }) {
    await collection.upsert({
        ids: [`${url}-chunk-${chunkIndex}`],
        embeddings: [embedding],
        // metadata stores the ACTUAL TEXT — the embedding itself is just
        // numbers, unreadable to us. We need this to hand real text to
        // the LLM later, after ChromaDB finds the matching embedding.
        metadatas: [{ url, body, head }]
    });
}

// tracks which URLs we've already crawled, so we don't loop forever on
// websites that link back to pages we've already visited
const visited = new Set();

// ----------------------------------------------
// INGEST — the full pipeline: scrape -> chunk -> embed -> store
// Runs recursively across every internal link it finds.
// ----------------------------------------------
async function ingest(url = '') {
    if (visited.has(url)) return; // stop infinite loops on circular links
    visited.add(url);
    console.log("ingesting url:", url);

    const { head, body, internalLinks: links } = await scrapeWebpage(url);

    // embed and store every body chunk
    const bodyChunks = chunkText(body);
    for (let i = 0; i < bodyChunks.length; i++) {
        const bodyEmbeddings = await generateVectorEmbeddings(bodyChunks[i]);
        await insertIntoDb({ embedding: bodyEmbeddings, url, body: bodyChunks[i], chunkIndex: `body-${i}` });
    }

    // embed and store every head chunk too (page titles, meta info etc.)
    const headChunks = chunkText(head);
    for (let i = 0; i < headChunks.length; i++) {
        const headEmbeddings = await generateVectorEmbeddings(headChunks[i]);
        await insertIntoDb({ embedding: headEmbeddings, url, head: headChunks[i], chunkIndex: `head-${i}` });
    }

    // recursively crawl every internal link found on this page
    for (const link of links) {
        const _url = `${BASE_URL}${link}`; // always build from BASE_URL, not
                                            // the current page, to avoid
                                            // double-slash / broken URLs
        await ingest(_url);
    }

    console.log("✅ done:", url);
}

// ----------------------------------------------
// CHAT — the retrieval + generation half of RAG
// ----------------------------------------------
async function chat(question = '') {
    // convert the user's question into the SAME kind of embedding as our
    // stored chunks, so they can be compared apples-to-apples
    const questionEmbeddings = await generateVectorEmbeddings(question);

    // ChromaDB compares our question's embedding against every stored
    // embedding using cosine similarity (measures the angle between two
    // vectors — closer angle = closer meaning) and returns the closest
    // nResults matches. This comparison logic is built into ChromaDB —
    // we never write it ourselves.
    const collectionResult = await collection.query({
        nResults: 5,
        queryEmbeddings: [questionEmbeddings], // wrapped in an array because
                                                // ChromaDB supports querying
                                                // multiple embeddings at once
    });

    // pull the real text back out of the metadata we stored earlier
    const body = collectionResult.metadatas[0]
        .map((e) => e.body)
        .filter((e) => e && e.trim() !== '');

    const url = collectionResult.metadatas[0]
        .map((e) => e.url)
        .filter((e) => e && e.trim() !== '');

    // now we AUGMENT the question with the retrieved real content before
    // asking the LLM — this is the "Augmented" part of RAG. The system
    // prompt also explicitly grounds the model so it doesn't hallucinate
    // answers from its own training data instead of our retrieved context.
    const result = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: "system",
                content: 'You are a helpful AI assistant. Answer the user query strictly based on the retrieved context. Do not add anything outside the context.'
            },
            {
                role: "user",
                content: `
                    Query: ${question}\n\n
                    URL: ${url.join(',')}
                    Retrieved Context: ${body.join(',')}
                `
            }
        ],
    });

    console.log(result.choices[0].message.content);
}

// ---- CONTROL PANEL ----
// run ingestion ONCE first (uncomment), then comment it out and use
// chat() for all future questions — no need to re-scrape every time

// STEP 1: first time — ingest (comment out step 2)
// collection = await chromaClient.getOrCreateCollection({ name: "web_embeddings" });
// await resetDb();
// await ingest(`${BASE_URL}/`);

// STEP 2: after ingestion — query (comment out step 1)
collection = await chromaClient.getOrCreateCollection({ name: "web_embeddings" });
await chat("tell me more about Stephenie Meyer");