# 06 — CrewAI Multi-Agent System (Python)

A real multi-agent pipeline using CrewAI: a researcher agent finds and understands a YouTube video on a given topic, then hands its findings to a writer agent that turns it into an engaging dialogue script. This is the only Python project in the repo — everything else is JavaScript.


<img width="690" height="467" alt="image" src="https://github.com/user-attachments/assets/5f735e8a-11c0-4896-bf8a-9a027884284f" />

## How it works

```
crew.kickoff(inputs={'topic': 'BhagvatGita Lessons'})
        ↓
fills {topic} into research_task's description
        ↓
Researcher Agent runs:
  1. calls YouTube Search Tool (real API call) -> finds candidate videos
  2. calls YouTube Transcript Tool (real API call) -> fetches transcript
  3. summarizes findings into a 3-paragraph research output
        ↓
CrewAI's sequential process AUTOMATICALLY injects the researcher's
output as context into the writer task — no code written for this,
it's built into Process.sequential
        ↓
Writer Agent runs:
  - receives researcher's summary as context (no tools, no topic input)
  - writes a two-friends dialogue script explaining the core concept
  - saves the result to new-blog-post.md
        ↓
final output printed to console
```

## Setup

```bash
python3 -m venv venv
source venv/bin/activate          # activate the virtual environment — do this every new terminal session
pip install -r requirements.txt   # or: pip install crewai==0.51.0 litellm youtube-transcript-api google-api-python-client python-dotenv
cp .env.example .env
# paste your GitHub Models token and YouTube Data API key into .env
python crew.py
```

To deactivate the virtual environment later: `deactivate`

## Getting the required keys (both free)

- **GitHub Models token** — github.com → Settings → Developer settings → Personal access tokens. Gives free access to OpenAI-compatible models.
- **YouTube Data API key** — console.cloud.google.com → enable "YouTube Data API v3" → create credentials → API key. Free tier is generous for learning/testing.

## Key concepts learned

- **Agents define WHO, tasks define WHAT.** `Agent` holds permanent identity (role, backstory, expertise) — `Task` holds a specific, swappable assignment. The same researcher agent could be reused across many different topics/tasks without redefinition.
- **Sequential process auto-injects context between tasks.** Nowhere in `tasks.py` or `agents.py` is the researcher's output explicitly passed to the writer — `Process.sequential` in `crew.py` handles this automatically based on the order of the `tasks=[]` list.
- **Task execution order comes from the `tasks=[]` list, not `agents=[]`.** Each task already names its own agent via `agent=blob_researcher`, so the agents list order is irrelevant to execution sequence.
- **CrewAI runs its own ReAct loop internally per task.** Watching `verbose=True` output showed the researcher agent calling the transcript tool multiple times across different candidate videos until one succeeded — that's an internal Think → Act → Observe loop, the same pattern built manually in Project 01, just hidden inside CrewAI's `AgentExecutor`.
- **Defining tools on both agent and task risks mismatch.** Tools were intentionally defined only once, on the agent — task-level tool lists are optional and only useful when the same agent needs different tools for different tasks.
- **`max_rpm`, `cache`, and `memory` are framework-level settings, not concepts to skip past.** `max_rpm` throttles API calls to avoid rate-limit errors; `cache`/`memory` were disabled here after hitting a provider-incompatibility error (`cache_breakpoint` field unsupported) — a reminder that framework defaults aren't always compatible with every LLM provider.

## Real issues hit and fixed during development

- **CrewAI assumes OpenAI by default.** Several errors traced back to this assumption — a `cache_breakpoint` field CrewAI sends that only OpenAI's API accepts, and `YoutubeVideoSearchTool` (CrewAI's built-in tool) hard-requiring an OpenAI key for its internal embeddings. Solved by writing custom tools (`tools.py`) instead of using CrewAI's built-in ones, and routing the LLM through GitHub Models instead of Groq, which resolved the compatibility errors Groq triggered.
- **`youtube_transcript_api` changed its return type between versions.** Older code expected dictionaries (`t['text']`); the installed version returns objects (`snippet.text`) — caught via a runtime `TypeError` and fixed by checking the installed library's actual interface rather than trusting older tutorial code.
- **`pkg_resources` import errors** appeared after switching crewai versions to resolve provider compatibility — resolved by reinstalling `setuptools` inside the virtual environment, since `pkg_resources` is bundled with it and can go missing on newer Python versions.

## Free resources used

- **[GitHub Models](https://github.com/marketplace/models)** — free OpenAI-compatible LLM access via personal access token.
- **[YouTube Data API v3](https://console.cloud.google.com)** — free tier, used for the search tool.
- **[CrewAI](https://www.crewai.com)** — open-source multi-agent orchestration framework.

