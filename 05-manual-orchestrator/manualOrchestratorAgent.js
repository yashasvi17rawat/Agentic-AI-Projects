// ============================================
// ORCHESTRATOR PATTERN — a step up from simple handoff.
// The orchestrator delegates to a specialist, but does NOT hand the
// conversation off entirely — it takes the specialist's answer, reviews
// it, and replies to the user ITSELF in a consistent voice. The user
// never directly "talks to" the specialist; the orchestrator is always
// the single point of contact. Also adds: tools, multi-turn memory.
// ============================================

import 'dotenv/config';
import OpenAI from 'openai';
import readlineSync from 'readline-sync';

const client = new OpenAI({
    apiKey: process.env.GITHUB_TOKEN,
    baseURL: "https://models.github.ai/inference"
});

// ----------------------------------------------
// TOOLS — plain functions each specialist agent can use to fetch real
// data. These return hardcoded mock data here, but in a real system
// they'd hit a database or external API.
// ----------------------------------------------
function getAvailablePlans() {
    return [
        { plan_id: 1, price_inr: 399, speed: '30Mb/s' },
        { plan_id: 2, price_inr: 899, speed: '100Mb/s' },
        { plan_id: 3, price_inr: 1499, speed: '200Mb/s' },
    ];
}

function getOutageStatus(area = '') {
    const outages = {
        'hyderabad': 'No outages reported',
        'pune': 'Partial outage in Pune West — ETA fix: 2 hours',
        'bangalore': 'No outages reported'
    };
    return outages[area.toLowerCase()] || 'No outage information available for this area';
}

function getBillDetails(customer_id = '') {
    const bills = {
        'C001': { amount: 899, due_date: '2026-07-05', status: 'unpaid' },
        'C002': { amount: 399, due_date: '2026-07-10', status: 'paid' },
    };
    return bills[customer_id] || 'Customer not found';
}

// ----------------------------------------------
// SPECIALIST AGENTS
// Each one is a single LLM call with: its own role-specific system
// prompt, relevant tool data baked directly into the prompt (a simple
// alternative to native tool-calling), and the ongoing conversation
// history so it has context from earlier in the chat.
// ----------------------------------------------
async function salesAgent(query, conversationHistory) {
    const plans = getAvailablePlans();
    const messages = [
        {
            role: 'system',
            content: `You are a sales specialist for a broadband company.
            Help users choose the right plan.
            Available plans: ${JSON.stringify(plans)}
            Be concise and helpful.`
        },
        ...conversationHistory, // spreads in all past turns so the agent has context
        { role: 'user', content: query }
    ];

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages
    });
    return response.choices[0].message.content;
}

async function supportAgent(query, conversationHistory) {
    const messages = [
        {
            role: 'system',
            content: `You are a technical support specialist for a broadband company.
            Help users with connectivity issues, outages, and technical problems.
            If asked about outages, you have access to this data: ${JSON.stringify({
                hyderabad: 'No outages reported',
                pune: 'Partial outage in Pune West — ETA fix: 2 hours',
                bangalore: 'No outages reported'
            })}
            Be concise and helpful.`
        },
        ...conversationHistory,
        { role: 'user', content: query }
    ];

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages
    });
    return response.choices[0].message.content;
}

async function billingAgent(query, conversationHistory) {
    const messages = [
        {
            role: 'system',
            content: `You are a billing specialist for a broadband company.
            Help users with bill payments, due dates, and billing queries.
            Bill data: ${JSON.stringify({
                C001: { amount: 899, due_date: '2026-07-05', status: 'unpaid' },
                C002: { amount: 399, due_date: '2026-07-10', status: 'paid' }
            })}
            Be concise and helpful.`
        },
        ...conversationHistory,
        { role: 'user', content: query }
    ];

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages
    });
    return response.choices[0].message.content;
}

// ----------------------------------------------
// ORCHESTRATOR — this is the key difference from handoff.js.
// Three LLM calls happen per user message, not two:
//   1. router       -> decides WHICH specialist to use
//   2. specialist   -> generates the actual answer
//   3. orchestrator -> reviews that answer and re-presents it to the
//                      user in ONE consistent voice/tone
// The user only ever sees the orchestrator's final reply — they never
// see "raw" specialist output or know a handoff happened at all.
// ----------------------------------------------
async function orchestrator(query, conversationHistory) {

    // step 1 — decide which specialist to delegate to
    const routerResponse = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are a router. Based on the user query, decide which specialist to delegate to.
                Specialists available:
                - sales: for plan enquiries, pricing, upgrades
                - support: for technical issues, outages, connectivity
                - billing: for bill payments, due dates, invoices
                Reply with ONLY one word: sales, support, or billing.`
            },
            { role: 'user', content: query }
        ]
    });

    const specialist = routerResponse.choices[0].message.content.trim().toLowerCase();
    console.log(`\n🔀 Delegating to: ${specialist} agent`);

    // step 2 — delegate to specialist and get their response
    let specialistResponse;
    if (specialist === 'sales') {
        specialistResponse = await salesAgent(query, conversationHistory);
    } else if (specialist === 'support') {
        specialistResponse = await supportAgent(query, conversationHistory);
    } else {
        specialistResponse = await billingAgent(query, conversationHistory);
    }

    console.log(`✅ ${specialist} agent responded`);

    // step 3 — orchestrator reviews the specialist's raw response and
    // rewrites it in a single, warm, consistent voice — the user only
    // ever sees THIS final output, never the specialist's raw answer
    const finalResponse = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are a friendly customer service orchestrator for a broadband company.
                A specialist agent has handled the user's query.
                Review their response and present it to the user in a warm, professional tone.
                Don't mention that you delegated to a specialist — just respond naturally.`
            },
            { role: 'user', content: query },
            { role: 'assistant', content: `Specialist response: ${specialistResponse}` },
            { role: 'user', content: 'Now present this to the customer professionally.' }
        ]
    });

    return finalResponse.choices[0].message.content;
}

// ----------------------------------------------
// MULTI-TURN CONVERSATION LOOP
// Unlike handoff.js (one-shot), this keeps a running conversationHistory
// array so the orchestrator and specialists remember earlier turns —
// same memory concept as project 01's messages[] array, just scoped to
// a customer support conversation.
// ----------------------------------------------
const conversationHistory = [];

console.log('🌐 Welcome to BroadbandCo Support! Type "exit" to quit.\n');

while (true) {
    const userInput = readlineSync.question('You: ');

    if (userInput.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        break;
    }

    const response = await orchestrator(userInput, conversationHistory);

    // maintain conversation history across turns
    conversationHistory.push({ role: 'user', content: userInput });
    conversationHistory.push({ role: 'assistant', content: response });

    console.log(`\nAgent: ${response}\n`);
}