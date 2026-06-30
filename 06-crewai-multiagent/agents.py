# ============================================
# AGENTS — define WHO each agent is: their role, expertise, and
# permanent personality. This is separate from TASKS (what to do right
# now) — the same agent can be reused across many different tasks.
# ============================================

from crewai import Agent, LLM
from tools import yt_tool, yt_search_tool
import os
from dotenv import load_dotenv

load_dotenv()

# CrewAI's LLM class internally checks for an OPENAI_API_KEY env var
# even when we're not using OpenAI directly — setting it to our actual
# token avoids a startup validation error
os.environ["OPENAI_API_KEY"] = os.environ.get("GITHUB_TOKEN")

# GitHub Models gives free access to OpenAI-compatible models using just
# a GitHub personal access token — no billing required
llm = LLM(
    model="openai/gpt-4o-mini",
    base_url="https://models.github.ai/inference",
    api_key=os.environ.get("GITHUB_TOKEN")
)

# ----------------------------------------------
# AGENT 1 — finds and understands relevant YouTube content.
# Has BOTH tools because its job requires two steps: search first,
# then fetch a transcript from whatever it finds.
# allow_delegation=True means this agent COULD hand off work to another
# agent if it gets stuck — not used in this simple 2-agent crew, but
# matters more in larger crews.
# ----------------------------------------------
blob_researcher = Agent(
    role='Blob researcher from youtube videos',
    goal='Get the relevant video content for the topic {topic} from YT Channel',
    verbose=True,       # prints the agent's thinking/tool-use steps to console
    memory=False,       # disabled — CrewAI's memory feature caused a
                         # 'cache_breakpoint' incompatibility with some
                         # providers during testing; not needed for this
                         # single-run use case anyway
    backstory=(
        "Expert in understanding videos in AI data science, Machine learning and Genai and providing suggestion"
    ),
    tools=[yt_search_tool, yt_tool],
    allow_delegation=True,
    llm=llm
)

# ----------------------------------------------
# AGENT 2 — turns the researcher's findings into an engaging dialogue
# script. Deliberately has NO tools — it should only work with whatever
# context the researcher hands it via CrewAI's automatic sequential
# task-chaining (see crew.py), not go fetch its own data independently.
# ----------------------------------------------
blob_writer = Agent(
    role='Blob writer',
    goal='Narrate compelling tech stories about the video from transcripts of yt channel',
    verbose=True,
    memory=False,
    backstory=(
        "With the flair for simplifying complex topics, you craft "
        "engaging narratives that captivate and educate, bringing new "
        "discoveries to light in an accessible manner"
    ),
    tools=[],
    allow_delegation=False,
    llm=llm
)