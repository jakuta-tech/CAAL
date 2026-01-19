// Tool Registry Types

export interface RequiredVariable {
  name: string;
  description: string;
  example: string;
}

export interface RequiredCredential {
  // The n8n credential type (e.g., 'githubApi', 'httpHeaderAuth', 'slackApi')
  credential_type: string;
  // Default credential name in the workflow (user can override during install)
  name: string;
  // Human-readable description of what this credential is for
  description: string;
  // Which node uses this credential (for reference)
  node?: string;
  // For generic httpHeaderAuth: the header name (e.g., "Authorization")
  header_name?: string;
}

// Common predefined credential types in n8n
export const PREDEFINED_CREDENTIAL_TYPES = [
  'githubApi',
  'slackApi',
  'notionApi',
  'googleApi',
  'discordApi',
  'spotifyApi',
  'twilioApi',
  'telegramApi',
  'homeAssistantApi',
] as const;

// Common generic credential types
export const GENERIC_CREDENTIAL_TYPES = [
  'httpHeaderAuth',
  'httpBasicAuth',
  'httpDigestAuth',
  'oAuth2Api',
] as const;

export interface ToolAuthor {
  github: string;
  name?: string;
}

export interface ToolManifest {
  id?: string;  // Registry ID for tracking
  name: string;
  version?: string;
  description: string;
  category: string;
  voice_triggers: string[];
  required_services: string[];
  required_credentials: RequiredCredential[];
  required_variables: RequiredVariable[];
  author: ToolAuthor;
  tier: 'community' | 'coreworxlab';
  tags: string[];
  dependencies?: string[];
  created?: string;
  updated?: string;
}

export interface ToolIndexEntry {
  id: string | null;  // Registry ID for tracking
  name: string;
  version: string;
  description: string;
  category: string;
  path: string;
  voice_triggers: string[];
  required_services: string[];
  tier: string;
  author: string;
  tags: string[];
  updated: string;
}

export type InstallStep = 'variables' | 'credentials' | 'installing' | 'complete' | 'error';

export interface InstallState {
  step: InstallStep;
  variables: Record<string, string>;
  credentials: Record<string, string>;
  error?: string;
}

export const TOOL_CATEGORIES = [
  'smart-home',
  'media',
  'homelab',
  'productivity',
  'utilities',
  'social',
  'other',
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  'smart-home': 'Smart Home',
  media: 'Media',
  homelab: 'Homelab',
  productivity: 'Productivity',
  utilities: 'Utilities',
  social: 'Social',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<ToolCategory, string> = {
  'smart-home': 'bg-green-500/20 text-green-400',
  media: 'bg-red-500/20 text-red-400',
  homelab: 'bg-purple-500/20 text-purple-400',
  productivity: 'bg-blue-500/20 text-blue-400',
  utilities: 'bg-gray-500/20 text-gray-400',
  social: 'bg-pink-500/20 text-pink-400',
  other: 'bg-yellow-500/20 text-yellow-400',
};

export const TIER_COLORS: Record<string, string> = {
  coreworxlab: 'bg-green-500/20 text-green-400',
  community: 'bg-blue-500/20 text-blue-400',
};

export const TIER_LABELS: Record<string, string> = {
  coreworxlab: 'CoreWorxLab',
  community: 'Community',
};
