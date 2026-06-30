# ============================================
# TASKS — define WHAT to do right now. Each task assigns a specific job
# to an agent: a description of the work, the expected output format,
# and (optionally) which tools are available for THIS task specifically.
# ============================================

from crewai import Task
from tools import yt_tool, yt_search_tool
from agents import blob_researcher, blob_writer

# ----------------------------------------------
# TASK 1 — research. {topic} is a placeholder filled in later when
# crew.kickoff(inputs={'topic': '...'}) is called.
# No `tools=[]` listed here — the task inherits whatever tools are
# already defined on blob_researcher in agents.py, avoiding the
# redundancy/mismatch risk of defining tool lists in two places.
# ----------------------------------------------
research_task = Task(
    description=(
        "Search for a YouTube video about {topic}. "
        "First use the YouTube Search Tool to find relevant videos. "
        "Then use the YouTube Transcript Tool to get the transcript of the most relevant video. "
        "Provide detailed information from the video content."
    ),
    expected_output='A comprehensive 3 paragraph summary based on the {topic} video content.',
    agent=blob_researcher,
)

# ----------------------------------------------
# TASK 2 — writing. Notice this description does NOT repeat {topic} or
# ask the writer to fetch anything itself — it relies entirely on
# CrewAI's sequential process automatically injecting research_task's
# output as context into this task's prompt (see crew.py).
# output_file saves the final result directly to disk.
# ----------------------------------------------
writer_task = Task(
    description=(
        "Get information about the video from the transcript and understand it thoroughly "
        "to create an engaging dialogue between two friends teaching one another about the core concept."
    ),
    expected_output='Create a dialogue script based on the transcript of the video channel and write it in the file.',
    agent=blob_writer,
    async_execution=False,  # run synchronously, after research_task fully completes
    output_file='new-blog-post.md'
)