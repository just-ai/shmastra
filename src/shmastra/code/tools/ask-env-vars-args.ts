import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import * as fs from "fs";
import * as path from "path";
import {getWorkdir} from "../../files";
import {updateEnvContent} from "../../env";

export type AskEnvVarsArgs = {
   description: string;
   vars: Array<{
      name: string;
      type: "text" | "password";
      required: boolean;
   }>
}

const inputSchema = z.object({
   description: z.string().describe("Why you need these vars and where to get it"),
   vars: z.array(z.object({
      name: z.string().describe("Environment variable name"),
      type: z.enum(["text", "password"]).describe("Input type: text for plain values, password for sensitive values"),
      required: z.boolean().describe("Whether this variable is required"),
   })).describe("List of environment variables"),
});

const resumeSchema = z.object({
   cancelled: z.boolean().optional(),
   vars: z.record(z.string(), z.any()).optional(),
});

function persistEnvVars(vars: Record<string, any>) {
   const envPath = path.resolve(getWorkdir(), ".env");
   const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
   fs.writeFileSync(envPath, updateEnvContent(existing, vars), "utf-8");
   for (const [k, v] of Object.entries(vars)) {
      if (v != null) process.env[k] = String(v);
   }
}

export const askEnvVarsTool = createTool({
   id: "ask_env_vars_safely",
   description: "Ask user to set env vars in safe UI",
   inputSchema,
   suspendSchema: z.object({}),
   resumeSchema,
   execute: async (_input, context) => {
      const resumeData = context?.agent?.resumeData as z.infer<typeof resumeSchema> | undefined;
      const suspend = context?.agent?.suspend;

      if (!resumeData) {
         await suspend?.({});
         return "Suspended";
      }

      if (resumeData.cancelled) {
         return "User cancelled the env vars input";
      }

      const vars = resumeData.vars ?? {};
      persistEnvVars(vars);
      return `User has set vars: ${Object.keys(vars).join(", ")}`;
   },
});
