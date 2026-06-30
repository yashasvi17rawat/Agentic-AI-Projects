# 01 — Manual ReAct Agent (Built From Scratch)

This is the very first project in my agentic AI learning journey. No frameworks, no libraries like LangChain — just plain JavaScript, the OpenAI SDK, and Groq's free API. The goal was to understand exactly what's happening *before* relying on abstractions.

## What is ReAct?

**ReAct = Reasoning + Acting.** Instead of an LLM just answering a question directly, it goes through a loop:

```
PLAN → ACTION (use a tool) → OBSERVATION (see the result) → PLAN again → ... → OUTPUT
```

This loop continues until the AI has gathered enough information to give a final answer.

## How it works

```
User asks a question
        ↓
AI plans what to do
        ↓
AI requests a tool call (e.g. get weather for a city)
        ↓
Our code actually runs that function (AI cannot execute code itself)
        ↓
Result is fed back to the AI as an "observation"
        ↓
AI plans again using the new information
        ↓
... loop continues until AI has the final answer ...
        ↓
AI returns the final output
```

## Tech stack

| Tool | Why |
|---|---|
| Node.js | JavaScript runtime to run the script |
| OpenAI SDK | the standard interface for chat completions |
| Groq | free, fast LLM inference — OpenAI-compatible API |
| readline-sync | takes input from the terminal |
| dotenv | keeps API keys out of the codebase |

## Setup

```bash
npm install
cp .env.example .env
# paste your Groq key into .env
node index.js
```

Get a free Groq API key at [console.groq.com](https://console.groq.com/keys).

## Key concepts learned

- **The LLM has no memory of its own.** The `messages[]` array IS its memory — the entire conversation history is sent on every single API call.
- **The LLM cannot execute code.** When it says "call this tool," it's just generating text in a format our code recognizes. We run the actual function and feed the result back.
- **The system prompt is the instruction manual.** It teaches the AI what states to follow (PLAN, ACTION, OBSERVATION, OUTPUT) and what JSON format to reply in, using a worked example (few-shot prompting).
- **Two nested loops:** an outer loop for multi-turn conversation (waiting for new questions), and an inner loop that is the actual ReAct cycle for one question.

## Common doubts answered

- **Why `process.env`?** It's Node's built-in object for environment variables. The `dotenv` package reads your `.env` file and loads its values into `process.env`, so secrets like API keys never get hardcoded or pushed to GitHub.
- **What are the valid message roles?** Only four exist in the OpenAI/Groq API: `system` (sets behavior), `user` (human input or anything fed back as input), `assistant` (the AI's own past replies), and `tool` (used only with native tool-calling, not this custom JSON approach).
- **Why parse the AI's response with `JSON.parse()`?** The AI's reply comes back as a plain string, even if it looks like JSON. `JSON.parse()` converts that string into a real JavaScript object so we can read properties like `call.type` or `call.function`. Without parsing, we'd just have unusable text.
- **Are there "standard" action types?** No — `type: 'action'` and which `function` to call are entirely defined by us in the system prompt. There's no built-in standard; we teach the AI our own custom protocol, and it follows the format because we showed it a worked example.

## Free resources used

- **[Groq](https://console.groq.com)** — free, extremely fast LLM inference. OpenAI-compatible API, so the same SDK works by just changing the `baseURL`.
- **[dotenv](https://www.npmjs.com/package/dotenv)** — keeps secrets out of source code.

## What's next

Project 2 rebuilds this exact same agent using LangChain, to see how much of this manual plumbing a framework abstracts away — and to understand *what* it's hiding underneath.
