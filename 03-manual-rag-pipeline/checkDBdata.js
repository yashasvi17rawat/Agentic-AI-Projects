import { ChromaClient } from "chromadb";

const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8000,
});

const collection = await chromaClient.getOrCreateCollection({
  name: "web_embeddings",
});

const count = await collection.count();
console.log("Total records:", count);

const results = await collection.get({
  limit: 5,  // change this to see more
  include: ["metadatas", "embeddings"]
});

console.log("IDs:", results.ids);
console.log("Metadatas:", results.metadatas);
console.log("Embedding sample (first 5 values):", results.embeddings[0]?.slice(0, 5));