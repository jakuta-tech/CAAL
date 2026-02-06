"""Synchronous OpenAI-compatible TTS wrapper.

This bypasses httpx async issues in LiveKit subprocess by using
synchronous requests wrapped in asyncio.run_in_executor.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import partial

import requests
from livekit.agents import tts, APIConnectOptions, APIConnectionError, APIStatusError
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

SAMPLE_RATE = 24000
NUM_CHANNELS = 1


@dataclass
class _TTSOptions:
    model: str
    voice: str
    speed: float
    base_url: str
    api_key: str
    response_format: str


class SyncOpenAITTS(tts.TTS):
    """OpenAI-compatible TTS using synchronous requests."""

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        voice: str,
        api_key: str = "not-needed",
        speed: float = 1.0,
        response_format: str = "mp3",
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._opts = _TTSOptions(
            model=model,
            voice=voice,
            speed=speed,
            base_url=base_url.rstrip("/"),
            api_key=api_key,
            response_format=response_format,
        )
        self._executor = ThreadPoolExecutor(max_workers=4)

    def synthesize(
        self, text: str, *, conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS
    ) -> "SyncChunkedStream":
        return SyncChunkedStream(tts=self, input_text=text, conn_options=conn_options)

    async def aclose(self) -> None:
        self._executor.shutdown(wait=False)


class SyncChunkedStream(tts.ChunkedStream):
    """Stream that uses synchronous HTTP for TTS requests."""

    def __init__(
        self,
        *,
        tts: SyncOpenAITTS,
        input_text: str,
        conn_options: APIConnectOptions,
    ) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._tts: SyncOpenAITTS = tts

    def _sync_request(self, text: str, opts: _TTSOptions, timeout: float) -> bytes:
        """Make synchronous TTS request."""
        url = f"{opts.base_url}/audio/speech"
        headers = {
            "Authorization": f"Bearer {opts.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "input": text,
            "model": opts.model,
            "voice": opts.voice,
            "speed": opts.speed,
            "response_format": opts.response_format,
        }

        print(f"[SyncTTS] Requesting: {url} with model={opts.model}, voice={opts.voice}")

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout,
            stream=True,
        )

        if response.status_code != 200:
            raise APIStatusError(
                f"TTS request failed: {response.text}",
                status_code=response.status_code,
                request_id="",
                body=response.text,
            )

        # Collect all chunks
        audio_data = b""
        for chunk in response.iter_content(chunk_size=8192):
            audio_data += chunk

        print(f"[SyncTTS] Received {len(audio_data)} bytes of audio")
        return audio_data

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        """Run TTS synthesis using thread executor."""
        loop = asyncio.get_event_loop()
        opts = self._tts._opts
        timeout = max(30.0, self._conn_options.timeout)

        try:
            # Run synchronous request in thread pool
            audio_data = await loop.run_in_executor(
                self._tts._executor,
                partial(self._sync_request, self.input_text, opts, timeout),
            )

            output_emitter.initialize(
                request_id="sync-tts",
                sample_rate=SAMPLE_RATE,
                num_channels=NUM_CHANNELS,
                mime_type=f"audio/{opts.response_format}",
            )

            # Push all audio data
            output_emitter.push(audio_data)
            output_emitter.flush()

        except requests.exceptions.Timeout:
            raise APIConnectionError("TTS request timed out") from None
        except requests.exceptions.ConnectionError as e:
            print(f"[SyncTTS] Connection error: {e}")
            raise APIConnectionError(f"TTS connection failed: {e}") from None
        except Exception as e:
            print(f"[SyncTTS] Error: {type(e).__name__}: {e}")
            raise APIConnectionError(str(e)) from e
