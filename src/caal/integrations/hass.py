"""Home Assistant MCP integration for CAAL.

Provides domain-aware intent mapping and automatic tool prefix detection
for reliable Home Assistant device control via voice commands.

Features:
- Automatic detection of MCP tool prefixes (assist__ vs bare names)
- Device cache with domain information from GetLiveContext
- Domain-specific intent mapping (cover -> HassOpenCover, not HassTurnOn)
- Simplified hass_control/hass_get_state interface for LLM

Usage:
    hass_server = mcp_servers.get("home_assistant")
    if hass_server:
        prefix = await detect_hass_tool_prefix(hass_server)
        tool_defs, tool_callables = create_hass_tools(hass_server, prefix)
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field

from livekit.agents import mcp

logger = logging.getLogger(__name__)

# Cache TTL in seconds (5 minutes)
DEVICE_CACHE_TTL = 300


@dataclass
class HADevice:
    """Cached Home Assistant device information."""

    name: str
    domain: str
    state: str
    area: str | None = None


@dataclass
class HADeviceCache:
    """Cache for Home Assistant device information.

    Parses GetLiveContext response to extract device names and domains,
    enabling domain-aware intent mapping.
    """

    devices: dict[str, HADevice] = field(default_factory=dict)
    last_updated: float = 0.0

    def is_stale(self) -> bool:
        """Check if cache needs refresh."""
        return time.time() - self.last_updated > DEVICE_CACHE_TTL

    def parse_live_context(self, text: str) -> None:
        """Parse GetLiveContext response to extract device information.

        Expected format from Home Assistant MCP:
        ```
        entity_id: cover.garage_door_left
        names: Garage Door Left
        state: closed
        area: Garage
        ...
        ```
        """
        self.devices.clear()

        # Parse entities from the context text
        current_entity: dict[str, str] = {}

        for line in text.split("\n"):
            line = line.strip()
            if not line:
                # End of entity block - save if valid
                if current_entity.get("names") and current_entity.get("entity_id"):
                    entity_id = current_entity["entity_id"]
                    # Extract domain from entity_id (e.g., "cover" from "cover.garage_door")
                    domain = entity_id.split(".")[0] if "." in entity_id else "unknown"

                    device = HADevice(
                        name=current_entity["names"],
                        domain=domain,
                        state=current_entity.get("state", "unknown"),
                        area=current_entity.get("area"),
                    )
                    # Store by lowercase name for case-insensitive lookup
                    self.devices[device.name.lower()] = device

                current_entity = {}
                continue

            # Parse key: value lines
            if ":" in line:
                key, _, value = line.partition(":")
                key = key.strip().lower()
                value = value.strip()

                if key in ("entity_id", "names", "state", "area"):
                    current_entity[key] = value

        # Handle last entity if no trailing newline
        if current_entity.get("names") and current_entity.get("entity_id"):
            entity_id = current_entity["entity_id"]
            domain = entity_id.split(".")[0] if "." in entity_id else "unknown"
            device = HADevice(
                name=current_entity["names"],
                domain=domain,
                state=current_entity.get("state", "unknown"),
                area=current_entity.get("area"),
            )
            self.devices[device.name.lower()] = device

        self.last_updated = time.time()
        logger.debug(f"Parsed {len(self.devices)} devices from GetLiveContext")

    def find_device(self, target: str) -> HADevice | None:
        """Find device by name (case-insensitive, with fuzzy matching).

        Args:
            target: Device name to search for

        Returns:
            HADevice if found, None otherwise
        """
        target_lower = target.lower()

        # Exact match
        if target_lower in self.devices:
            return self.devices[target_lower]

        # Partial match (target contained in device name or vice versa)
        for name, device in self.devices.items():
            if target_lower in name or name in target_lower:
                return device

        # Word-based fuzzy match
        target_words = set(target_lower.split())
        best_match: HADevice | None = None
        best_score = 0

        for name, device in self.devices.items():
            name_words = set(name.split())
            # Count matching words
            common = len(target_words & name_words)
            if common > best_score:
                best_score = common
                best_match = device

        return best_match if best_score > 0 else None


# Domain-aware action remapping: correct common LLM mistakes
# When LLM sends set_volume for a light, remap to set_brightness, etc.
DOMAIN_ACTION_REMAP: dict[tuple[str, str], str] = {
    ("set_volume", "light"): "set_brightness",
    ("set_volume", "climate"): "set_temperature",
    ("set_brightness", "media_player"): "set_volume",
    ("set_brightness", "climate"): "set_temperature",
    ("set_temperature", "light"): "set_brightness",
    ("set_temperature", "media_player"): "set_volume",
}

# Intent mapping: (action, domain) -> (intent_name, extra_args)
# Domain-specific mappings take priority over generic ones
INTENT_MAP: dict[tuple[str, str | None], tuple[str, dict]] = {
    # Cover-specific intents (domain takes priority)
    ("turn_on", "cover"): ("HassOpenCover", {}),
    ("turn_off", "cover"): ("HassCloseCover", {}),
    ("open", "cover"): ("HassOpenCover", {}),
    ("close", "cover"): ("HassCloseCover", {}),
    ("stop", "cover"): ("HassStopMoving", {}),
    # Light-specific intents
    ("set_brightness", "light"): ("HassLightSet", {}),
    # Climate-specific intents
    ("set_temperature", "climate"): ("HassClimateSetTemperature", {}),
    # Generic intents (fallback when no domain-specific match)
    ("turn_on", None): ("HassTurnOn", {}),
    ("turn_off", None): ("HassTurnOff", {}),
    ("toggle", None): ("HassToggle", {}),
    ("open", None): ("HassTurnOn", {}),  # Fallback for non-covers
    ("close", None): ("HassTurnOff", {}),  # Fallback for non-covers
    # Media intents (work across domains)
    ("pause", None): ("HassMediaPause", {}),
    ("play", None): ("HassMediaUnpause", {}),
    ("next", None): ("HassMediaNext", {}),
    ("previous", None): ("HassMediaPrevious", {}),
    ("volume_up", None): ("HassSetVolumeRelative", {"volume_step": "up"}),
    ("volume_down", None): ("HassSetVolumeRelative", {"volume_step": "down"}),
    ("set_volume", None): ("HassSetVolume", {}),
    ("mute", None): ("HassMediaPlayerMute", {}),
    ("unmute", None): ("HassMediaPlayerUnmute", {}),
}


async def detect_hass_tool_prefix(hass_server: mcp.MCPServerHTTP) -> str:
    """Detect the tool prefix used by the Home Assistant MCP server.

    Some HA MCP implementations use 'assist__' prefix (e.g., assist__HassTurnOn),
    while others use bare names (HassTurnOn). This function detects which is in use.

    Args:
        hass_server: Connected Home Assistant MCP server

    Returns:
        Tool prefix string ('assist__' or '')
    """
    if not hass_server or not hasattr(hass_server, "_client"):
        return ""

    try:
        # List available tools
        result = await hass_server._client.list_tools()
        tool_names = [tool.name for tool in result.tools]

        # Check for assist__ prefix
        for name in tool_names:
            if name.startswith("assist__"):
                logger.info("Detected Home Assistant MCP with 'assist__' prefix")
                return "assist__"

        logger.info("Detected Home Assistant MCP with bare tool names")
        return ""

    except Exception as e:
        logger.warning(f"Failed to detect HASS tool prefix: {e}")
        return ""


def create_hass_tools(
    hass_server: mcp.MCPServerHTTP,
    tool_prefix: str = "",
) -> tuple[list[dict], dict]:
    """Create Home Assistant tools bound to the given MCP server.

    Args:
        hass_server: Connected Home Assistant MCP server
        tool_prefix: Tool name prefix (e.g., 'assist__' or '')

    Returns:
        tuple: (tool_definitions, tool_callables)
        - tool_definitions: List of tool definitions in OpenAI format for LLM
        - tool_callables: Dict mapping tool name to callable function
    """
    # Device cache shared between tools
    device_cache = HADeviceCache()

    def _apply_prefix(tool_name: str) -> str:
        """Apply the detected prefix to a tool name."""
        return f"{tool_prefix}{tool_name}"

    def _resolve_intent(action: str, domain: str | None) -> tuple[str, dict]:
        """Resolve action + domain to the correct HA intent and extra args.

        Tries domain-specific mapping first, then falls back to generic.
        """
        # Try domain-specific mapping first
        if domain:
            key = (action, domain)
            if key in INTENT_MAP:
                return INTENT_MAP[key]

        # Fall back to generic mapping
        key = (action, None)
        if key in INTENT_MAP:
            return INTENT_MAP[key]

        # Unknown action
        return ("", {})

    async def _refresh_device_cache() -> None:
        """Refresh device cache from GetLiveContext."""
        if not device_cache.is_stale():
            return

        try:
            result = await hass_server._client.call_tool(
                _apply_prefix("GetLiveContext"), {}
            )

            if not result.isError:
                texts = [c.text for c in result.content if hasattr(c, "text") and c.text]
                if texts:
                    device_cache.parse_live_context(" ".join(texts))

        except Exception as e:
            logger.warning(f"Failed to refresh device cache: {e}")

    async def hass_control(action: str, target: str, value: int = None) -> str:
        """Control Home Assistant devices.

        Parameters:
            action: turn_on, turn_off, open, close, toggle, volume_up,
                   volume_down, set_volume, mute, unmute, pause, play,
                   next, previous, set_brightness, set_temperature, stop
            target: Device name (e.g., "office lamp", "garage door")
            value: For set_volume/set_brightness (0-100), set_temperature (degrees)
        """
        if not hass_server or not hasattr(hass_server, "_client"):
            return "Home Assistant is not connected"

        # Refresh device cache if stale
        await _refresh_device_cache()

        # Look up device to get domain
        device = device_cache.find_device(target)
        domain = device.domain if device else None

        # Remap mismatched actions based on domain (e.g., set_volume on a light -> set_brightness)
        if domain:
            remap_key = (action, domain)
            if remap_key in DOMAIN_ACTION_REMAP:
                corrected = DOMAIN_ACTION_REMAP[remap_key]
                logger.info(f"Remapped {action} -> {corrected} for {domain} domain")
                action = corrected

        # Resolve action to intent
        intent_name, extra_args = _resolve_intent(action, domain)

        if not intent_name:
            valid_actions = sorted(set(a for a, _ in INTENT_MAP.keys()))
            return f"Unknown action: {action}. Valid actions: {', '.join(valid_actions)}"

        # Build arguments
        args = {"name": target}

        # Include domain if we found one (improves HA intent matching)
        if domain:
            args["domain"] = [domain]

        # Add extra args from intent mapping
        args.update(extra_args)

        # Handle value parameter for specific actions
        if action == "set_volume" and value is not None:
            args["volume_level"] = value
        elif action == "set_brightness" and value is not None:
            args["brightness"] = value
        elif action == "set_temperature" and value is not None:
            args["temperature"] = value

        # Apply prefix and call tool
        tool_name = _apply_prefix(intent_name)

        try:
            result = await hass_server._client.call_tool(tool_name, args)

            # Check for errors
            if result.isError:
                error_texts = [c.text for c in result.content if hasattr(c, "text") and c.text]
                return f"Error: {' '.join(error_texts)}"

            # Extract success message
            texts = [c.text for c in result.content if hasattr(c, "text") and c.text]
            return " ".join(texts) if texts else f"Done: {action} {target}"

        except Exception as e:
            logger.error(f"hass_control error: {e}")
            return f"Failed to {action} {target}: {e}"

    async def hass_get_state(target: str = None) -> str:
        """Get the current state of Home Assistant devices.

        Parameters:
            target: Device name to filter (optional, omit for all devices)
        """
        if not hass_server or not hasattr(hass_server, "_client"):
            return "Home Assistant is not connected"

        try:
            tool_name = _apply_prefix("GetLiveContext")
            result = await hass_server._client.call_tool(tool_name, {})

            # Check for errors
            if result.isError:
                error_texts = [c.text for c in result.content if hasattr(c, "text") and c.text]
                return f"Error: {' '.join(error_texts)}"

            # Extract content
            texts = [c.text for c in result.content if hasattr(c, "text") and c.text]
            full_context = " ".join(texts) if texts else "No devices found"

            # Update device cache while we have the data
            device_cache.parse_live_context(full_context)

            # If target specified, filter to just that device
            if target:
                target_lower = target.lower()
                # Simple filter: look for lines containing the target name
                lines = full_context.split("\n")
                filtered = []
                capturing = False
                for line in lines:
                    if "names:" in line.lower() and target_lower in line.lower():
                        capturing = True
                    elif "names:" in line.lower() and capturing:
                        capturing = False
                    if capturing:
                        filtered.append(line)
                if filtered:
                    return "\n".join(filtered)
                return f"Device '{target}' not found"

            return full_context

        except Exception as e:
            logger.error(f"hass_get_state error: {e}")
            return f"Failed to get state: {e}"

    # Tool definitions in OpenAI format for LLM
    tool_definitions = [
        {
            "type": "function",
            "function": {
                "name": "hass_control",
                "description": (
                    "Control Home Assistant devices. "
                    "Parameters: action (required: turn_on, turn_off, open, close, "
                    "toggle, volume_up, volume_down, set_volume, mute, unmute, "
                    "pause, play, next, previous, set_brightness, set_temperature, stop), "
                    "target (required: device name), "
                    "value (optional: for set_volume/set_brightness 0-100, "
                    "set_temperature in degrees)."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {"type": "string"},
                        "target": {"type": "string"},
                        "value": {"type": "integer"},
                    },
                    "required": ["action", "target"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "hass_get_state",
                "description": (
                    "Get the current state of Home Assistant devices. "
                    "Parameters: target (optional: device name to "
                    "filter, or omit for all devices)."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target": {"type": "string"},
                    },
                    "required": [],
                },
            },
        },
    ]

    # Callable functions for tool execution
    tool_callables = {
        "hass_control": hass_control,
        "hass_get_state": hass_get_state,
    }

    return tool_definitions, tool_callables
