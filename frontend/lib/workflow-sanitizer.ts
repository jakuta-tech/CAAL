/**
 * Workflow Sanitizer - Client-side sanitization for CAAL Tool Registry
 *
 * This ensures that secrets never leave the user's network.
 * All sensitive data is stripped in the browser before transmission.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkflowData = any; // n8n workflow structure is dynamic

export interface SanitizationResult {
  sanitized: WorkflowData;
  detected: {
    credentials: Array<{
      credential_type: string;
      name: string;
    }>;
    variables: Array<{
      name: string;
      example: string;
      description: string;
    }>;
    secrets_stripped: {
      api_keys: number;
      tokens: number;
      passwords: number;
    };
  };
  warnings: string[];
}

// Secret detection patterns
const SECRET_PATTERNS = [
  { name: 'API Key', regex: /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/gi, type: 'api_keys' },
  { name: 'Bearer token', regex: /bearer\s+[a-zA-Z0-9_-]{20,}/gi, type: 'tokens' },
  { name: 'OpenAI key', regex: /sk-[a-zA-Z0-9]{20,}/g, type: 'api_keys' },
  { name: 'GitHub PAT', regex: /ghp_[a-zA-Z0-9]{36}/g, type: 'tokens' },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g, type: 'api_keys' },
  { name: 'Slack token', regex: /xox[baprs]-[0-9a-zA-Z]{10,}/g, type: 'tokens' },
  { name: 'Private key', regex: /-----BEGIN\s+(RSA\s+|EC\s+|DSA\s+)?PRIVATE\s+KEY-----/gi, type: 'api_keys' },
  { name: 'Password', regex: /password\s*[:=]\s*["'][^"']+["']/gi, type: 'passwords' },
] as const;

// Expression patterns that reference secrets via n8n expressions
const EXPRESSION_SECRET_PATTERNS = [
  { name: 'Environment variable', regex: /\{\{.*\$env\.[A-Z_]*(?:KEY|TOKEN|SECRET|PASSWORD|API)[A-Z_]*.*\}\}/gi },
  { name: 'JSON secret field', regex: /\{\{.*\$json\.(?:apiKey|api_key|token|secret|password).*\}\}/gi },
  { name: 'Binary secret field', regex: /\{\{.*\$binary\.(?:key|token|secret).*\}\}/gi },
] as const;

// URL pattern to detect hardcoded URLs
const URL_PATTERN = /https?:\/\/[\d.]+(?::\d+)?/g;
const LOCALHOST_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/g;

/**
 * Recursively find all __rl (resource locator) fields with mode: "list"
 * These are dropdown selections that need to be converted to id mode
 */
interface ResourceLocator {
  path: string;
  value: string;
  cachedName: string | null;
}

function findResourceLocators(
  obj: WorkflowData,
  path = '',
  results: ResourceLocator[] = []
): ResourceLocator[] {
  if (!obj || typeof obj !== 'object') return results;

  if (obj.__rl === true && obj.mode === 'list') {
    results.push({
      path,
      value: obj.value,
      cachedName: obj.cachedResultName || obj.cachedResultUrl || null,
    });
  }

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      findResourceLocators(value, path ? `${path}.${key}` : key, results);
    }
  }

  return results;
}

/**
 * Convert a resource locator from list mode to id mode
 */
function convertResourceLocatorToId(variablePlaceholder: string) {
  return {
    __rl: true,
    mode: 'id',
    value: variablePlaceholder,
  };
}

/**
 * Set a nested property by path (e.g., "nodes.0.parameters.calendar")
 */
function setNestedProperty(obj: WorkflowData, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Detect secrets in workflow JSON
 */
function detectSecrets(workflowStr: string): {
  api_keys: number;
  tokens: number;
  passwords: number;
  found: string[];
} {
  const counts = {
    api_keys: 0,
    tokens: 0,
    passwords: 0,
    found: [] as string[],
  };

  for (const { name, regex, type } of SECRET_PATTERNS) {
    regex.lastIndex = 0;
    const matches = workflowStr.match(regex);
    if (matches && matches.length > 0) {
      counts[type] += matches.length;
      counts.found.push(name);
    }
  }

  return counts;
}

/**
 * Detect expression secrets ({{ $env.SECRET }}, {{ $json.apiKey }})
 */
function detectExpressionSecrets(workflowStr: string): string[] {
  const found: string[] = [];

  for (const { name, regex } of EXPRESSION_SECRET_PATTERNS) {
    regex.lastIndex = 0;
    const matches = workflowStr.match(regex);
    if (matches && matches.length > 0) {
      found.push(`${name} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`);
    }
  }

  return found;
}

/**
 * Detect hardcoded URLs in workflow
 */
function detectUrls(workflowStr: string): string[] {
  const urlMatches = workflowStr.match(URL_PATTERN) || [];
  const uniqueUrls = [...new Set(urlMatches)].filter((url) => !LOCALHOST_PATTERN.test(url));
  return uniqueUrls;
}

/**
 * Extract credential types from workflow
 */
function extractCredentials(workflow: WorkflowData): Array<{
  credential_type: string;
  name: string;
}> {
  const credentialTypes = new Set<string>();
  const credentials: Array<{ credential_type: string; name: string }> = [];

  if (!workflow.nodes) return credentials;

  for (const node of workflow.nodes) {
    if (node.credentials) {
      for (const [credType, credInfo] of Object.entries(node.credentials)) {
        if (!credentialTypes.has(credType)) {
          credentialTypes.add(credType);
          credentials.push({
            credential_type: credType,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (credInfo as any)?.name || credType,
          });
        }
      }
    }
  }

  return credentials;
}

/**
 * Nullify credential IDs but keep names for reference
 */
function nullifyCredentialIds(workflow: WorkflowData): WorkflowData {
  const toolName = workflow.name?.replace(/[^a-zA-Z0-9_-]/g, '-') || 'tool';

  if (!workflow.nodes) return workflow;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workflow.nodes = workflow.nodes.map((node: any) => {
    if (node.credentials) {
      for (const [credType, credInfo] of Object.entries(node.credentials)) {
        node.credentials[credType] = {
          id: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (credInfo as any)?.name || `${toolName}_credential`,
        };
      }
    }
    return node;
  });

  return workflow;
}

/**
 * Main sanitization function
 */
export function sanitizeWorkflow(workflow: WorkflowData): SanitizationResult {
  const warnings: string[] = [];

  // 1. Detect secrets (BEFORE stripping)
  const workflowStr = JSON.stringify(workflow);
  const secrets = detectSecrets(workflowStr);
  const expressionSecrets = detectExpressionSecrets(workflowStr);

  // CRITICAL: Block if hardcoded secrets found
  if (secrets.found.length > 0) {
    throw new Error(
      `Cannot submit workflow with hardcoded secrets: ${secrets.found.join(', ')}. ` +
        `Please configure these as n8n Credentials in your workflow and re-export.`
    );
  }

  // CRITICAL: Block if expression secrets found
  if (expressionSecrets.length > 0) {
    throw new Error(
      `Cannot submit workflow with expression-based secrets: ${expressionSecrets.join(', ')}. ` +
        `Expressions like {{ $env.API_KEY }} or {{ $json.password }} expose secrets. ` +
        `Please use n8n Credentials instead.`
    );
  }

  // 2. Detect URLs for variable replacement
  const urls = detectUrls(workflowStr);
  const urlVariables = urls.map((url) => {
    // Generate variable name from URL (e.g., http://192.168.1.100:5000 -> SERVICE_URL)
    const hostname = url.replace(/https?:\/\//, '').split(':')[0];
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    const varName = isIp
      ? 'SERVICE_URL'
      : hostname.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_URL';

    return {
      name: varName,
      example: url,
      description: 'Your service URL',
    };
  });

  // 3. Detect resource locators (dropdown selections)
  const resourceLocators = findResourceLocators(workflow);
  const rlVariables = resourceLocators.map((rl) => {
    const fieldName = rl.path.split('.').pop() || 'field';
    const varName = fieldName.toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2');

    return {
      name: varName,
      example: rl.value,
      description: `Your ${fieldName} identifier`,
    };
  });

  // 4. Extract credentials
  const credentials = extractCredentials(workflow);

  // 5. Create sanitized copy
  let sanitized = JSON.parse(JSON.stringify(workflow));

  // 6. Replace URLs with variable placeholders
  let sanitizedStr = JSON.stringify(sanitized);
  for (const { name, example } of urlVariables) {
    sanitizedStr = sanitizedStr.split(example).join(`\${${name}}`);
  }
  sanitized = JSON.parse(sanitizedStr);

  // 7. Convert resource locators to id mode with variable placeholders
  for (let i = 0; i < resourceLocators.length; i++) {
    const rl = resourceLocators[i];
    const variable = rlVariables[i];
    setNestedProperty(sanitized, rl.path, convertResourceLocatorToId(`\${${variable.name}}`));
  }

  // 8. Nullify credential IDs
  sanitized = nullifyCredentialIds(sanitized);

  // 9. Strip instanceId from meta (user-specific)
  if (sanitized.meta?.instanceId) {
    delete sanitized.meta.instanceId;
    warnings.push('Removed instance-specific metadata');
  }

  // 10. Check for webhook description
  const webhookNode = sanitized.nodes?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n: any) => n.type === 'n8n-nodes-base.webhook' || n.type?.includes('webhook')
  );

  if (webhookNode && !webhookNode.notes) {
    warnings.push(
      "No webhook description found. Add a description to the webhook node's notes in n8n."
    );
  }

  return {
    sanitized,
    detected: {
      credentials,
      variables: [...urlVariables, ...rlVariables],
      secrets_stripped: {
        api_keys: secrets.api_keys,
        tokens: secrets.tokens,
        passwords: secrets.passwords,
      },
    },
    warnings,
  };
}
