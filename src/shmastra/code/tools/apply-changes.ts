import {createTool} from "@mastra/core/tools";
import {ShmastraProvider} from "../types";
import {spawn} from "node:child_process";
import {getTmpDir} from "../../files";
import {getPackageManager} from "../../env";

const TIMEOUT_MS = 15_000;
const READY_PATTERN = /ready in \d+/;

function dryRun() {
    return new Promise((resolve, reject) => {
        const packageManager = getPackageManager();
        const child = spawn(`${packageManager} install && ${packageManager} run dev`, [], {
            cwd: getTmpDir(),
            stdio: ["ignore", "pipe", "pipe"],
            shell: true,
            env: {
                ...process.env,
                DRY_RUN: "true",
                PORT: "NaN",
            }
        });

        let output = "";

        const onData = (chunk: Buffer)=> {
            const text = chunk.toString();
            output += text;

            if (READY_PATTERN.test(output)) {
                child.kill("SIGTERM");
                resolve(output);
            }
        }

        child.stdout.on("data", onData);
        child.stderr.on("data", onData);

        child.on("close", (code) => {
            if (code !== 0) {
                console.error(output);
                reject(output);
            }
        });

        setTimeout(() => {
            child.kill("SIGTERM");
            reject(output);
        }, TIMEOUT_MS);
    });
}

export const createApplyChangesTool = (provider: ShmastraProvider) =>
    createTool({
        id: "apply_changes",
        description: "Apply your changes",
        execute: async () => {
            try {
                await dryRun();
                provider.harness.applyChanges();
            } catch (e) {
                return { success: false, error: e }
            }
            return { success: true };
        }
    });