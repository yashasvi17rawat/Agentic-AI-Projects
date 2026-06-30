import { Agent, run, tool } from "@openai/agents";
import { setDefaultOpenAIClient } from "@openai/agents-openai";
import { z } from "zod";
import OpenAI from 'openai';

// setup GitHub Models client
const client = new OpenAI({
    apiKey: process.env.GITHUB_TOKEN,
    baseURL: "https://models.github.ai/inference"
});

// tell agents SDK to use this client
setDefaultOpenAIClient(client);

const fetchAvailablePlans = tool({
    name: 'Fetch Available Plans',
    description: 'Fetches the available broadband plans with price and speed',
    parameters: z.object({}),
    execute: async function() {
        return [
            { plan_id: 1, price_inr: 399, speed: '30Mb/s' },
            { plan_id: 2, price_inr: 899, speed: '100Mb/s' },
            { plan_id: 3, price_inr: 1499, speed: '200Mb/s' },
        ];
    }
});

const salesAgent = new Agent({
    name: 'Sales Agent',
    model: 'gpt-4o-mini',
    instructions: `
        You are an expert sales agent for an internet broadband company.
        Talk to user and help them with what they need.
        When asked about plans, use the Fetch Available Plans tool.
    `,
    tools: [fetchAvailablePlans],
});

async function runAgent(query = '') {
    const result = await run(salesAgent, query);
    console.log(result.finalOutput);
}

runAgent('hello there, what plans do you have?');