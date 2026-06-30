# ============================================
# CREW — assembles agents + tasks into a complete pipeline and runs it.
# This is the entry point: `python crew.py` executes the whole thing.
# ============================================

from crewai import Crew, Process
from agents import blob_researcher, blob_writer
from tasks import research_task, writer_task
import os
from dotenv import load_dotenv

load_dotenv()
os.environ["OPENAI_API_KEY"] = os.environ.get("GITHUB_TOKEN")

crew = Crew(
    agents=[blob_researcher, blob_writer],
    tasks=[research_task, writer_task],

    # sequential = tasks run one after another, IN THE ORDER LISTED in
    # the tasks=[] array above (not the agents=[] order — that list's
    # order doesn't matter, each task already names its own agent).
    # After research_task finishes, its output is AUTOMATICALLY injected
    # as context into writer_task's prompt — this handoff is built into
    # CrewAI's sequential process; we never wrote that wiring ourselves.
    process=Process.sequential,

    verbose=True,
    memory=False,    # disabled to avoid a 'cache_breakpoint' field
                      # incompatibility encountered with some LLM providers
    cache=False,      # same reason as memory
    max_rpm=10,       # caps requests per minute to avoid rate-limit errors
    share_crew=False  # don't share anonymized crew data with CrewAI
)

# fills the {topic} placeholder used in both tasks.py and agents.py,
# then runs the full pipeline: research_task -> writer_task
result = crew.kickoff(inputs={'topic': 'BhagvatGita Lessons'})
print(result)