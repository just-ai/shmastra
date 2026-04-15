import {Mastra, Config} from "@mastra/core/mastra";
import {Agent} from "@mastra/core/agent";
import {PrefillErrorHandler} from "@mastra/core/processors";
import {startShmastraWizard} from "./wizard";
import {isDevMode, isDryRun} from "./env";
import {withShmastraMiddlewares, withShmastraRoutes} from "./handlers";
import {deduplicateItemIds} from "./utils";
import {SimpleAuth} from "@mastra/core/server";

const port = parseInt(process.env.PORT || "4111");

export const createMastra = async (config: Config) => {
  if (isDevMode) {
    await startShmastraWizard();
  }
  config = {
    ...config,
    server: {
      ...config.server,
      studioBase: config.server?.studioBase || process.env.MASTRA_STUDIO_BASE_PATH || undefined,
      apiPrefix: config.server?.apiPrefix || process.env.MASTRA_API_PREFIX || undefined,
      port: isDryRun ? undefined : (config.server?.port || port),
      cors: config.server?.cors || (process.env.CORS_ORIGIN ? {
        origin: process.env.CORS_ORIGIN.split(' ').map(s => s.trim()).filter(Boolean),
        allowHeaders: ["Content-Type", "Authorization", "x-mastra-auth-token", "x-mastra-client-type", "x-mastra-path"],
        credentials: true,
      } : undefined),
      auth: config.server?.auth || (process.env.MASTRA_AUTH_TOKEN ? new SimpleAuth({
        headers: ["x-mastra-auth-token", "Authorization"],
        tokens: {
          [process.env.MASTRA_AUTH_TOKEN]: { role: "owner" }
        },
        public: [/\/public\//, /\/files\//],
      }) : undefined),
    }
  };
  config.server = {
    ...config.server,
    apiRoutes: await withShmastraRoutes(config),
    middleware: withShmastraMiddlewares(config),
  };
  const mastra = new Mastra(config);
  patchMastra(mastra);
  return mastra;
}

const patchMastra = (mastra: Mastra) => {
  Object.values(mastra.listAgents()).forEach(patchAgentStream);
}

const prefillErrorHandler = new PrefillErrorHandler();

function patchAgentStream(agent: Agent) {
  const originalStream = agent.stream.bind(agent);
  agent.stream = function (messages: any, options?: any) {
    const theirs = options?.prepareStep;
    return originalStream(messages, {
      ...options,
      errorProcessors: [prefillErrorHandler, ...options?.errorProcessors ?? []],
      prepareStep: async (args) => {
        const fromTheirs = theirs ? await theirs(args) : undefined;
        const deduplicated = deduplicateItemIds(args.messages);
        return { ...fromTheirs, messages: deduplicated };
      }
    });
  }
}
