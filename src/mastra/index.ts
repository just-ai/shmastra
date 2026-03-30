import {createMastra} from "../shmastra/mastra";
import {agents} from "./agents";
import {workflows} from "./workflows";
import {scorers} from "./scorers";
import {storage} from "./storage";
import {logger} from "./logger";
import {observability} from "./observability";
import {apiRoutes} from "./routes";
import {middleware} from "./middleware";

/**
 * IMPORTANT: do not touch this file!
 * Add your agents, workflows and scorers in corresponding folders.
 */
export const mastra = await createMastra({
  workflows,
  agents,
  scorers,
  storage,
  logger,
  observability,
  server: {
    apiRoutes,
    middleware,
  }
});
