# ============================================
# TOOLS — plain functions wrapped as CrewAI BaseTool subclasses.
# Each tool needs a `name` (what the agent calls it) and `description`
# (how the agent decides WHEN to use it) — these get baked into the
# agent's system prompt automatically by CrewAI.
# ============================================

from crewai.tools import BaseTool
from youtube_transcript_api import YouTubeTranscriptApi
from googleapiclient.discovery import build
import os

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")


class YouTubeSearchTool(BaseTool):
    name: str = "YouTube Search Tool"
    description: str = "Searches YouTube for videos on a topic. Input should be a search query string."

    def _run(self, query: str) -> str:
        try:
            youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
            request = youtube.search().list(q=query, part='snippet', maxResults=3)
            response = request.execute()
            results = []
            for item in response['items']:
                video_id = item['id'].get('videoId')
                title = item['snippet']['title']
                if video_id:
                    results.append(f"{title}: https://www.youtube.com/watch?v={video_id}")
            return "\n".join(results)
        except Exception as e:
            return f"Search failed: {str(e)}"


class YouTubeTranscriptTool(BaseTool):
    name: str = "YouTube Transcript Tool"
    description: str = "Fetches transcript from a YouTube video URL. Input should be a full YouTube video URL."

    def _run(self, video_url: str) -> str:
        try:
            # extract just the video ID from a full URL
            # e.g. "https://www.youtube.com/watch?v=abc123&t=10" -> "abc123"
            video_id = video_url.split("v=")[-1].split("&")[0]

            ytt = YouTubeTranscriptApi()

            # try English first; some videos only have auto-generated
            # transcripts in other languages (e.g. Hindi) — fall back to
            # whatever's available rather than failing outright
            try:
                transcript = ytt.fetch(video_id, languages=['en'])
            except:
                transcript = ytt.fetch(video_id)

            # newer youtube_transcript_api versions return objects with
            # a .text attribute, not dictionaries — this caught us out
            # during development (older tutorials use t['text'])
            text = " ".join([snippet.text for snippet in transcript])

            # truncate to avoid blowing past the LLM's context window
            return text[:5000]
        except Exception as e:
            return f"Could not fetch transcript: {str(e)}"


# single shared instances — imported by agents.py and tasks.py
yt_search_tool = YouTubeSearchTool()
yt_tool = YouTubeTranscriptTool()