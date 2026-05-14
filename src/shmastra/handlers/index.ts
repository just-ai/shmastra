import type { Config } from "@mastra/core";
import type { ApiRoute } from "@mastra/core/server";

import {createShmastraCode, ShmastraCode} from "../code";
import {versionHandler} from "./version";
import {answerHandler} from "./answer";
import {staticHandler} from "./static";
import {threadHandler} from "./thread";
import {envVarsHandler} from "./vars";
import {uploadHandler, getFileHandler, uploadOpenapi, getFileOpenapi} from "./files";
import {injectScript} from "./script";
import {handleStream} from "./stream";
import {chatHandler} from "./chat";
import {toolkitAuthHandler, toolkitAuthLinkHandler} from "./connections";
import {appIndexHandler, appStaticHandler} from "./apps";
import {sessionAlsMiddleware} from "../auth";
import {Middleware} from "../../mastra/middleware";

export function withShmastraMiddlewares(config: Config): Middleware[] {
  let middlewares = config.server?.middleware || [];
  if (middlewares && !Array.isArray(middlewares)) {
    middlewares = [middlewares];
  }

  return [
    ...middlewares,
    sessionAlsMiddleware,
    injectScript,
    handleStream,
  ]
}

export async function withShmastraRoutes(config: Config): Promise<ApiRoute[]> {
  const routes = config.server?.apiRoutes || [];
  const code: ShmastraCode = await createShmastraCode(config);

  const apiPrefix = config.server?.apiPrefix || "/api";
  const apiPath = (path: string) => `${apiPrefix}${path}`;

  return [
    ...routes,
    // App pages served at /apps/<name>. Cloud's /apps/[appName] and
    // /apps/shared/[shareId] routes fetch HTML from these paths.
    {
      path: "/apps/:appName",
      method: "GET",
      handler: appIndexHandler(config),
    },
    {
      path: "/apps/:appName/:path{.+}",
      method: "GET",
      handler: appStaticHandler,
    },
    {
      path: "/shmastra/public/:path{.+}",
      method: "GET",
      handler: staticHandler,
    },
    {
      path: "/shmastra/api/version",
      method: "GET",
      handler: versionHandler,
    },
    {
      path: "/shmastra/api/thread",
      method: "GET",
      handler: threadHandler(code),
    },
    {
      path: "/shmastra/api/thread/:threadId",
      method: "GET",
      handler: threadHandler(code),
    },
    {
      path: "/shmastra/api/chat",
      method: "POST",
      handler: chatHandler(code),
    },
    {
      path: "/shmastra/api/answer",
      method: "POST",
      handler: answerHandler(code),
    },
    {
      path: "/shmastra/api/vars",
      method: "POST",
      handler: envVarsHandler(code),
    },
    {
      path: "/shmastra/api/connection/:toolkit",
      method: "GET",
      handler: toolkitAuthLinkHandler,
    },
    {
      path: "/shmastra/api/connection/:toolkit",
      method: "POST",
      handler: toolkitAuthHandler(code),
    },
    {
      path: "/shmastra/api/files",
      method: "POST",
      handler: uploadHandler,
    },
    {
      path: "/shmastra/api/files/:fileName{.+}",
      method: "GET",
      handler: getFileHandler,
    },
    {
      path: apiPath("/files"),
      method: "POST",
      handler: uploadHandler,
      openapi: uploadOpenapi,
    },
    {
      path: apiPath("/files/:fileName{.+}"),
      method: "GET",
      handler: getFileHandler,
      openapi: getFileOpenapi,
    },
  ];
}
