// ============================================
// LANGCHAIN ReAct AGENT — same agent as project 01, but built using
// LangChain's abstractions instead of writing the loop manually.
// The goal here is to compare: what did LangChain hide from us?
// ============================================

import 'dotenv/config';
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { DynamicTool } from "@langchain/core/tools";
import { pull } from "langchain/hub";
import { ChatOpenAI } from "@langchain/openai";

// ----------------------------------------------
// TOOL — same weather function as before, just wrapped in LangChain's
// DynamicTool class instead of being a plain function.
// LangChain needs a `name` and `description` so the AI knows when and
// how to call this tool — this gets baked into the system prompt
// automatically (we don't write that prompt ourselves anymore).
// ----------------------------------------------
const tools = [
  new DynamicTool({
    name: "getWeatherDetails",
    description: "Gets weather for a city. Input: city name as string.",
    func: async (city) => {
      const weather = { hyderabad: '20°C', pune: '22°C', ujjain: '25°C' };
      return weather[city] || 'unknown';
    }
  })
];

// ----------------------------------------------
// LLM SETUP
// We use LangChain's ChatOpenAI wrapper instead of the raw OpenAI SDK.
// Note: we point baseURL to Groq, same trick as before — the SDK doesn't
// care which company's server it's talking to, as long as the API
// format matches.
// ----------------------------------------------
const llm = new ChatOpenAI({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  configuration: {
    baseURL: "https://api.groq.com/openai/v1"
  }
});

// ----------------------------------------------
// PROMPT — instead of writing our own system prompt like in project 01,
// we PULL a pre-written ReAct prompt template from LangChain Hub.
// "hwchase17" is the GitHub username of LangChain's founder — this is
// effectively npm install for prompts. It's the standard PLAN -> ACTION
// -> OBSERVATION prompt, just maintained by someone else.
// ----------------------------------------------
const prompt = await pull("hwchase17/react");

// ----------------------------------------------
// AGENT — combines the LLM + tools + prompt into one object.
// This single line replaces our manual `system_prompt` string from
// project 01 — LangChain builds the actual prompt text internally using
// the template we just pulled, automatically inserting tool descriptions.
// ----------------------------------------------
const agent = await createReactAgent({ llm, tools, prompt });

// ----------------------------------------------
// EXECUTOR — this IS our manual `while(true)` inner loop from project 01,
// just packaged into a class. It repeatedly calls the LLM, checks if a
// tool needs to run, runs it, feeds the result back, and loops — until
// the LLM says it's done. We never see this looping happen; it's hidden.
// ----------------------------------------------
const executor = new AgentExecutor({ agent, tools });

// ----------------------------------------------
// RUN — one line replaces our entire manual loop + JSON.parse() +
// if/else logic from project 01. Internally this is doing everything we
// built by hand, just hidden behind this single `.invoke()` call.
// ----------------------------------------------
const result = await executor.invoke({ input: "what is sum weather of ujjain and pune?" });
console.log(result.output);