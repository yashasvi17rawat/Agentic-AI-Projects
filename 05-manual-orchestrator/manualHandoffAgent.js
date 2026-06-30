// ============================================
// HANDOFF PATTERN — the simplest multi-agent design.
// A router decides which specialist should answer, then that
// specialist's answer goes STRAIGHT to the user — no further processing.
// Think of it like a receptionist transferring your call: once
// transferred, you talk directly to the specialist.
// ============================================

import 'dotenv/config';
import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.GITHUB_TOKEN,
    baseURL: "https://models.github.ai/inference" // GitHub Models — free OpenAI-compatible endpoint
});

// ----------------------------------------------
// AGENT 1 — Sales specialist. Just a single LLM call with its own
// system prompt defining its role. No tools, no memory yet — kept
// intentionally simple to isolate the handoff pattern itself.
// ----------------------------------------------
async function salesAgent(query) {
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a sales agent for a broadband company.' },
            { role: 'user', content: query }
        ]
    });
    return response.choices[0].message.content;
}

// ----------------------------------------------
// AGENT 2 — Support specialist. Same structure as salesAgent, different
// role. Each "agent" here is really just a function with its own system
// prompt — there's no special "Agent" object or class needed.
// ----------------------------------------------
async function supportAgent(query) {
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a support agent for a broadband company.' },
            { role: 'user', content: query }
        ]
    });
    return response.choices[0].message.content;
}

// ----------------------------------------------
// ORCHESTRATOR (acting as a simple ROUTER here)
// Makes ONE extra LLM call whose only job is to classify the query and
// pick a specialist — it does NOT process or rewrite the specialist's
// answer afterwards. That's what makes this a "handoff" and not a true
// orchestrator pattern (see orchestrator.js for the difference).
// ----------------------------------------------
async function orchestrator(query) {
    const router = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { 
                role: 'system', 
                content: 'You decide which agent should handle the query. Reply with only "sales" or "support".' 
            },
            { role: 'user', content: query }
        ]
    });
    
    const decision = router.choices[0].message.content.trim().toLowerCase();
    console.log(`Router decision: ${decision}`);
    
    // whichever specialist is picked, their raw answer goes straight
    // back to the caller — no further polishing or review happens
    if (decision === 'sales') {
        return await salesAgent(query);
    } else {
        return await supportAgent(query);
    }
}

const result = await orchestrator('I wanted to get a refund of my last recharged plan?');
console.log(result);