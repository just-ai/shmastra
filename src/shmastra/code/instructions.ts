import {Config} from "@mastra/core/mastra";
import {SystemMessage} from "@mastra/core/llm";
import {Harness} from "@mastra/core/harness";
import {Agent} from "@mastra/core/agent";
import {RequestContext} from "@mastra/core/request-context";
import * as fs from "node:fs";
import * as path from "node:path";
import {getPackageManager, getPublicUrl} from "../env";
import {projectRootPath} from "../../mastra/shmastra";

const PREAMBLE = "You are a Shmastra Code, an interactive web coding agent that helps to build and edit Mastra agents and workflows.";

export function extractSection(text: string, heading: string) {
    const startIdx = text.indexOf(heading);
    if (startIdx === -1) return "";
    const endIdx = text.indexOf("\n\n", startIdx + heading.length);
    if (endIdx === -1) return "";
    return text.slice(startIdx, endIdx);
}

export function systemMessageToString(instructions: SystemMessage): string {
    if (typeof instructions === "string") return instructions;
    if (Array.isArray(instructions)) {
        return instructions.map(i => typeof i === "string" ? i : i.content).join("\n");
    }
    return instructions.content;
}

function readFile(filePath: string) {
    const file = path.join(process.cwd(), filePath);
    if (fs.existsSync(file)) {
        return fs.readFileSync(file, "utf-8");
    }
    return "";
}

export function patchInstructions(harness: Harness, config: Config) {
    const agent = harness.getCurrentMode().agent as Agent;
    const getInstructions = agent.getInstructions?.bind(agent);
    agent.getInstructions = async ({ requestContext }: { requestContext?: RequestContext } = {}) => {
        const publicUrl = await getPublicUrl();
        const instructions = await getInstructions?.({ requestContext });
        let message = systemMessageToString(instructions);
        let environmentSection = extractSection(message, "# Environment");
        environmentSection = (environmentSection || "") +
            `\nUpstream project root: ${projectRootPath}. Files are copying and Mastra server is running in this folder after applying changes.` +
            `\nMastra Studio Base: ${config.server?.studioBase || "/"}` +
            `\nMastra REST API prefix: ${config.server?.apiPrefix || "/api"}` +
            (publicUrl ? `\nPublic server URL: ${publicUrl}` : "") +
            `\nPackage Manager: ${getPackageManager()}` +
            (process.env.MASTRA_AUTH_TOKEN ? "\nMastra API authorization enabled with MASTRA_AUTH_TOKEN env variable (use it in 'x-mastra-auth-token' header in curl requests)" : "") +
            "\n\n";

        return [
            PREAMBLE,
            environmentSection,
            readFile(".mastracode/AGENTS.md"),
            readFile( ".mastracode/skills/mastra/SKILL.md"),
        ]
    }
}