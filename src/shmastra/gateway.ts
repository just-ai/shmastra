import {ModelsDevGateway, PROVIDER_REGISTRY, defaultGateways, type GatewayLanguageModel, type ProviderConfig} from "@mastra/core/llm";
import {createGoogleGenerativeAI} from "@ai-sdk/google";
import {getCurrentGuestSession} from "./auth";

const modelsDevProviders = Object.fromEntries(
  Object.entries(PROVIDER_REGISTRY).filter(([, c]) => (c as ProviderConfig).gateway === "models.dev")
) as Record<string, ProviderConfig>;

type ProviderFactory = (opts: {apiKey: string; baseURL: string; headers?: Record<string, string>}) => GatewayLanguageModel;

const PROVIDER_FACTORIES: Record<string, (modelId: string) => ProviderFactory> = {
  google: (modelId) => (opts) => createGoogleGenerativeAI(opts).chat(modelId),
  gemini: (modelId) => (opts) => createGoogleGenerativeAI(opts).chat(modelId),
};

const baseUrlEnv = (providerId: string) =>
  process.env[`${providerId.toUpperCase().replace(/-/g, "_")}_BASE_URL`];

export class BaseUrlGateway extends ModelsDevGateway {
  constructor() {
    super(modelsDevProviders);
  }

  async resolveLanguageModel(args: {
    modelId: string;
    providerId: string;
    apiKey: string;
    headers?: Record<string, string>;
  }): Promise<GatewayLanguageModel> {
    const baseURL = baseUrlEnv(args.providerId);
    const factory = PROVIDER_FACTORIES[args.providerId];
    if (baseURL && factory) {
      return factory(args.modelId)({
        apiKey: args.apiKey,
        baseURL,
        headers: args.headers,
      });
    }
    return super.resolveLanguageModel(args);
  }
}

/**
 * Replaces the default `models.dev` gateway in-place so our BaseUrlGateway
 * is used everywhere, including by inline agents (e.g. observational memory)
 * that aren't registered with a Mastra instance and thus fall back to
 * `defaultGateways` during model resolution.
 */
export const installBaseUrlGateway = () => {
  const idx = defaultGateways.findIndex(g => g.id === "models.dev");
  if (idx >= 0 && !(defaultGateways[idx] instanceof BaseUrlGateway)) {
    defaultGateways[idx] = new BaseUrlGateway();
  }
  installSessionVkFetch();
};

let sessionVkFetchInstalled = false;

/**
 * Patches globalThis.fetch so that when a request runs inside an active guest
 * session (see src/shmastra/auth.ts), any header value carrying the sandbox's
 * owner virtual key is rewritten to the per-session VK before egress. The
 * cloud gateway resolves both vk_* and sk_* to the owner for billing, but the
 * sk_* carries session metadata so usage can later be attributed to the
 * specific share/viewer. Owner requests go through unchanged.
 */
function installSessionVkFetch() {
  if (sessionVkFetchInstalled) return;
  sessionVkFetchInstalled = true;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function patched(this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    const session = getCurrentGuestSession();
    const ownerVk = process.env.MASTRA_AUTH_TOKEN;
    if (!session || !ownerVk || !session.sessionVk) {
      return originalFetch.call(this as never, input as Parameters<typeof originalFetch>[0], init);
    }

    const sourceHeaders = init?.headers
      ? new Headers(init.headers as HeadersInit)
      : input instanceof Request
        ? new Headers(input.headers)
        : undefined;
    if (!sourceHeaders) {
      return originalFetch.call(this as never, input as Parameters<typeof originalFetch>[0], init);
    }

    let swapped = false;
    for (const [name, value] of Array.from(sourceHeaders.entries())) {
      if (value.includes(ownerVk)) {
        sourceHeaders.set(name, value.split(ownerVk).join(session.sessionVk));
        swapped = true;
      }
    }
    if (!swapped) {
      return originalFetch.call(this as never, input as Parameters<typeof originalFetch>[0], init);
    }

    const nextInit: RequestInit = {...init, headers: sourceHeaders};
    return originalFetch.call(this as never, input as Parameters<typeof originalFetch>[0], nextInit);
  };
}
