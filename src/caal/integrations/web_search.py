"""Web search tool with DuckDuckGo + LLM summarization.

Provides a voice-friendly web search capability that:
1. Searches DuckDuckGo (free, no API key)
2. Summarizes results with the configured LLM provider for concise voice output
3. Returns 1-3 sentence answers instead of raw search results

Core logic is in execute_web_search() — called by both the LiveKit
mixin (WebSearchTools) and the non-LiveKit caller (ToolContext).
"""

import asyncio
import logging
from typing import TYPE_CHECKING, Any

from livekit.agents import function_tool

if TYPE_CHECKING:
    from ..llm.providers import LLMProvider

logger = logging.getLogger(__name__)

SUMMARIZE_PROMPT = """Summarize the following search results in 1-3 sentences for voice output.
Be concise and conversational. Do not include URLs, markdown, or bullet points.
Focus on directly answering what the user would want to know.

Search query: {query}

Results:
{results}

Summary:"""

# OpenAI-format tool definition (shared by ToolContext)
WEB_SEARCH_TOOL_DEF: dict = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": (
            "Web search — search the internet. "
            "Use ONLY when no other tool covers "
            "the request. Other tools are always "
            "preferred: use espn for sports, "
            "weather for weather, youtube for "
            "YouTube, etc.\n"
            "\n"
            "Use web_search for:\n"
            "- news and current events\n"
            "- prices\n"
            "- general questions needing "
            "up-to-date answers\n"
            "- topics not covered by any tool"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Search terms, e.g. "
                        "bitcoin price, "
                        "who won the super bowl"
                    ),
                },
            },
            "required": ["query"],
        },
    },
}


async def do_web_search(
    query: str,
    max_results: int = 5,
    timeout: float = 10.0,
) -> list[dict[str, Any]]:
    """Execute DuckDuckGo search in thread pool (blocking API).

    Returns list of result dicts with 'title', 'body', 'href' keys.
    """
    from ddgs import DDGS

    def _search():
        with DDGS(timeout=timeout) as ddgs:
            return list(ddgs.text(
                query,
                max_results=max_results,
                safesearch="moderate"
            ))

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _search)


async def summarize_results(
    query: str,
    results: list[dict[str, Any]],
    provider: "LLMProvider | None",
) -> str:
    """Summarize search results with configured LLM provider."""
    # Truncate to avoid exceeding context limits (~500 tokens total)
    formatted = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "")[:100]
        body = r.get("body", "")[:200]
        formatted.append(f"{i}. {title}: {body}")

    results_text = "\n".join(formatted)
    prompt = SUMMARIZE_PROMPT.format(query=query, results=results_text)

    if provider is None:
        logger.warning(
            "No provider available for summarization, returning raw results"
        )
        if results:
            return results[0].get("body", "No description available.")
        return "I had trouble processing the search results."

    try:
        messages = [{"role": "user", "content": prompt}]
        response = await provider.chat(messages=messages)
        summary = (response.content or "").strip()
        return summary or "I found some results but couldn't summarize them."

    except Exception as e:
        logger.error(f"Summarization error: {e}")
        # Fallback: return first result's snippet
        if results:
            return results[0].get("body", "No description available.")
        return "I had trouble processing the search results."


async def execute_web_search(
    query: str,
    provider: "LLMProvider | None",
    max_results: int = 5,
    timeout: float = 10.0,
) -> str:
    """Execute web search and return summarized results.

    Core logic shared by LiveKit mixin and non-LiveKit ToolContext.
    """
    logger.info(f"web_search: {query}")

    try:
        raw_results = await asyncio.wait_for(
            do_web_search(query, max_results=max_results, timeout=timeout),
            timeout=timeout
        )

        if not raw_results:
            return "I couldn't find any results for that search."

        return await summarize_results(query, raw_results, provider)

    except asyncio.TimeoutError:
        logger.warning(f"Web search timed out for query: {query}")
        return "The search took too long. Please try a simpler query."
    except Exception as e:
        logger.error(f"Web search error: {e}", exc_info=True)
        return "I had trouble searching the web. Please try again."


class WebSearchTools:
    """Mixin providing web search via DuckDuckGo with LLM summarization.

    Requires the parent class to have:
    - self._provider: LLMProvider instance (for summarization)

    Configuration (override in subclass if needed):
    - _search_max_results: int = 5
    - _search_timeout: float = 10.0
    """

    _search_max_results: int = 5
    _search_timeout: float = 10.0

    @function_tool
    async def web_search(self, query: str) -> str:
        """Search the web for current events, news, prices, hours, or time-sensitive info.

        Args:
            query: What to search for on the web.
        """
        return await execute_web_search(
            query=query,
            provider=getattr(self, "_provider", None),
            max_results=self._search_max_results,
            timeout=self._search_timeout,
        )
