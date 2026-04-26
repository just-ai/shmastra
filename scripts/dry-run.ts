import {spawn, execSync} from "node:child_process";
import path from "node:path";

const TIMEOUT_MS = 30_000;
const KILL_GRACE_MS = 3_000;
const READY_PATTERN = /watching for file changes/;

export class DryRunTimeoutError extends Error {
    constructor(public readonly output: string, public readonly timeoutMs: number) {
        super(`Dry run timed out after ${timeoutMs}ms`);
        this.name = "DryRunTimeoutError";
    }
}

function killGroup(pid: number, signal: NodeJS.Signals) {
    try {
        process.kill(-pid, signal);
    } catch {
        try { process.kill(pid, signal); } catch {}
    }
}

function getPackageManager(): string {
    try {
        execSync("pnpm --version", {stdio: "ignore"});
        return "pnpm";
    } catch {
        return "npm";
    }
}

let silent = false;

const liveChildren = new Set<number>();

async function terminate(pid: number): Promise<void> {
    if (!liveChildren.has(pid)) return;
    killGroup(pid, "SIGTERM");
    await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
            killGroup(pid, "SIGKILL");
            resolve();
        }, KILL_GRACE_MS);
        const check = setInterval(() => {
            if (!liveChildren.has(pid)) {
                clearTimeout(timer);
                clearInterval(check);
                resolve();
            }
        }, 100);
    });
}

export function runCommand(command: string, args: string[], timeoutMs: number, cwd: string, successPattern?: RegExp, port?: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
            detached: true,
            env: {
                ...process.env,
                DRY_RUN: "true",
                PORT: port !== undefined ? String(port) : "NaN",
            },
        });

        if (child.pid) liveChildren.add(child.pid);

        let output = "";
        let settled = false;
        let timeoutHandle: NodeJS.Timeout | undefined;

        const finish = (fn: (value: string) => void, value: string) => {
            if (settled) return;
            settled = true;
            if (timeoutHandle) clearTimeout(timeoutHandle);
            const pid = child.pid;
            if (pid && liveChildren.has(pid)) {
                terminate(pid).then(() => fn(value));
            } else {
                fn(value);
            }
        };

        const onData = (chunk: Buffer) => {
            const text = chunk.toString();
            if (!silent && !settled) process.stdout.write(text);
            output += text;
            if (successPattern?.test(output)) {
                finish(resolve, output);
            }
        };

        child.stdout.on("data", onData);
        child.stderr.on("data", onData);

        child.on("error", () => {
            if (child.pid) liveChildren.delete(child.pid);
            finish(reject, output);
        });

        child.on("close", (code) => {
            if (child.pid) liveChildren.delete(child.pid);
            if (settled) return;
            if (code === 0) {
                finish(resolve, output);
            } else {
                finish(reject, output);
            }
        });

        timeoutHandle = setTimeout(() => {
            if (settled) return;
            settled = true;
            const pid = child.pid;
            const err = new DryRunTimeoutError(output, timeoutMs);
            if (pid && liveChildren.has(pid)) {
                terminate(pid).then(() => reject(err));
            } else {
                reject(err);
            }
        }, timeoutMs);
    });
}

export async function dryRun(cwd: string, opts?: { silent?: boolean; port?: number }) {
    silent = opts?.silent ?? false;
    const pm = getPackageManager();
    await runCommand(pm, ["install", "--ignore-scripts"], TIMEOUT_MS, cwd);
    await runCommand(pm, ["run", "dev"], TIMEOUT_MS, cwd, READY_PATTERN, opts?.port);
}

async function shutdownAll() {
    const pids = Array.from(liveChildren);
    await Promise.all(pids.map(terminate));
}

// CLI entry point
if (process.argv[1]?.includes("dry-run")) {
    const cwdArg = process.argv.find(a => a.startsWith("--cwd="))?.slice(6);
    const cwd = cwdArg ? path.resolve(cwdArg) : process.cwd();
    const isSilent = process.argv.includes("--silent");
    const portArg = process.argv.find(a => a.startsWith("--port="))?.slice(7);
    const port = portArg !== undefined ? Number(portArg) : undefined;

    console.log(`Dry run in ${cwd}`);

    let interrupted = false;
    const onSignal = async (sig: NodeJS.Signals) => {
        if (interrupted) return;
        interrupted = true;
        await shutdownAll();
        process.exit(sig === "SIGINT" ? 130 : 143);
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    process.on("SIGHUP", onSignal);

    dryRun(cwd, { silent: isSilent, port }).then(
        async () => {
            console.log("Dry run succeeded");
            await shutdownAll();
            process.exit(0);
        },
        async (e) => {
            console.log("Dry run failed");
            if (typeof e === "string") console.log(e.slice(-2000));
            await shutdownAll();
            process.exit(1);
        },
    );
}
