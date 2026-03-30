import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {ShmastraProvider} from "../types";

export type AskEnvVarsArgs = {
   description: string;
   vars: Array<{
      name: string;
      type: "text" | "password";
      required: boolean;
   }>
}

export const createAskEnvVarsTool = (provider: ShmastraProvider) =>
    createTool({
      id: "ask_env_vars_safely",
      description: "Ask user to set env vars in safe UI",
      inputSchema: z.object({
         description: z.string().describe("Why you need these vars and where to get it"),
         vars: z.array(z.object({
            name: z.string().describe("Environment variable name"),
            type: z.enum(["text", "password"]).describe("Input type: text for plain values, password for sensitive values"),
            required: z.boolean().describe("Whether this variable is required"),
         })).describe("List of environment variables"),
      }),
      execute: async (inputData) => {
         return `User has set vars: ${await provider.harness.askEnvVars(inputData)}`;
      }
   });