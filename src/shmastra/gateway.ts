import {ModelsDevGateway, PROVIDER_REGISTRY, defaultGateways, type GatewayLanguageModel, type ProviderConfig} from "@mastra/core/llm";
import {createGoogleGenerativeAI} from "@ai-sdk/google";

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
};
