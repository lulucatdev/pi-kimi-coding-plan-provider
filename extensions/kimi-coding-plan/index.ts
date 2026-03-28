import type { OAuthCredentials, OAuthLoginCallbacks } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const PROVIDER_ID = "kimi-coding-plan";
const PROVIDER_NAME = "Kimi Coding Plan";
const BASE_URL = "https://api.kimi.com/coding";

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

const MODELS: ProviderModel[] = [
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
];

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
  pi.registerProvider(PROVIDER_ID, {
    baseUrl: BASE_URL,
    api: "anthropic-messages",
    models: MODELS,
    oauth: {
      name: PROVIDER_NAME,
      login: loginWithApiKey,
      refreshToken: refreshApiKey,
      getApiKey: (credentials) => credentials.access,
    },
  });
}
