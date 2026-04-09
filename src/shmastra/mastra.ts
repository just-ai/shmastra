import {Mastra, Config} from "@mastra/core/mastra";
import {Agent} from "@mastra/core/agent";
import {startShmastraWizard} from "./wizard";
import {isDevMode, isDryRun} from "./env";
import {withShmastraMiddlewares, withShmastraRoutes} from "./handlers";
import {deduplicateItemIds} from "./utils";

const port = parseInt(process.env.PORT || "4111");

export const createMastra = async (config: Config) => {
  if (isDevMode) {
    await startShmastraWizard();
  }
  config = {
    ...config,
    server: {
      studioBase: config.server?.studioBase || process.env.MASTRA_STUDIO_BASE_PATH || undefined,
      apiPrefix: config.server?.apiPrefix || process.env.MASTRA_API_PREFIX || undefined,
      port: isDryRun ? undefined : (config.server?.port || port),
      cors: config.server?.cors || (process.env.CORS_ORIGIN ? {
        origin: process.env.CORS_ORIGIN.split(' ').map(s => s.trim()).filter(Boolean),
        allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        allowHeaders: ["*"],
        credentials: true,
      } : undefined),
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

function patchAgentStream(agent: Agent) {
  const originalStream = agent.stream.bind(agent);
  agent.stream = function (messages: any, options?: any) {
    const theirs = options?.prepareStep;
    return originalStream(messages, {
      ...options,
      prepareStep: async (args) => {
        const fromTheirs = theirs ? await theirs(args) : undefined;
        const deduplicated = deduplicateItemIds(args.messages);
        return { ...fromTheirs, messages: deduplicated };
      }
    });
  }
}
