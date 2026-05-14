import {Mastra, Config} from "@mastra/core/mastra";
import {startShmastraWizard} from "./wizard";
import {getPublicUrl, isDevMode, isDryRun, sandboxId} from "./env";
import {withShmastraMiddlewares, withShmastraRoutes} from "./handlers";
import {patchAgentStream} from "./utils";
import {ShmastraAuth} from "./auth";
import {installBaseUrlGateway} from "./gateway";

installBaseUrlGateway();

const port = parseInt(process.env.PORT || "4111");

const parseUrl = (s: string | undefined): URL | undefined => {
  if (!s) return undefined;
  try { return new URL(s); } catch { return undefined; }
};

export const createMastra = async (config: Config) => {
  if (isDevMode) {
    await startShmastraWizard();
  }
  const serverPort = isDryRun ? undefined : (config.server?.port || port);
  if (!process.env.PUBLIC_URL && sandboxId) {
    process.env.PUBLIC_URL = `https://${serverPort ?? port}-${sandboxId}.e2b.app`;
  }

  const studioUrl = parseUrl(getPublicUrl());
  const studioProtocol = studioUrl ? (studioUrl.protocol === "https:" ? "https" : "http") : undefined;
  const studioPort = studioUrl ? (studioUrl.port ? parseInt(studioUrl.port) : (studioProtocol === "https" ? 443 : 80)) : undefined;

  config = {
    ...config,
    server: {
      ...config.server,
      studioBase: config.server?.studioBase || process.env.MASTRA_STUDIO_BASE_PATH || undefined,
      studioHost: config.server?.studioHost ?? studioUrl?.hostname,
      studioProtocol: config.server?.studioProtocol ?? studioProtocol,
      studioPort: config.server?.studioPort ?? studioPort,
      apiPrefix: config.server?.apiPrefix || process.env.MASTRA_API_PREFIX || undefined,
      port: serverPort,
      cors: config.server?.cors || (process.env.CORS_ORIGIN ? {
        origin: process.env.CORS_ORIGIN.split(' ').map(s => s.trim()).filter(Boolean),
        allowHeaders: ["Content-Type", "Authorization", "x-mastra-auth-token", "x-mastra-client-type"],
        credentials: true,
      } : undefined),
      auth: config.server?.auth || (process.env.MASTRA_AUTH_TOKEN ? new ShmastraAuth({
        ownerToken: process.env.MASTRA_AUTH_TOKEN,
        public: [/\/public\//, /\/files\//, /\/apps\//, /\/shmastra\/apps\//],
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
