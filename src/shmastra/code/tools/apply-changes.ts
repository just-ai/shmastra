import {createTool} from "@mastra/core/tools";
import {ShmastraProvider} from "../types";
import {spawn} from "node:child_process";
import {getTmpDir} from "../../files";
import {getPackageManager} from "../../env";

const TIMEOUT_MS = 15_000;
const READY_PATTERN = /ready in \d+/;

function runCommand(command: string, timeoutMs: number, successPattern?: RegExp): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, [], {
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
        let settled = false;

        const settle = (fn: (value: string) => void, value: string) => {
            if (settled) return;
            settled = true;
            child.kill("SIGTERM");
            fn(value);
        };

        const onData = (chunk: Buffer) => {
            const text = chunk.toString();
            output += text;

            if (successPattern?.test(output)) {
                settle(resolve, output);
            }
        };

        child.stdout.on("data", onData);
        child.stderr.on("data", onData);

        child.on("close", (code) => {
            if (settled) return;
            if (code === 0) {
                settle(resolve, output);
            } else {
                console.error(output);
                settle(reject, output);
            }
        });

        setTimeout(() => settle(reject, output), timeoutMs);
    });
}

async function dryRun() {
    const packageManager = getPackageManager();
    await runCommand(`${packageManager} install --ignore-scripts`, TIMEOUT_MS);
    await runCommand(`${packageManager} run dev`, TIMEOUT_MS, READY_PATTERN);
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