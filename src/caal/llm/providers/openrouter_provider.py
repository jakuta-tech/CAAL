"""OpenRouter LLM provider implementation.

Provides access to 400+ cloud models through OpenRouter's unified API.
Uses the OpenAI Python library with OpenRouter's base URL for async API calls.

See: https://openrouter.ai/docs
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any, cast

from openai import AsyncOpenAI

from .base import LLMProvider, LLMResponse, ToolCall

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

__all__ = ["OpenRouterProvider"]

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterProvider(LLMProvider):
    """OpenRouter cloud LLM provider.

    Provides access to 400+ models including GPT-4, Claude, Llama, Mistral,
    and many others through a single API. Uses the OpenAI-compatible API
    with OpenRouter-specific headers for attribution.

    Features:
        - Async API calls via openai.AsyncOpenAI
        - Arguments returned as JSON string (parsed automatically)
        - Tool results require name field
        - Attribution headers for model providers

    Args:
        model: OpenRouter model ID (e.g., "openai/gpt-4", "anthropic/claude-3-opus")
        api_key: OpenRouter API key (required)
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens to generate

    See: https://openrouter.ai/docs/models
    """

    def __init__(
        self,
        model: str,
        api_key: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> None:
        self._model = model
        self._api_key = api_key
        self._temperature = temperature
        self._max_tokens = max_tokens

        if not self._api_key:
            raise ValueError(
                "OpenRouter API key required. Pass api_key parameter "
                "or configure in settings."
            )

        self._client = AsyncOpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=self._api_key,
            default_headers={
                "HTTP-Referer": "https://github.com/caal-project/caal",
                "X-Title": "CAAL Voice Assistant",
            },
        )

        logger.debug(f"OpenRouterProvider initialized: {model}")

    @property
    def provider_name(self) -> str:
        return "openrouter"

    @property
    def model(self) -> str:
        return self._model

    @property
    def temperature(self) -> float:
        return self._temperature

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """Execute non-streaming OpenRouter chat completion.

        Args:
            messages: List of message dicts
            tools: Optional tool definitions
            **kwargs: Additional options

        Returns:
            Normalized LLMResponse
        """
        request_kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": False,
        }

        if tools:
            request_kwargs["tools"] = tools
            request_kwargs["tool_choice"] = "auto"

        response = await self._client.chat.completions.create(**request_kwargs)

        # Extract from OpenRouter response format
        message = response.choices[0].message

        # Extract tool calls if present
        tool_calls: list[ToolCall] = []
        if message.tool_calls:
            for tc in message.tool_calls:
                # OpenRouter returns arguments as JSON string
                args = self.parse_tool_arguments(tc.function.arguments)
                tool_calls.append(
                    ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        arguments=args,
                    )
                )

        return LLMResponse(content=message.content, tool_calls=tool_calls)

    async def chat_stream(  # type: ignore[override]
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Execute streaming OpenRouter chat completion.

        Args:
            messages: List of message dicts
            tools: Optional tool definitions (for validation of tool_calls in history)
            **kwargs: Additional options

        Yields:
            String chunks of response content
        """
        request_kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": True,
        }

        # Include tools if provided (for validation of tool_calls in message history)
        # Set tool_choice="none" to prevent the model from making tool calls
        # in streaming mode — streaming is used for text responses only.
        # Without this, the model may generate tool call deltas instead of
        # content deltas, producing zero text output and a silent session.
        if tools:
            request_kwargs["tools"] = tools
            request_kwargs["tool_choice"] = "none"

        stream = await self._client.chat.completions.create(**request_kwargs)

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def parse_tool_arguments(self, arguments: Any) -> dict[str, Any]:
        """Parse OpenRouter tool arguments from JSON string.

        OpenRouter returns tool call arguments as a JSON string, similar to
        other OpenAI-compatible APIs.

        Args:
            arguments: JSON string or dict of arguments

        Returns:
            Parsed arguments dict
        """
        if isinstance(arguments, str):
            try:
                return cast(dict[str, Any], json.loads(arguments))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse tool arguments: {arguments}")
                return {}
        if isinstance(arguments, dict):
            return arguments
        return {}

    def format_tool_result(
        self,
        content: str,
        tool_call_id: str | None,
        tool_name: str,
    ) -> dict[str, Any]:
        """Format tool result message for OpenRouter.

        OpenRouter requires the tool name in addition to tool_call_id.

        Args:
            content: Tool execution result as string
            tool_call_id: ID of the tool call being responded to
            tool_name: Name of the tool that was called

        Returns:
            Message dict for OpenRouter API
        """
        result: dict[str, Any] = {
            "role": "tool",
            "content": content,
            "tool_call_id": tool_call_id,
            "name": tool_name,  # Required by OpenAI-compatible API
        }
        return result
