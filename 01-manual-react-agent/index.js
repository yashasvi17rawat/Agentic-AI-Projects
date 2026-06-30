// ============================================
// MANUAL ReAct AGENT — built from scratch, no framework
// ReAct = Reasoning + Acting. The agent THINKS, then ACTS (uses a tool),
// then OBSERVES the result, then thinks again — in a loop — until it has
// a final answer.
// ============================================

import 'dotenv/config'; // loads variables from .env file into process.env
import OpenAI from 'openai';
import readlineSync from 'readline-sync'; // lets us take input from terminal

// Groq gives free LLM access. We use OpenAI's SDK but point it to Groq's
// servers instead of OpenAI's — Groq copied OpenAI's API format on purpose
// so developers can switch with almost no code change.
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// ----------------------------------------------
// TOOL — a plain function the AI can "call".
// The AI itself can't run code — it can only ask US to run this function
// on its behalf, then we feed the result back to it.
// ----------------------------------------------
function getWeatherDetails(city = '') {
    if(city === 'hyderabad') return '20°C';
    if(city === 'pune') return '22°C';
    if(city === 'banglore') return '18°C';
    if(city === 'ujjain') return '25°C';
    if(city === 'shmila') return '10°C';
}

// ----------------------------------------------
// SYSTEM PROMPT — the instruction manual for the AI.
// This tells the model exactly how to behave: what states to go through
// (PLAN -> ACTION -> OBSERVATION -> OUTPUT), what tools exist, and what
// JSON format to reply in so our code can read its response reliably.
// The worked example at the bottom teaches the model the exact pattern
// to follow (this technique is called "few-shot prompting").
// ----------------------------------------------
const system_prompt = `
You are an AI assistant with START, PLAN, ACTION, OBSERVATION AND OUTPUT state.
Wait for the user prompt and first PLAN using available tools.
After Planning, take the action with appropriate tools and wait for the observation based on Action.
Once you get the observation, return the AI response based on START prompt and observations

Strictly follow the JSON output format as in examples.

Available tools:
- function getWeatherDetails(city: string): string
getWeatherDetails is a function that accepts city name as string and returns the weather details.

Example:
START
{"type":"user","user":"what is sum of weather of pune and ujjain?"}
{"type":"plan", "plan":"I will call the getWeatherDetails of pune"}
{"type":"action","function":"getWeatherDetails", "input":"pune"}
{"type":"observation","observation":"22°C"}
{"type":"plan", "plan":"I will call the getWeatherDetails of ujjain"}
{"type":"action","function":"getWeatherDetails", "input":"ujjain"}
{"type":"observation","observation":"25°C"}
{"type":"output","output":"the sum of weather of pune and ujjain is 47°C"}
`

// ----------------------------------------------
// CONVERSATION MEMORY
// The AI has zero memory on its own. This array IS its memory — every
// message (system instructions, user questions, AI replies, tool results)
// gets pushed here and the FULL array is sent on every single API call.
// ----------------------------------------------
const messages = [
  { role: 'system', content: system_prompt },
]

// ----------------------------------------------
// OUTER LOOP — keeps the chat session alive across multiple questions.
// Runs forever until you manually stop the program (Ctrl+C).
// ----------------------------------------------
while(true)
{
  // wait for the user to type something in the terminal
  const query = readlineSync.question('>> ');

  // wrap the user's question in the JSON format our system prompt expects
  const q = { type: 'user', user: query };
  messages.push({ "role": 'user', content: JSON.stringify(q) });

  // ----------------------------------------------
  // INNER LOOP — this is the actual ReAct loop for ONE question.
  // It keeps calling the AI back and forth until the AI says "I'm done"
  // (type: output). This is where PLAN -> ACTION -> OBSERVATION happens.
  // ----------------------------------------------
  while(true)
  {
    // send the entire conversation history to the AI and get its next move
    const chat = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      response_format: { type: 'json_object' } // forces the AI to reply in valid JSON
    });

    const result = chat.choices[0].message.content;

    // just for us to see what the AI is "thinking" at each step
    console.log(`-----------AI START -----------`);
    console.log(result)
    console.log(`-----------AI END -----------`);

    // save the AI's reply into memory so it remembers what it just said
    messages.push({ role: 'assistant', content: result });

    // turn the AI's text reply into a real JS object so we can read it
    const call = JSON.parse(result);

    if(call.type == 'output')
    {
      // the AI has finished thinking and has a final answer — print it and
      // break out of the inner loop (but outer loop keeps running for next question)
      console.log(`${call.output}`);
      break;
    }
    else if(call.type == 'action')
    {
      // the AI wants to use a tool — WE run the actual function here,
      // the AI itself cannot execute any code
      if(call.function == 'getWeatherDetails')
      {
        const res = getWeatherDetails(call.input);

        // package the tool's result as an "observation" and feed it back
        // into the conversation so the AI can see it and continue thinking
        const obs = { type: 'observation', observation: res }
        messages.push({ role: 'user', content: JSON.stringify(obs) });

        // inner loop continues — AI will be called again, now WITH the
        // observation in its memory, so it can plan its next step
      }
    }
  }
}