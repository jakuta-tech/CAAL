'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Check,
  CircleHalf,
  CircleNotch,
  FloppyDisk,
  Moon,
  Palette,
  Sun,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/livekit/button';
import { saveThemeToCache } from '@/hooks/useCaalTheme';
import { type ThemeName, generateThemeCSS, getTheme } from '@/lib/theme';

// =============================================================================
// Types
// =============================================================================

interface Settings {
  agent_name: string;
  prompt: string;
  // General
  theme: 'midnight' | 'greySlate' | 'light';
  // Providers
  llm_provider: 'ollama' | 'groq';
  ollama_host: string;
  ollama_model: string;
  groq_api_key: string;
  groq_model: string;
  tts_provider: 'kokoro' | 'piper';
  tts_voice_kokoro: string;
  tts_voice_piper: string;
  // LLM settings
  temperature: number;
  num_ctx: number;
  max_turns: number;
  tool_cache_size: number;
  // Integrations
  hass_enabled: boolean;
  hass_host: string;
  hass_token: string;
  n8n_enabled: boolean;
  n8n_url: string;
  n8n_token: string;
  n8n_api_key: string;
  // Wake word
  wake_word_enabled: boolean;
  wake_word_model: string;
  wake_word_threshold: number;
  wake_word_timeout: number;
  // Turn detection
  allow_interruptions: boolean;
  min_endpointing_delay: number;
  // Language
  language: string;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

type TabId = 'agent' | 'prompt' | 'providers' | 'llm' | 'integrations';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SETTINGS: Settings = {
  agent_name: 'Cal',
  prompt: 'default',
  theme: 'midnight',
  llm_provider: 'ollama',
  ollama_host: 'http://localhost:11434',
  ollama_model: '',
  groq_api_key: '',
  groq_model: '',
  tts_provider: 'kokoro',
  tts_voice_kokoro: 'am_puck',
  tts_voice_piper: 'speaches-ai/piper-en_US-ryan-high',
  temperature: 0.15,
  num_ctx: 8192,
  max_turns: 20,
  tool_cache_size: 3,
  hass_enabled: false,
  hass_host: '',
  hass_token: '',
  n8n_enabled: false,
  n8n_url: '',
  n8n_token: '',
  n8n_api_key: '',
  wake_word_enabled: false,
  wake_word_model: 'models/hey_cal.onnx',
  wake_word_threshold: 0.5,
  wake_word_timeout: 3.0,
  allow_interruptions: true,
  min_endpointing_delay: 0.5,
  // Language
  language: 'en',
};

const DEFAULT_PROMPT = `# Voice Assistant

You are a helpful, conversational voice assistant.
{{CURRENT_DATE_CONTEXT}}

# Tool Priority

Always prefer using tools to answer questions when possible.
`;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
] as const;

// =============================================================================
// Component
// =============================================================================

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('agent');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [promptContent, setPromptContent] = useState('');
  const [greetingsContent, setGreetingsContent] = useState('');
  const [voices, setVoices] = useState<string[]>([]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [groqModels, setGroqModels] = useState<string[]>([]);
  const [wakeWordModels, setWakeWordModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoadedFromApi, setSettingsLoadedFromApi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Test states
  const [ollamaTest, setOllamaTest] = useState<{ status: TestStatus; error: string | null }>({
    status: 'idle',
    error: null,
  });
  const [groqTest, setGroqTest] = useState<{ status: TestStatus; error: string | null }>({
    status: 'idle',
    error: null,
  });
  const [hassTest, setHassTest] = useState<{
    status: TestStatus;
    error: string | null;
    info: string | null;
  }>({
    status: 'idle',
    error: null,
    info: null,
  });
  const [n8nTest, setN8nTest] = useState<{
    status: TestStatus;
    error: string | null;
    info: string | null;
  }>({
    status: 'idle',
    error: null,
    info: null,
  });

  const t = useTranslations('Settings');
  const tCommon = useTranslations('Common');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'agent', label: t('tabs.agent') },
    { id: 'prompt', label: t('tabs.prompt') },
    { id: 'providers', label: t('tabs.providers') },
    { id: 'llm', label: t('tabs.llm') },
    { id: 'integrations', label: t('tabs.integrations') },
  ];

  // ---------------------------------------------------------------------------
  // Load settings
  // ---------------------------------------------------------------------------

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First load settings to get the correct tts_provider
      const settingsRes = await fetch('/api/settings');
      let ttsProvider = 'kokoro';
      let lang = 'en';

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        // Merge with defaults to ensure new fields have values
        const loadedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
        setSettings(loadedSettings);
        setSettingsLoadedFromApi(true);
        // Sync theme to localStorage for instant load next time
        if (loadedSettings.theme) {
          saveThemeToCache(loadedSettings.theme);
        }
        setPromptContent(data.prompt_content || DEFAULT_PROMPT);
        ttsProvider = loadedSettings.tts_provider || 'kokoro';
        lang = loadedSettings.language || 'en';
      } else {
        setSettings(DEFAULT_SETTINGS);
        setPromptContent(DEFAULT_PROMPT);
      }

      // Now fetch voices, wake word models, and greetings in parallel
      const [voicesRes, wakeWordModelsRes, greetingsRes] = await Promise.all([
        fetch(`/api/voices?provider=${ttsProvider}`),
        fetch('/api/wake-word/models'),
        fetch(`/api/greetings?language=${lang}`),
      ]);

      if (voicesRes.ok) {
        const data = await voicesRes.json();
        setVoices(data.voices || []);
      }

      if (wakeWordModelsRes.ok) {
        const data = await wakeWordModelsRes.json();
        setWakeWordModels(data.models || []);
      }

      if (greetingsRes.ok) {
        const data = await greetingsRes.json();
        setGreetingsContent(data.content || '');
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(t('errors.loadFailed'));
      setSettings(DEFAULT_SETTINGS);
      setPromptContent(DEFAULT_PROMPT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  // Apply theme CSS variables when theme changes (only after loading from API)
  // Initial page load theme is handled by useCaalTheme hook
  useEffect(() => {
    if (settings.theme && settingsLoadedFromApi) {
      const theme = getTheme(settings.theme);
      const css = generateThemeCSS(theme);

      // Apply to document root
      const style = document.documentElement.style;
      const lines = css.split('\n').filter((line) => line.includes(':'));
      lines.forEach((line) => {
        const [property, value] = line.split(':').map((s) => s.trim().replace(';', ''));
        if (property && value) {
          style.setProperty(property, value);
        }
      });
    }
  }, [settings.theme, settingsLoadedFromApi]);

  // ---------------------------------------------------------------------------
  // Test connections
  // ---------------------------------------------------------------------------

  const testOllama = useCallback(async () => {
    if (!settings.ollama_host) return;
    setOllamaTest({ status: 'testing', error: null });

    try {
      const res = await fetch('/api/setup/test-ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: settings.ollama_host }),
      });
      const result = await res.json();

      if (result.success) {
        setOllamaTest({ status: 'success', error: null });
        setOllamaModels(result.models || []);
        if (!settings.ollama_model && result.models?.length > 0) {
          setSettings((s) => ({ ...s, ollama_model: result.models[0] }));
        }
      } else {
        setOllamaTest({ status: 'error', error: result.error || t('errors.connectionFailed') });
      }
    } catch {
      setOllamaTest({ status: 'error', error: t('errors.connectionFailed') });
    }
  }, [settings.ollama_host, settings.ollama_model]);

  const testGroq = useCallback(async () => {
    if (!settings.groq_api_key) return;
    setGroqTest({ status: 'testing', error: null });

    try {
      const res = await fetch('/api/setup/test-groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: settings.groq_api_key }),
      });
      const result = await res.json();

      if (result.success) {
        setGroqTest({ status: 'success', error: null });
        setGroqModels(result.models || []);
        if (!settings.groq_model && result.models?.length > 0) {
          const preferredModel = 'llama-3.3-70b-versatile';
          const selectedModel = result.models.includes(preferredModel)
            ? preferredModel
            : result.models[0];
          setSettings((s) => ({ ...s, groq_model: selectedModel }));
        }
      } else {
        setGroqTest({ status: 'error', error: result.error || t('errors.invalidApiKey') });
      }
    } catch {
      setGroqTest({ status: 'error', error: t('errors.failedToValidate') });
    }
  }, [settings.groq_api_key, settings.groq_model]);

  // Auto-fetch Groq models when API key is available and models not yet loaded
  useEffect(() => {
    if (isOpen && settings.groq_api_key && groqModels.length === 0 && !loading) {
      testGroq();
    }
  }, [isOpen, settings.groq_api_key, groqModels.length, loading, testGroq]);

  const testHass = useCallback(async () => {
    if (!settings.hass_host || !settings.hass_token) return;
    setHassTest({ status: 'testing', error: null, info: null });

    try {
      const res = await fetch('/api/setup/test-hass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: settings.hass_host, token: settings.hass_token }),
      });
      const result = await res.json();

      if (result.success) {
        setHassTest({
          status: 'success',
          error: null,
          info: `${t('integrations.connected')} - ${t('integrations.entities', { count: result.device_count })}`,
        });
      } else {
        setHassTest({
          status: 'error',
          error: result.error || t('errors.connectionFailed'),
          info: null,
        });
      }
    } catch {
      setHassTest({ status: 'error', error: t('errors.connectionFailed'), info: null });
    }
  }, [settings.hass_host, settings.hass_token]);

  const testN8n = useCallback(async () => {
    if (!settings.n8n_url || !settings.n8n_token) return;
    setN8nTest({ status: 'testing', error: null, info: null });

    const mcpUrl = getN8nMcpUrl(settings.n8n_url);

    try {
      const res = await fetch('/api/setup/test-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mcpUrl, token: settings.n8n_token }),
      });
      const result = await res.json();

      if (result.success) {
        setN8nTest({ status: 'success', error: null, info: t('integrations.connected') });
      } else {
        setN8nTest({
          status: 'error',
          error: result.error || t('errors.connectionFailed'),
          info: null,
        });
      }
    } catch {
      setN8nTest({ status: 'error', error: t('errors.connectionFailed'), info: null });
    }
  }, [settings.n8n_url, settings.n8n_token]);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(tCommon('saving'));
    setError(null);

    try {
      // Transform n8n URL
      const finalSettings = {
        ...settings,
        n8n_url: settings.n8n_enabled ? getN8nMcpUrl(settings.n8n_url) : settings.n8n_url,
      };

      // Save settings
      const settingsRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: finalSettings }),
      });

      if (!settingsRes.ok) {
        throw new Error(t('errors.saveFailed'));
      }

      // Save prompt if custom
      if (settings.prompt === 'custom') {
        const promptRes = await fetch('/api/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: promptContent }),
        });

        if (!promptRes.ok) {
          throw new Error(t('errors.savePromptFailed'));
        }
      }

      // Save greetings to file
      const greetingsRes = await fetch('/api/greetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: settings.language || 'en', content: greetingsContent }),
      });

      if (!greetingsRes.ok) {
        throw new Error(t('errors.saveFailed'));
      }

      // Download Piper model if using Piper
      if (settings.tts_provider === 'piper' && settings.tts_voice_piper) {
        setSaveStatus(t('status.downloadingVoice'));
        await fetch('/api/download-piper-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: settings.tts_voice_piper }),
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getN8nMcpUrl = (host: string) => {
    if (!host) return '';
    const baseUrl = host.replace(/\/$/, '');
    if (baseUrl.includes('/mcp-server')) return baseUrl;
    return `${baseUrl}/mcp-server/http`;
  };

  const handleWakeGreetingsChange = (value: string) => {
    setGreetingsContent(value);
  };

  const handleTtsProviderChange = async (provider: 'kokoro' | 'piper') => {
    if (provider === settings.tts_provider) return;

    setSettings({ ...settings, tts_provider: provider });

    // Fetch voices for the new provider
    try {
      const res = await fetch(`/api/voices?provider=${provider}`);
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (err) {
      console.error('Failed to fetch voices for provider:', err);
    }
  };

  const handlePiperVoiceChange = (voice: string) => {
    setSettings({ ...settings, tts_voice_piper: voice });
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    // Switch TTS provider based on language (kokoro=English, piper=French)
    const newTtsProvider = newLocale === 'en' ? 'kokoro' : 'piper';
    const updatedSettings = {
      ...settings,
      language: newLocale,
      tts_provider: newTtsProvider,
    };
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });

      // Pre-download the Piper TTS model for non-English languages (fire-and-forget)
      if (newTtsProvider === 'piper') {
        const piperModels: Record<string, string> = {
          fr: 'speaches-ai/piper-fr_FR-siwis-medium',
          it: 'speaches-ai/piper-it_IT-paola-medium',
        };
        const modelId = piperModels[newLocale];
        if (modelId) {
          fetch('/api/download-piper-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id: modelId }),
          }).catch(() => {}); // Best-effort, agent retries if not ready
        }
      }

      document.cookie = `CAAL_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      toast.success(t('language.updated'));
      setTimeout(() => window.location.reload(), 500);
    } catch {
      toast.error(t('errors.saveFailed'));
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const TestStatusIcon = ({ status }: { status: TestStatus }) => {
    switch (status) {
      case 'testing':
        return <CircleNotch className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" weight="bold" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" weight="bold" />;
      default:
        return null;
    }
  };

  const Toggle = ({
    enabled,
    onToggle,
    disabled = false,
  }: {
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  // ---------------------------------------------------------------------------
  // Tab content
  // ---------------------------------------------------------------------------

  const themeOptions: {
    id: ThemeName;
    name: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'midnight',
      name: t('theme.midnight'),
      icon: <Moon className="h-4 w-4" weight="fill" />,
    },
    {
      id: 'greySlate',
      name: t('theme.greySlate'),
      icon: <CircleHalf className="h-4 w-4" weight="fill" />,
    },
    {
      id: 'light',
      name: t('theme.light'),
      icon: <Sun className="h-4 w-4" weight="fill" />,
    },
  ];

  const renderAgentTab = () => (
    <div className="space-y-6">
      {/* Language */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {t('language.label')}
        </label>
        <select
          value={settings.language || 'en'}
          onChange={handleLanguageChange}
          className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-[var(--text-muted)]">{t('language.description')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('agent.name')}</label>
        <input
          type="text"
          value={settings.agent_name}
          onChange={(e) => setSettings({ ...settings, agent_name: e.target.value })}
          className="input-field text-foreground w-full px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('agent.voice')}</label>
        <select
          value={
            settings.tts_provider === 'piper' ? settings.tts_voice_piper : settings.tts_voice_kokoro
          }
          onChange={(e) => {
            if (settings.tts_provider === 'piper') {
              handlePiperVoiceChange(e.target.value);
            } else {
              setSettings({ ...settings, tts_voice_kokoro: e.target.value });
            }
          }}
          className="select-field text-foreground w-full px-4 py-3 text-sm"
        >
          {voices.length > 0 ? (
            voices.map((voice) => (
              <option key={voice} value={voice}>
                {voice}
              </option>
            ))
          ) : (
            <option
              value={
                settings.tts_provider === 'piper'
                  ? settings.tts_voice_piper
                  : settings.tts_voice_kokoro
              }
            >
              {settings.tts_provider === 'piper'
                ? settings.tts_voice_piper
                : settings.tts_voice_kokoro}
            </option>
          )}
        </select>
      </div>

      {/* Wake Word Section */}
      <div className="border-t pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('wake.title')}</h3>
            <p className="text-muted-foreground text-xs">{t('wake.description')}</p>
          </div>
          <Toggle
            enabled={settings.wake_word_enabled}
            onToggle={() =>
              setSettings({ ...settings, wake_word_enabled: !settings.wake_word_enabled })
            }
          />
        </div>

        {settings.wake_word_enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('wake.model')}</label>
              <select
                value={settings.wake_word_model}
                onChange={(e) => setSettings({ ...settings, wake_word_model: e.target.value })}
                className="select-field text-foreground w-full px-4 py-3 text-sm"
              >
                {wakeWordModels.length > 0 ? (
                  wakeWordModels.map((model) => (
                    <option key={model} value={model}>
                      {model.replace('models/', '').replace('.onnx', '').replace(/_/g, ' ')}
                    </option>
                  ))
                ) : (
                  <option value={settings.wake_word_model}>
                    {settings.wake_word_model.replace('models/', '').replace('.onnx', '')}
                  </option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('wake.threshold')}</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.wake_word_threshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      wake_word_threshold: parseFloat(e.target.value) || 0.5,
                    })
                  }
                  className="input-field text-foreground w-full px-4 py-3 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('wake.silenceTimeout')}</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="0.5"
                  value={settings.wake_word_timeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      wake_word_timeout: parseFloat(e.target.value) || 3.0,
                    })
                  }
                  className="input-field text-foreground w-full px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('agent.wakeGreetings')}{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  ({t('agent.wakeGreetingsHint')})
                </span>
              </label>
              <textarea
                value={greetingsContent}
                onChange={(e) => handleWakeGreetingsChange(e.target.value)}
                rows={4}
                className="textarea-field text-foreground w-full px-4 py-3 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Turn Detection Section */}
      <div className="border-t pt-6">
        <h3 className="mb-1 text-sm font-semibold">{t('llm.turnDetection')}</h3>
        <p className="text-muted-foreground mb-4 text-xs">{t('llm.turnDetectionDesc')}</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">{t('llm.allowInterruptions')}</label>
              <p className="text-muted-foreground text-xs">{t('llm.allowInterruptionsDesc')}</p>
            </div>
            <Toggle
              enabled={settings.allow_interruptions}
              onToggle={() =>
                setSettings({ ...settings, allow_interruptions: !settings.allow_interruptions })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('llm.endpointingDelay')}</label>
              <span className="text-muted-foreground text-sm">
                {settings.min_endpointing_delay}s
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={settings.min_endpointing_delay}
              onChange={(e) =>
                setSettings({ ...settings, min_endpointing_delay: parseFloat(e.target.value) })
              }
              className="bg-muted accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg"
            />
            <p className="text-muted-foreground text-xs">{t('llm.endpointingDelayDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPromptTab = () => (
    <div className="flex h-full flex-col gap-4">
      <div
        className="inline-flex w-fit shrink-0 rounded-xl p-1"
        style={{ background: 'rgb(from var(--surface-2) r g b / 0.5)' }}
      >
        <button
          onClick={() => setSettings({ ...settings, prompt: 'default' })}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            settings.prompt === 'default'
              ? 'bg-background text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('prompt.default')}
        </button>
        <button
          onClick={() => setSettings({ ...settings, prompt: 'custom' })}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            settings.prompt === 'custom'
              ? 'bg-background text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('prompt.custom')}
        </button>
      </div>

      <textarea
        value={promptContent}
        onChange={(e) => setPromptContent(e.target.value)}
        readOnly={settings.prompt === 'default'}
        className={`textarea-field text-foreground min-h-0 flex-1 px-4 py-3 font-mono text-sm ${
          settings.prompt === 'default' ? 'cursor-not-allowed opacity-60' : ''
        }`}
      />
    </div>
  );

  const renderProvidersTab = () => (
    <div className="space-y-8">
      {/* LLM Provider */}
      <div className="space-y-3">
        <label className="text-muted-foreground block text-xs font-bold tracking-wide uppercase">
          {t('providers.llmProvider')}
        </label>
        <div
          className="inline-flex rounded-xl p-1"
          style={{ background: 'rgb(from var(--surface-2) r g b / 0.5)' }}
        >
          <button
            onClick={() =>
              setSettings({
                ...settings,
                llm_provider: 'ollama',
                stt_provider: 'speaches',
              } as Settings)
            }
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              settings.llm_provider === 'ollama'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ollama
          </button>
          <button
            onClick={() =>
              setSettings({ ...settings, llm_provider: 'groq', stt_provider: 'groq' } as Settings)
            }
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              settings.llm_provider === 'groq'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Groq
          </button>
        </div>

        {settings.llm_provider === 'ollama' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('providers.hostUrl')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.ollama_host}
                  onChange={(e) => setSettings({ ...settings, ollama_host: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="input-field text-foreground flex-1 px-4 py-3 text-sm"
                />
                <button
                  onClick={testOllama}
                  disabled={!settings.ollama_host || ollamaTest.status === 'testing'}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgb(from var(--surface-2) r g b / 0.5)' }}
                >
                  <TestStatusIcon status={ollamaTest.status} />
                  {tCommon('test')}
                </button>
              </div>
              {ollamaTest.error && <p className="text-xs text-red-500">{ollamaTest.error}</p>}
              {ollamaTest.status === 'success' && (
                <p className="text-xs text-green-500">
                  {t('providers.modelsAvailable', { count: ollamaModels.length })}
                </p>
              )}
            </div>

            {/* Show model dropdown if we have models from test OR if model is already configured */}
            {(ollamaModels.length > 0 || settings.ollama_model) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('providers.model')}</label>
                <select
                  value={settings.ollama_model}
                  onChange={(e) => setSettings({ ...settings, ollama_model: e.target.value })}
                  className="select-field text-foreground w-full px-4 py-3 text-sm"
                >
                  {ollamaModels.length > 0 ? (
                    <>
                      <option value="">{t('providers.selectModel')}</option>
                      {ollamaModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value={settings.ollama_model}>{settings.ollama_model}</option>
                  )}
                </select>
                {ollamaModels.length === 0 && settings.ollama_model && (
                  <p className="text-muted-foreground text-xs">
                    {t('providers.testConnectionToSee')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('providers.apiKey')}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.groq_api_key}
                  onChange={(e) => setSettings({ ...settings, groq_api_key: e.target.value })}
                  placeholder="gsk_..."
                  className="input-field text-foreground flex-1 px-4 py-3 text-sm"
                />
                <button
                  onClick={testGroq}
                  disabled={!settings.groq_api_key || groqTest.status === 'testing'}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgb(from var(--surface-2) r g b / 0.5)' }}
                >
                  <TestStatusIcon status={groqTest.status} />
                  {tCommon('test')}
                </button>
              </div>
              {groqTest.error && <p className="text-xs text-red-500">{groqTest.error}</p>}
              {groqTest.status === 'success' && (
                <p className="text-xs text-green-500">
                  {t('providers.modelsAvailable', { count: groqModels.length })}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                {t('providers.getApiKeyAt')}{' '}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  console.groq.com
                </a>
              </p>
            </div>

            {/* Show model dropdown if we have models from test OR if model is already configured */}
            {(groqModels.length > 0 || settings.groq_model) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('providers.model')}</label>
                <select
                  value={settings.groq_model}
                  onChange={(e) => setSettings({ ...settings, groq_model: e.target.value })}
                  className="select-field text-foreground w-full px-4 py-3 text-sm"
                >
                  {groqModels.length > 0 ? (
                    <>
                      <option value="">{t('providers.selectModel')}</option>
                      {[...groqModels].sort().map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value={settings.groq_model}>{settings.groq_model}</option>
                  )}
                </select>
                {groqModels.length === 0 && settings.groq_model && (
                  <p className="text-muted-foreground text-xs">{t('providers.enterApiKeyToSee')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STT Info */}
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-sm text-blue-200">
            <span className="font-semibold">{t('providers.sttProvider')}:</span>{' '}
            {settings.llm_provider === 'ollama'
              ? t('providers.speachesLocal')
              : t('providers.groqWhisper')}
            <br />
            <span className="text-xs opacity-70">{t('providers.sttProviderNote')}</span>
          </p>
        </div>
      </div>

      {/* TTS Provider */}
      <div className="space-y-3">
        <label className="text-muted-foreground block text-xs font-bold tracking-wide uppercase">
          {t('providers.ttsProvider')}
        </label>
        <div
          className="inline-flex rounded-xl p-1"
          style={{ background: 'rgb(from var(--surface-2) r g b / 0.5)' }}
        >
          <button
            onClick={() => handleTtsProviderChange('kokoro')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              settings.tts_provider === 'kokoro'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Kokoro
          </button>
          <button
            onClick={() => handleTtsProviderChange('piper')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              settings.tts_provider === 'piper'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Piper
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          {settings.tts_provider === 'kokoro'
            ? t('providers.kokoroDesc')
            : t('providers.piperDesc')}
        </p>
      </div>
    </div>
  );

  const renderLLMTab = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{t('llm.temperature')}</label>
          <span className="text-muted-foreground text-sm">{settings.temperature}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={settings.temperature}
          onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
          className="bg-muted accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg"
        />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{t('llm.precise')}</span>
          <span>{t('llm.creative')}</span>
        </div>
      </div>

      {settings.llm_provider === 'ollama' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('llm.contextSize')}</label>
          <input
            type="number"
            min="1024"
            max="131072"
            step="1024"
            value={settings.num_ctx}
            onChange={(e) =>
              setSettings({ ...settings, num_ctx: parseInt(e.target.value) || 8192 })
            }
            className="input-field text-foreground w-full px-4 py-3 text-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('llm.maxTurns')}</label>
        <input
          type="number"
          min="1"
          max="100"
          value={settings.max_turns}
          onChange={(e) => setSettings({ ...settings, max_turns: parseInt(e.target.value) || 20 })}
          className="input-field text-foreground w-full px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('llm.toolCacheSize')}</label>
        <input
          type="number"
          min="0"
          max="10"
          value={settings.tool_cache_size}
          onChange={(e) =>
            setSettings({ ...settings, tool_cache_size: parseInt(e.target.value) || 3 })
          }
          className="input-field text-foreground w-full px-4 py-3 text-sm"
        />
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      {/* Home Assistant */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('integrations.homeAssistant')}</h3>
            <p className="text-muted-foreground text-xs">{t('integrations.homeAssistantDesc')}</p>
          </div>
          <Toggle
            enabled={settings.hass_enabled}
            onToggle={() => setSettings({ ...settings, hass_enabled: !settings.hass_enabled })}
          />
        </div>

        {settings.hass_enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('providers.hostUrl')}</label>
              <input
                type="text"
                value={settings.hass_host}
                onChange={(e) => setSettings({ ...settings, hass_host: e.target.value })}
                placeholder="http://homeassistant.local:8123"
                className="input-field text-foreground w-full px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('integrations.longLivedToken')}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.hass_token}
                  onChange={(e) => setSettings({ ...settings, hass_token: e.target.value })}
                  placeholder="eyJ0eX..."
                  className="input-field text-foreground flex-1 px-4 py-3 text-sm"
                />
                <button
                  onClick={testHass}
                  disabled={
                    !settings.hass_host || !settings.hass_token || hassTest.status === 'testing'
                  }
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgb(from var(--surface-2) r g b / 0.5)' }}
                >
                  <TestStatusIcon status={hassTest.status} />
                  {tCommon('test')}
                </button>
              </div>
              {hassTest.error && <p className="text-xs text-red-500">{hassTest.error}</p>}
              {hassTest.info && <p className="text-xs text-green-500">{hassTest.info}</p>}
            </div>
          </div>
        )}
      </div>

      {/* n8n */}
      <div className="border-t pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('integrations.n8n')}</h3>
            <p className="text-muted-foreground text-xs">{t('integrations.n8nDesc')}</p>
          </div>
          <Toggle
            enabled={settings.n8n_enabled}
            onToggle={() => setSettings({ ...settings, n8n_enabled: !settings.n8n_enabled })}
          />
        </div>

        {settings.n8n_enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('providers.hostUrl')}</label>
              <input
                type="text"
                value={settings.n8n_url}
                onChange={(e) => setSettings({ ...settings, n8n_url: e.target.value })}
                placeholder="http://n8n:5678"
                className="input-field text-foreground w-full px-4 py-3 text-sm"
              />
              <p className="text-muted-foreground text-xs">{t('integrations.mcpNote')}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('integrations.mcpToken')}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.n8n_token}
                  onChange={(e) => setSettings({ ...settings, n8n_token: e.target.value })}
                  placeholder={t('integrations.mcpTokenPlaceholder')}
                  className="input-field text-foreground flex-1 px-4 py-3 text-sm"
                />
                <button
                  onClick={testN8n}
                  disabled={
                    !settings.n8n_url || !settings.n8n_token || n8nTest.status === 'testing'
                  }
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgb(from var(--surface-2) r g b / 0.5)' }}
                >
                  <TestStatusIcon status={n8nTest.status} />
                  {tCommon('test')}
                </button>
              </div>
              <p className="text-muted-foreground text-xs">{t('integrations.mcpTokenHint')}</p>
              {n8nTest.error && <p className="text-xs text-red-500">{n8nTest.error}</p>}
              {n8nTest.info && <p className="text-xs text-green-500">{n8nTest.info}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('providers.apiKey')}</label>
              <input
                type="password"
                value={settings.n8n_api_key}
                onChange={(e) => setSettings({ ...settings, n8n_api_key: e.target.value })}
                placeholder={t('integrations.n8nApiKeyPlaceholder')}
                className="input-field text-foreground w-full px-4 py-3 text-sm"
              />
              <p className="text-muted-foreground text-xs">{t('integrations.n8nApiKeyHint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="panel-elevated absolute inset-y-0 right-0 flex w-full flex-col sm:w-[85%] sm:max-w-5xl"
        style={{ borderLeft: '1px solid var(--border-subtle)' }}
      >
        {/* Header */}
        <header
          className="section-divider shrink-0"
          style={{
            background: 'rgb(from var(--surface-0) r g b / 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <div className="flex items-center gap-2">
              {/* Theme Dropdown */}
              <button
                ref={themeButtonRef}
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-2 transition-colors"
                title={t('theme.changeTheme')}
              >
                <Palette className="h-5 w-5" weight="bold" />
              </button>
              {showThemeMenu &&
                createPortal(
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowThemeMenu(false)} />
                    <div
                      className="fixed z-[70] min-w-[160px] overflow-hidden rounded-xl py-1 shadow-lg"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-subtle)',
                        top: themeButtonRef.current
                          ? themeButtonRef.current.getBoundingClientRect().bottom + 8
                          : 0,
                        right: themeButtonRef.current
                          ? window.innerWidth - themeButtonRef.current.getBoundingClientRect().right
                          : 0,
                      }}
                    >
                      {themeOptions.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            setSettings({ ...settings, theme: theme.id });
                            saveThemeToCache(theme.id);
                            setShowThemeMenu(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                          style={{
                            background:
                              settings.theme === theme.id ? 'var(--surface-3)' : 'transparent',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'var(--surface-3)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              settings.theme === theme.id ? 'var(--surface-3)' : 'transparent')
                          }
                        >
                          {theme.icon}
                          <span className="flex-1">{theme.name}</span>
                          {settings.theme === theme.id && (
                            <Check className="text-primary h-4 w-4" weight="bold" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>,
                  document.body
                )}
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-2 transition-colors"
              >
                <X className="h-6 w-6" weight="bold" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="overflow-x-auto px-6">
            <div className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 pt-1 pb-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto p-6 ${activeTab === 'prompt' ? 'flex flex-col' : ''}`}
          style={{
            background: 'rgb(from var(--surface-0) r g b / 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className={`mx-auto w-full max-w-4xl ${activeTab === 'prompt' ? 'flex min-h-0 flex-1 flex-col' : ''}`}
          >
            {loading ? (
              <div className="text-muted-foreground py-8 text-center">{t('status.loading')}</div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-md bg-red-500/10 p-3 text-red-500">{error}</div>
                )}

                {activeTab === 'agent' && renderAgentTab()}
                {activeTab === 'prompt' && renderPromptTab()}
                {activeTab === 'providers' && renderProvidersTab()}
                {activeTab === 'llm' && renderLLMTab()}
                {activeTab === 'integrations' && renderIntegrationsTab()}
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        <div
          className="section-divider shrink-0 p-6"
          style={{
            background: 'rgb(from var(--surface-0) r g b / 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="mx-auto max-w-4xl">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading || saving}
              className="w-full py-3"
            >
              <FloppyDisk className="h-4 w-4" weight="bold" />
              {saving ? saveStatus || tCommon('saving') : tCommon('save')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
