"""Base types and constants for CAAL memory systems.

This module provides shared types used by both short-term and future long-term
memory implementations, ensuring consistent interfaces across the memory layer.

Memory Architecture:
    Short-term: Session/task context, JSON key-value, TTL-based expiry
    Long-term (future): Knowledge graph, embeddings, semantic search
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal, TypedDict

# Memory storage directory - same as settings.json location
_SCRIPT_DIR = Path(__file__).parent.parent.parent.parent  # src/caal/memory -> project root
MEMORY_DIR = Path(os.getenv("CAAL_MEMORY_DIR", _SCRIPT_DIR))

# Default TTL for auto-stored data (7 days)
DEFAULT_TTL_SECONDS = 604800

# Source types for tracking where memory entries came from
MemorySource = Literal["tool_hint", "explicit", "api"]


class MemoryEntry(TypedDict):
    """Single memory entry with metadata.

    Attributes:
        value: The stored data (any JSON-serializable type)
        stored_at: Unix timestamp when entry was created
        expires_at: Unix timestamp for expiry, or None for no expiry
        source: How the entry was created (tool_hint, explicit, api)
    """

    value: Any
    stored_at: float
    expires_at: float | None
    source: MemorySource


class MemoryStore(TypedDict):
    """Full memory store structure.

    Attributes:
        entries: Dict mapping keys to MemoryEntry objects
    """

    entries: dict[str, MemoryEntry]
