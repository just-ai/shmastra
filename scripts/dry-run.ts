import {spawn, execSync} from "node:child_process";
import path from "node:path";

const TIMEOUT_MS = 30_000;
const READY_PATTERN = /watching for file changes/;

function getPackageManager(): string {
    try {
        execSync("pnpm --version", {stdio: "ignore"});
        return "pnpm";
    } catch {
        return "npm";
    }
}

let silent = false;

export function runCommand(command: string, args: string[], timeoutMs: number, cwd: string, successPattern?: RegExp): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
            detached: true,
            env: {
                ...process.env,
                DRY_RUN: "true",
                PORT: "NaN",
            },
        });

        let output = "";
        let settled = false;

        const settle = (fn: (value: string) => void, value: string) => {
            if (settled) return;
            settled = true;
            try {
                if (child.pid) process.kill(-child.pid, "SIGTERM");
            } catch {}
            fn(value);
        };

        const onData = (chunk: Buffer) => {
            const text = chunk.toString();
            if (!silent) process.stderr.write(text);
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
                settle(reject, output);
            }
        });

        setTimeout(() => settle(reject, output), timeoutMs);
    });
}

export async function dryRun(cwd: string, opts?: { silent?: boolean }) {
    silent = opts?.silent ?? false;
    const pm = getPackageManager();
    await runCommand(pm, ["install", "--ignore-scripts"], TIMEOUT_MS, cwd);
    await runCommand(pm, ["run", "dev"], TIMEOUT_MS, cwd, READY_PATTERN);
}

// CLI entry point
if (process.argv[1]?.endsWith("dry-run.ts")) {
    const cwdArg = process.argv.find(a => a.startsWith("--cwd="))?.slice(6);
    const cwd = cwdArg ? path.resolve(cwdArg) : process.cwd();
    const isSilent = process.argv.includes("--silent");

    console.log(`Dry run in ${cwd}`);

    dryRun(cwd, { silent: isSilent }).then(
        () => { console.log("Dry run succeeded"); process.exit(0); },
        (e) => { console.error("Dry run failed"); if (typeof e === "string") console.error(e.slice(-2000)); process.exit(1); },
    );
}
