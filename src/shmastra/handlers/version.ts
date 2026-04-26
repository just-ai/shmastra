import {Handler} from "hono";
import fs from "node:fs";
import path from "node:path";
import {projectRootPath} from "../../mastra/shmastra";

const versionFilePath = path.resolve(projectRootPath, '.version');
const version = fs.existsSync(versionFilePath)
    ? fs.readFileSync(versionFilePath, 'utf8').trim()
    : "";

export const versionHandler: Handler = async c => {
    return c.json({version});
}
