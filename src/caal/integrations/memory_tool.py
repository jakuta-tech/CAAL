"""Short-term memory tool for CAAL.

Provides explicit memory operations for the LLM to store and retrieve data.
This is mechanism #2 of the three storage mechanisms:
    1. Auto-store: Tool responses with memory_hint field (automatic)
    2. Explicit: memory_short tool (this file) - user says "remember X"
    3. Passive: Tool descriptions instruct LLM to check memory first

Usage:
    class VoiceAssistant(MemoryTools, Agent):
        pass  # memory_short tool is automatically available
"""

import json
import logging
from typing import TYPE_CHECKING

from livekit.agents import function_tool

from ..memory.base import DEFAULT_TTL_SECONDS

if TYPE_CHECKING:
    from ..memory import ShortTermMemory

logger = logging.getLogger(__name__)


class MemoryTools:
    """Mixin providing memory_short tool for explicit memory operations.

    Requires the parent class to have:
    - self._short_term_memory: ShortTermMemory instance
    """

    @function_tool
    async def memory_short(
        self,
        action: str,
        key: str = "",
        value: str = "",
        ttl: str = "",
    ) -> str:
        """Store or retrieve information for later use in this conversation.

        Use this to remember things the user tells you like flight numbers,
        tracking codes, preferences, or any data you'll need to reference later.

        IMPORTANT: Before asking the user for information you've already
        discussed (like a tracking number or flight), check memory first
        with action="get" or action="list".

        Args:
            action: One of "store", "get", "delete", "list"
            key: The key to store/get/delete (e.g., "flight_number", "tracking_code")
            value: The value to store (only required for action="store")
            ttl: Optional expiry for store action. Examples: "1h", "6h", "1d",
                "7d", "30d", "forever". Default is 7 days if not specified.

        Returns:
            Result of the operation
        """
        memory: "ShortTermMemory" = getattr(self, "_short_term_memory", None)

        if memory is None:
            logger.warning("memory_short called but no memory instance available")
            return "Memory not available"

        logger.info(f"memory_short: action={action}, key={key}")

        if action == "store":
            if not key:
                return "Key is required for store action"
            if not value:
                return "Value is required for store action"

            # Parse value as JSON if it looks like JSON
            try:
                if value.startswith(("{", "[")):
                    parsed_value = json.loads(value)
                else:
                    parsed_value = value
            except json.JSONDecodeError:
                parsed_value = value

            # Parse TTL string to seconds
            ttl_seconds = self._parse_ttl(ttl) if ttl else None

            memory.store(key=key, value=parsed_value, ttl_seconds=ttl_seconds, source="explicit")
            return f"Stored: {key}"

        elif action == "get":
            if not key:
                return "Key is required for get action"

            result = memory.get(key)
            if result is None:
                return f"No value found for key: {key}"

            if isinstance(result, (dict, list)):
                return json.dumps(result)
            return str(result)

        elif action == "delete":
            if not key:
                return "Key is required for delete action"

            deleted = memory.delete(key)
            return f"Deleted: {key}" if deleted else f"Key not found: {key}"

        elif action == "list":
            entries = memory.list_keys()
            if not entries:
                return "Memory is empty"

            lines = ["Stored memory keys:"]
            for entry in entries:
                lines.append(f"- {entry['key']} (source: {entry['source']})")
            return "\n".join(lines)

        else:
            return f"Unknown action: {action}. Valid actions: store, get, delete, list"

    @staticmethod
    def _parse_ttl(ttl_str: str) -> int | None:
        """Parse a TTL string like '1h', '7d', 'never' into seconds."""
        ttl_str = ttl_str.strip().lower()
        if ttl_str in ("never", "none", "forever"):
            return None

        multipliers = {"s": 1, "m": 60, "h": 3600, "d": 86400}
        for suffix, mult in multipliers.items():
            if ttl_str.endswith(suffix):
                try:
                    return int(ttl_str[:-1]) * mult
                except ValueError:
                    break

        # Fall through to default
        return DEFAULT_TTL_SECONDS
