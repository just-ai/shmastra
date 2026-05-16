import {spawnSync} from "child_process";
import {readFileSync} from "fs";

const REQUIRED_MODULES = ["mammoth", "openpyxl", "pptx", "pdfminer"];

function findMarkitdownPython() {
    const which = spawnSync("which", ["markitdown"], {encoding: "utf8"});
    if (which.status !== 0) return null;
    const binPath = which.stdout.trim();
    if (!binPath) return null;
    try {
        const firstLine = readFileSync(binPath, "utf8").split("\n", 1)[0];
        if (!firstLine.startsWith("#!")) return null;
        return firstLine.slice(2).trim().split(/\s+/)[0];
    } catch {
        return null;
    }
}

function hasAllExtras() {
    const python = findMarkitdownPython();
    if (!python) return false;
    const probe = spawnSync(python, ["-c", `import ${REQUIRED_MODULES.join(", ")}`], {stdio: "ignore"});
    return probe.status === 0;
}

const check = spawnSync("markitdown", ["--help"], {stdio: "ignore"});
if (check.status === 0) {
    if (hasAllExtras()) {
        console.log("[install-markitdown] markitdown with [all] extras is already installed, skipping.");
        process.exit(0);
    }
    console.log("[install-markitdown] markitdown is installed but missing [all] extras, reinstalling.");
}

const attempts = [
    ["uv", ["tool", "install", "--force", "markitdown[all]"]],
    ["pipx", ["install", "--force", "markitdown[all]"]],
    ["pip3", ["install", "--user", "--upgrade", "markitdown[all]"]],
    ["pip3", ["install", "--upgrade", "markitdown[all]"]],
    ["pip3", ["install", "--break-system-packages", "--user", "--upgrade", "markitdown[all]"]],
    ["pip3", ["install", "--break-system-packages", "--upgrade", "markitdown[all]"]],
];

const triedCommands = new Set();
for (const [cmd, args] of attempts) {
    const probe = spawnSync(cmd, ["--version"], {stdio: "ignore"});
    if (probe.error || probe.status !== 0) {
        if (!triedCommands.has(cmd)) {
            console.log(`[install-markitdown] ${cmd} not available, skipping.`);
            triedCommands.add(cmd);
        }
        continue;
    }
    console.log(`[install-markitdown] Attempting: ${cmd} ${args.join(" ")}`);
    const result = spawnSync(cmd, args, {stdio: "inherit"});
    if (result.status === 0 && hasAllExtras()) {
        console.log(`[install-markitdown] Successfully installed markitdown[all] via ${cmd}.`);
        process.exit(0);
    }
    if (result.status === 0) {
        console.log(`[install-markitdown] ${cmd} reported success but [all] extras still missing, trying next.`);
        continue;
    }
    console.log(`[install-markitdown] ${cmd} install failed (exit ${result.status}), trying next.`);
}

console.error(
    "[install-markitdown] Failed to install markitdown[all]. " +
    "Tried uv, pipx and pip3 (including --user and --break-system-packages). " +
    "Install it manually (e.g. `uv tool install --force 'markitdown[all]'` " +
    "or `pipx install --force 'markitdown[all]'`) and retry."
);
process.exit(1);
