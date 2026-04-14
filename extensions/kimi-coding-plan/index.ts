import type { OAuthCredentials, OAuthLoginCallbacks } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const PROVIDER_ID = "kimi-coding-plan";
const PROVIDER_NAME = "Kimi Coding Plan";
const BASE_URL = "https://api.kimi.com/coding";
const MODELS_DEV_URL = "https://models.dev/api.json";
const MODELS_DEV_PROVIDER_KEY = "kimi-for-coding";
const NAME_SUFFIX = " (Plan)";

type ProviderModel = {
  id: string;
  name: string;
  reasoning: boolean;
  input: Array<"text" | "image">;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
};

const DEFAULT_MODELS: ProviderModel[] = [
  {
    id: "k2p5",
    name: "Kimi K2.5 (Plan)",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 262144,
    maxTokens: 32768,
  },
  {
    id: "kimi-k2-thinking",
    name: "Kimi K2 Thinking (Plan)",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 262144,
    maxTokens: 32768,
  },
  {
    id: "K2.6-code-preview",
    name: "Kimi K2.6 Code Preview (Plan)",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 262144,
    maxTokens: 32768,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeInput(value: unknown): Array<"text" | "image"> {
  if (!isRecord(value) || !Array.isArray(value.input)) return ["text"];
  const inputs = value.input.filter((item): item is string => typeof item === "string");
  return inputs.includes("image") || inputs.includes("video") ? ["text", "image"] : ["text"];
}

function normalizeProviderModel(id: string, value: unknown): ProviderModel | undefined {
  if (!isRecord(value)) return undefined;

  const cost = isRecord(value.cost) ? value.cost : {};
  const limit = isRecord(value.limit) ? value.limit : {};
  const rawName = typeof value.name === "string" && value.name.trim() ? value.name.trim() : id;

  return {
    id,
    name: rawName + NAME_SUFFIX,
    reasoning: Boolean(value.reasoning),
    input: normalizeInput(value.modalities),
    cost: {
      input: toFiniteNumber(cost.input),
      output: toFiniteNumber(cost.output),
      cacheRead: toFiniteNumber(cost.cache_read ?? cost.cacheRead),
      cacheWrite: toFiniteNumber(cost.cache_write ?? cost.cacheWrite),
    },
    contextWindow: Math.max(1, Math.floor(toFiniteNumber(limit.context, 262144))),
    maxTokens: Math.max(1, Math.floor(toFiniteNumber(limit.output, 32768))),
  };
}

async function fetchModelsFromModelsDev(): Promise<ProviderModel[] | undefined> {
  try {
    const res = await fetch(MODELS_DEV_URL);
    if (!res.ok) return undefined;
    const data = (await res.json()) as Record<string, unknown>;
    const provider = data[MODELS_DEV_PROVIDER_KEY];
    if (!isRecord(provider) || !isRecord(provider.models)) return undefined;

    const models = Object.entries(provider.models as Record<string, unknown>)
      .map(([id, val]) => normalizeProviderModel(id, val))
      .filter((m): m is ProviderModel => Boolean(m))
      .sort((a, b) => a.id.localeCompare(b.id));

    return models.length > 0 ? models : undefined;
  } catch {
    return undefined;
  }
}

async function loginWithApiKey(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
  const key = (
    await callbacks.onPrompt({ message: `Paste ${PROVIDER_NAME} API key:` })
  ).trim();

  if (!key) throw new Error("No API key provided.");

  return {
    access: key,
    refresh: key,
    expires: Date.now() + 3650 * 24 * 60 * 60 * 1000,
  };
}

async function refreshApiKey(credentials: OAuthCredentials): Promise<OAuthCredentials> {
  return credentials;
}

export default function kimiCodingPlanExtension(pi: ExtensionAPI) {
  const providerConfig = (models: ProviderModel[]) => ({
    baseUrl: BASE_URL,
    api: "anthropic-messages" as const,
    models,
    oauth: {
      name: PROVIDER_NAME,
      login: loginWithApiKey,
      refreshToken: refreshApiKey,
      getApiKey: (credentials: OAuthCredentials) => credentials.access,
    },
  });

  pi.registerProvider(PROVIDER_ID, providerConfig(DEFAULT_MODELS));

  fetchModelsFromModelsDev().then((models) => {
    if (models) pi.registerProvider(PROVIDER_ID, providerConfig(models));
  });
}
