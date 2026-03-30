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
    config.server = {
      ...config.server,
      port: isDryRun ? undefined : (config.server?.port || port),
      apiRoutes: await withShmastraRoutes(config),
      middleware: withShmastraMiddlewares(config),
    };
  }
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
